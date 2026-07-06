import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { sendSms } from '../services/sms'

const router = Router()
router.use(requireAuth)

// Statuses match the old Airtable/Tasklet app exactly.
const STATUSES = [
  'Planning',
  'Material to order',
  'Waiting on stock',
  'Schedule',
  'On Going',
  'On Hold',
  'Completed',
] as const

const statusSchema = z.enum(STATUSES)

// Serialize a WorkItem (with join rows included) into the shape the old
// frontend expects: flat workerIds/workerNames/locationIds/locationNames.
type WorkItemWithJoins = {
  workers: { worker: { id: string; name: string } }[]
  locations: { location: { id: string; name: string } }[]
  [key: string]: unknown
}

function serializeWorkItem(item: WorkItemWithJoins) {
  const { workers, locations, ...rest } = item
  return {
    ...rest,
    workerIds: workers.map((w) => w.worker.id),
    workerNames: workers.map((w) => w.worker.name),
    locationIds: locations.map((l) => l.location.id),
    locationNames: locations.map((l) => l.location.name),
  }
}

const workItemInclude = {
  workers: { include: { worker: { select: { id: true, name: true } } } },
  locations: { include: { location: { select: { id: true, name: true } } } },
} as const

// ── Workers ──────────────────────────────────────────────────────────

router.get('/workers', async (_req, res: Response) => {
  const workers = await prisma.worker.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  res.json(workers)
})

router.post('/workers', async (req, res: Response) => {
  const { name, email, phone } = req.body
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name required' })
    return
  }
  const worker = await prisma.worker.create({
    data: { name, email: email || null, phone: phone || null },
  })
  res.status(201).json(worker)
})

router.patch('/workers/:id', async (req, res: Response) => {
  const { name, email, phone, active } = req.body
  const worker = await prisma.worker.update({
    where: { id: req.params.id },
    data: { name, email, phone, active },
  })
  res.json(worker)
})

// Soft-delete
router.delete('/workers/:id', async (req, res: Response) => {
  await prisma.worker.update({
    where: { id: req.params.id },
    data: { active: false },
  })
  res.json({ ok: true })
})

// ── Locations ────────────────────────────────────────────────────────

router.get('/locations', async (_req, res: Response) => {
  const locations = await prisma.jobLocation.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  res.json(locations)
})

router.post('/locations', async (req, res: Response) => {
  const { name } = req.body
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name required' })
    return
  }
  const location = await prisma.jobLocation.create({ data: { name } })
  res.status(201).json(location)
})

router.patch('/locations/:id', async (req, res: Response) => {
  const { name, active } = req.body
  const location = await prisma.jobLocation.update({
    where: { id: req.params.id },
    data: { name, active },
  })
  res.json(location)
})

// Soft-delete
router.delete('/locations/:id', async (req, res: Response) => {
  await prisma.jobLocation.update({
    where: { id: req.params.id },
    data: { active: false },
  })
  res.json({ ok: true })
})

// ── Work items ───────────────────────────────────────────────────────

router.get('/work-items', async (_req, res: Response) => {
  const items = await prisma.workItem.findMany({
    include: workItemInclude,
    orderBy: [{ jobDate: 'asc' }, { createdAt: 'asc' }],
  })
  res.json(items.map(serializeWorkItem))
})

const workItemBodySchema = z.object({
  jobDetails: z.string().min(1),
  status: statusSchema.optional(),
  timeline: z.string().nullish(),
  jobDate: z.string().nullish(),
  day: z.string().nullish(),
  notes: z.string().nullish(),
  materialRequired: z.boolean().optional(),
  startTime: z.string().nullish(),
  endTime: z.string().nullish(),
  plannedHours: z.number().nullish(),
  paymentStatus: z.string().nullish(),
  purchasingItems: z.string().nullish(),
  firstStop: z.boolean().optional(),
  endOfDay: z.boolean().optional(),
  workerIds: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
})

router.post('/work-items', async (req, res: Response) => {
  const parsed = workItemBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid work item' })
    return
  }
  const { workerIds = [], locationIds = [], jobDate, ...data } = parsed.data
  const item = await prisma.workItem.create({
    data: {
      ...data,
      jobDate: jobDate ? new Date(jobDate) : null,
      workers: { create: workerIds.map((workerId) => ({ workerId })) },
      locations: { create: locationIds.map((locationId) => ({ locationId })) },
    },
    include: workItemInclude,
  })
  res.status(201).json(serializeWorkItem(item))
})

// Full edit
router.patch('/work-items/:id', async (req, res: Response) => {
  const parsed = workItemBodySchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid work item' })
    return
  }
  const { workerIds, locationIds, jobDate, ...data } = parsed.data
  const item = await prisma.workItem.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(jobDate !== undefined ? { jobDate: jobDate ? new Date(jobDate) : null } : {}),
      // Replace join rows only when the field was supplied.
      ...(workerIds
        ? { workers: { deleteMany: {}, create: workerIds.map((workerId) => ({ workerId })) } }
        : {}),
      ...(locationIds
        ? { locations: { deleteMany: {}, create: locationIds.map((locationId) => ({ locationId })) } }
        : {}),
    },
    include: workItemInclude,
  })
  res.json(serializeWorkItem(item))
})

// Inline status change
router.patch('/work-items/:id/status', async (req, res: Response) => {
  const parsed = statusSchema.safeParse(req.body?.status)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  const item = await prisma.workItem.update({
    where: { id: req.params.id },
    data: { status: parsed.data },
    include: workItemInclude,
  })
  res.json(serializeWorkItem(item))
})

router.delete('/work-items/:id', async (req, res: Response) => {
  await prisma.workItem.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── Crew push (SMS) ──────────────────────────────────────────────────
// Replaces the old Tasklet `send_message` tool in CrewPushPreview.

router.post('/crew-push', async (req, res: Response) => {
  const { workerId, message } = req.body
  if (!workerId || !message) {
    res.status(400).json({ error: 'workerId and message required' })
    return
  }
  const worker = await prisma.worker.findUnique({ where: { id: workerId } })
  if (!worker) {
    res.status(404).json({ error: 'Worker not found' })
    return
  }
  if (!worker.phone) {
    res.status(400).json({ error: 'Worker has no phone number on file' })
    return
  }
  await sendSms(worker.phone, message)
  res.json({ ok: true })
})

export default router
