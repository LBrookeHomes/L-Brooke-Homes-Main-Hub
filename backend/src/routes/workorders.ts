import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import notify from '../services/notify'

const router = Router()
router.use(requireAuth)

router.get('/project/:projectId', async (req, res: Response) => {
  const workOrders = await prisma.workOrder.findMany({
    where: { projectId: req.params.projectId },
    include: {
      contractor: { select: { id: true, name: true, trade: true, phone: true } },
      milestone: { select: { id: true, name: true } },
      photos: true,
      documents: { include: { document: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(workOrders)
})

router.post('/', async (req, res: Response) => {
  const {
    projectId, milestoneId, contractorId, trade, title,
    instructions, priority, scheduledDate, dueDate, fromDecisionId,
  } = req.body
  if (!projectId || !trade || !title) {
    res.status(400).json({ error: 'projectId, trade, title required' })
    return
  }
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const workOrder = await prisma.workOrder.create({
    data: {
      projectId,
      milestoneId: milestoneId || null,
      contractorId: contractorId || null,
      trade,
      title,
      instructions: instructions || '',
      priority: priority || 'normal',
      scheduledDate: scheduledDate || null,
      dueDate: dueDate || null,
      fromDecisionId: fromDecisionId || null,
      magicLinkToken: uuidv4(),
      magicLinkExpiresAt: expiresAt,
    },
    include: { photos: true, contractor: true, documents: { include: { document: true } } },
  })
  res.status(201).json(workOrder)
})

router.get('/:id', async (req, res: Response) => {
  const wo = await prisma.workOrder.findUnique({
    where: { id: req.params.id },
    include: {
      photos: true,
      contractor: true,
      milestone: true,
      project: { select: { id: true, name: true, address: true } },
      documents: { include: { document: true } },
    },
  })
  if (!wo) { res.status(404).json({ error: 'Not found' }); return }
  res.json(wo)
})

router.patch('/:id', async (req, res: Response) => {
  const { title, instructions, status, priority, scheduledDate, dueDate, completedDate, contractorId, milestoneId } = req.body
  const wo = await prisma.workOrder.update({
    where: { id: req.params.id },
    data: { title, instructions, status, priority, scheduledDate, dueDate, completedDate, contractorId, milestoneId },
    include: { photos: true, contractor: true, documents: { include: { document: true } } },
  })
  res.json(wo)
})

// Send work order via SMS to contractor
router.post('/:id/send', async (req, res: Response) => {
  const wo = await prisma.workOrder.findUnique({
    where: { id: req.params.id },
    include: {
      contractor: true,
      project: { select: { name: true, address: true } },
      photos: true,
    },
  })
  if (!wo) { res.status(404).json({ error: 'Not found' }); return }
  if (!wo.contractor) { res.status(400).json({ error: 'Assign a contractor before sending' }); return }

  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const link = `${appUrl}/wo/${wo.magicLinkToken}`

  await notify.toContractor(wo.contractor, {
    event: 'work_order_sent',
    subject: `Work order: ${wo.title}`,
    body: `Job at ${wo.project.address}: ${wo.title}. Details & photos: ${link}`,
    metadata: { workOrderId: wo.id },
  })

  const updated = await prisma.workOrder.update({
    where: { id: req.params.id },
    data: { status: 'sent', smsSentAt: new Date() },
    include: { photos: true, contractor: true },
  })
  res.json(updated)
})

// Attach a photo (after S3 upload, register the key)
router.post('/:id/photos', async (req, res: Response) => {
  const { s3Key, caption } = req.body
  if (!s3Key) { res.status(400).json({ error: 's3Key required' }); return }
  const photo = await prisma.workOrderPhoto.create({
    data: { workOrderId: req.params.id, s3Key, caption: caption || null },
  })
  res.status(201).json(photo)
})

router.delete('/:id/photos/:photoId', async (req, res: Response) => {
  await prisma.workOrderPhoto.delete({ where: { id: req.params.photoId } })
  res.json({ ok: true })
})

router.delete('/:id', async (req, res: Response) => {
  await prisma.workOrder.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
