import prisma from '../lib/prisma'
import { sendEmail } from './email'
import { sendPush } from './push'

// Daily follow-up digest for Rob (single-user hub). Finds open follow-ups
// that are overdue, due today, or due in the next 2 days; emails one summary
// and drops an in-app notification. `remindedOn` prevents duplicate sends
// within the same day.

const DAY_MS = 24 * 60 * 60 * 1000

function utcDayStart(d: Date): Date {
  return new Date(d.toISOString().slice(0, 10) + 'T00:00:00.000Z')
}

interface DigestResult {
  sent: boolean
  count: number
  overdue: number
  dueToday: number
  dueSoon: number
  reason?: string
  email?: string
}

/** Resolve the single GC user (Rob) to notify. */
async function getRob() {
  const seedEmail = process.env.GC_SEED_EMAIL
  if (seedEmail) {
    const bySeed = await prisma.gCUser.findUnique({ where: { email: seedEmail } })
    if (bySeed) return bySeed
  }
  return prisma.gCUser.findFirst({ orderBy: { createdAt: 'asc' } })
}

export async function sendDailyDigest(opts: { force?: boolean } = {}): Promise<DigestResult> {
  const todayStart = utcDayStart(new Date())
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS)
  const horizonEnd = new Date(todayStart.getTime() + 3 * DAY_MS) // today + next 2 days

  const due = await prisma.followUp.findMany({
    where: { status: 'open', dueDate: { not: null, lt: horizonEnd } },
    orderBy: [{ dueDate: 'asc' }],
    include: { meeting: { select: { title: true } } },
  })

  if (due.length === 0) {
    return { sent: false, count: 0, overdue: 0, dueToday: 0, dueSoon: 0, reason: 'Nothing due.' }
  }

  // Skip if we already reminded on every one of these today (avoid dupes),
  // unless a manual/forced run.
  if (!opts.force) {
    const allRemindedToday = due.every(
      (f) => f.remindedOn && utcDayStart(f.remindedOn).getTime() === todayStart.getTime()
    )
    if (allRemindedToday) {
      return { sent: false, count: due.length, overdue: 0, dueToday: 0, dueSoon: 0, reason: 'Already sent today.' }
    }
  }

  const overdue = due.filter((f) => f.dueDate! < todayStart)
  const dueToday = due.filter((f) => f.dueDate! >= todayStart && f.dueDate! < tomorrowStart)
  const dueSoon = due.filter((f) => f.dueDate! >= tomorrowStart && f.dueDate! < horizonEnd)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const line = (f: (typeof due)[number]) =>
    `  • ${f.title}${f.dueDate ? ` (due ${fmt(f.dueDate)})` : ''} — from "${f.meeting.title}"`

  const sections: string[] = []
  if (overdue.length) sections.push(`OVERDUE (${overdue.length}):\n${overdue.map(line).join('\n')}`)
  if (dueToday.length) sections.push(`DUE TODAY (${dueToday.length}):\n${dueToday.map(line).join('\n')}`)
  if (dueSoon.length) sections.push(`DUE SOON (${dueSoon.length}):\n${dueSoon.map(line).join('\n')}`)

  const subject = `L. Brooke Homes — ${due.length} follow-up${due.length === 1 ? ' needs' : 's need'} attention`
  const body =
    `Here's what's on your plate from recent meetings:\n\n` +
    sections.join('\n\n') +
    `\n\nOpen the hub to mark them done or reschedule.`

  const rob = await getRob()
  if (!rob) {
    return { sent: false, count: due.length, overdue: overdue.length, dueToday: dueToday.length, dueSoon: dueSoon.length, reason: 'No GC user found.' }
  }

  // Email digest
  await sendEmail(rob.email, subject, body)

  // In-app notification (shows in the notification inbox, recipientType 'gc')
  await prisma.notification.create({
    data: {
      type: 'email',
      recipientId: rob.id,
      recipientType: 'gc',
      subject,
      body,
      status: 'sent',
      metadata: { kind: 'meeting-digest', count: due.length } as Record<string, unknown> as any,
    },
  })

  // Best-effort web push to Rob's devices
  const subs = ((rob.pushSubs as unknown as any[]) || [])
  for (const sub of subs) {
    try {
      await sendPush(sub, { title: 'Follow-ups need attention', body: `${due.length} due or overdue — open the hub.` })
    } catch {
      /* ignore dead subs here; main path already logged */
    }
  }

  // Mark reminded so a same-day re-run won't spam.
  await prisma.followUp.updateMany({
    where: { id: { in: due.map((f) => f.id) } },
    data: { remindedOn: new Date() },
  })

  return {
    sent: true,
    count: due.length,
    overdue: overdue.length,
    dueToday: dueToday.length,
    dueSoon: dueSoon.length,
    email: rob.email,
  }
}

// ── Daily scheduler ──────────────────────────────────────────────────
// Simplest reliable approach for Railway's always-on backend: an in-process
// timer. Fires once per day at/after DIGEST_HOUR_UTC (default 13:00 UTC ≈
// morning US-East). The `remindedOn` guard means that even if the process
// restarts and the timer fires again the same day, Rob won't be emailed twice.

let lastRunDay: string | null = null

export function startDigestScheduler(): void {
  const hour = Number(process.env.DIGEST_HOUR_UTC ?? 13)
  const tick = () => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    if (lastRunDay !== today && now.getUTCHours() >= hour) {
      lastRunDay = today
      sendDailyDigest().catch((err) => console.error('Daily digest failed:', err))
    }
  }
  setInterval(tick, 30 * 60 * 1000) // every 30 minutes
  console.log(`Meeting digest scheduler started (fires daily at/after ${hour}:00 UTC)`)
}
