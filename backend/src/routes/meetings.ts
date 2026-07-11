import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { analyzeMeeting, fetchLinkText, MeetingAIError, STAGES } from '../services/meetingAI'
import { sendDailyDigest, resumeExpiredPauses } from '../services/meetingReminders'

const router = Router()
router.use(requireAuth)

/** True for Prisma's "record to update/delete does not exist" error. */
function isNotFound(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2025'
}

// ── List / read ──────────────────────────────────────────────────────

router.get('/', async (_req, res: Response) => {
  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      meetingDate: true,
      createdAt: true,
      _count: { select: { followUps: true } },
    },
  })
  res.json(
    meetings.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      meetingDate: m.meetingDate,
      createdAt: m.createdAt,
      followUpCount: m._count.followUps,
    }))
  )
})

// Open follow-ups across all meetings, soonest due first (nulls last).
// Defined before "/:id" so the path is matched literally.
router.get('/followups/upcoming', async (_req, res: Response) => {
  await resumeExpiredPauses()
  const followUps = await prisma.followUp.findMany({
    where: { status: 'open' },
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    include: { meeting: { select: { id: true, title: true } } },
  })
  res.json(followUps)
})

router.get('/:id', async (req, res: Response) => {
  await resumeExpiredPauses()
  const meeting = await prisma.meeting.findUnique({
    where: { id: req.params.id },
    include: { followUps: { orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }] } },
  })
  if (!meeting) { res.status(404).json({ error: 'Not found' }); return }
  res.json(meeting)
})

// ── Analyze (create) ─────────────────────────────────────────────────

router.post('/analyze', async (req, res: Response) => {
  const link = typeof req.body?.link === 'string' ? req.body.link.trim() : ''
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''

  if (!link && !text) {
    res.status(400).json({ error: 'Paste a meeting link or transcript text to analyze.' })
    return
  }

  try {
    // Text is always reliable; prefer it. Otherwise best-effort fetch the link.
    let transcript: string
    let sourceType: 'pasted-text' | 'granola-link'
    let sourceUrl: string | null

    if (text) {
      transcript = text
      sourceType = 'pasted-text'
      sourceUrl = link || null
    } else {
      transcript = await fetchLinkText(link)
      sourceType = 'granola-link'
      sourceUrl = link
    }

    const analysis = await analyzeMeeting(transcript)

    const meeting = await prisma.meeting.create({
      data: {
        title: analysis.title,
        sourceType,
        sourceUrl,
        transcript,
        attendees: analysis.attendees,
        confirmed: analysis.confirmed,
        status: 'analyzed',
        followUps: {
          create: analysis.followUps.map((f) => ({
            title: f.title,
            details: f.details || null,
            dueDate: f.dueDate ? new Date(f.dueDate) : null,
            tag: f.tag,
            owner: f.owner,
            stage: f.stage,
          })),
        },
      },
      include: { followUps: { orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }] } },
    })
    res.status(201).json(meeting)
  } catch (err) {
    if (err instanceof MeetingAIError) {
      res.status(400).json({ error: err.message })
      return
    }
    console.error('Meeting analyze failed:', err)
    res.status(500).json({ error: 'Something went wrong analyzing the meeting.' })
  }
})

router.delete('/:id', async (req, res: Response) => {
  try {
    await prisma.meeting.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    if (isNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('Meeting delete failed:', err)
    res.status(500).json({ error: 'Failed to delete meeting.' })
  }
})

// ── Follow-up updates (mark done / archive / pause / reschedule / edit) ─

const FOLLOWUP_STATUSES = ['open', 'done', 'archived', 'paused'] as const

router.patch('/:id/followups/:fid', async (req, res: Response) => {
  const { status, dueDate, pausedUntil, title, details, owner, stage } = req.body ?? {}
  const data: Record<string, unknown> = {}
  if (status !== undefined) {
    if (!FOLLOWUP_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }
    if (status === 'paused' && !pausedUntil) {
      res.status(400).json({ error: 'pausedUntil is required to pause a follow-up' })
      return
    }
    data.status = status
    // Leaving "paused" (to any other status) always clears pausedUntil.
    if (status !== 'paused') data.pausedUntil = null
  }
  if (pausedUntil !== undefined) data.pausedUntil = pausedUntil ? new Date(pausedUntil) : null
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
  if (title !== undefined) data.title = title
  if (details !== undefined) data.details = details || null
  if (owner !== undefined) {
    if (owner !== 'rob' && owner !== 'client') {
      res.status(400).json({ error: 'Invalid owner' })
      return
    }
    data.owner = owner
  }
  if (stage !== undefined) {
    if (!STAGES.includes(stage)) {
      res.status(400).json({ error: 'Invalid stage' })
      return
    }
    data.stage = stage
  }

  try {
    const followUp = await prisma.followUp.update({
      where: { id: req.params.fid },
      data,
    })
    res.json(followUp)
  } catch (err) {
    if (isNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('Follow-up update failed:', err)
    res.status(500).json({ error: 'Failed to update follow-up.' })
  }
})

// Permanently remove a follow-up.
router.delete('/:id/followups/:fid', async (req, res: Response) => {
  try {
    await prisma.followUp.delete({ where: { id: req.params.fid } })
    res.json({ ok: true })
  } catch (err) {
    if (isNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('Follow-up delete failed:', err)
    res.status(500).json({ error: 'Failed to delete follow-up.' })
  }
})

// ── Manual digest trigger (for testing reminders on demand) ──────────

router.post('/digest/run', async (_req, res: Response) => {
  try {
    // Manual trigger always sends so it can be tested on demand.
    const result = await sendDailyDigest({ force: true })
    res.json(result)
  } catch (err) {
    console.error('Digest run failed:', err)
    res.status(500).json({ error: 'Failed to send digest.' })
  }
})

export default router
