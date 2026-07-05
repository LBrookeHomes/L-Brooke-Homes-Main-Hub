import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireClientSession, ClientSessionRequest } from '../middleware/magicLink'
import notify from '../services/notify'

const router = Router()

// GC routes (authenticated)
router.get('/project/:projectId', requireAuth, async (req, res: Response) => {
  const decisions = await prisma.decision.findMany({
    where: { projectId: req.params.projectId },
    include: {
      options: true,
      milestone: { select: { id: true, name: true } },
      workOrders: { select: { id: true } },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
  })
  res.json(decisions)
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { projectId, milestoneId, title, description, room, type, priority, dueDate, allowance, options } = req.body
  if (!projectId || !title) {
    res.status(400).json({ error: 'projectId and title required' })
    return
  }
  const decision = await prisma.decision.create({
    data: {
      projectId,
      milestoneId: milestoneId || null,
      title,
      description,
      room: room || null,
      type: type || 'structured',
      priority: priority || 'normal',
      dueDate: dueDate || null,
      allowance: allowance != null ? parseFloat(allowance) : null,
      options: options?.length
        ? { create: options.map((o: any) => ({
            label: o.label,
            description: o.description,
            photoS3Key: o.photoS3Key,
            price: o.price != null ? parseFloat(o.price) : null,
            vendorUrl: o.vendorUrl || null,
          })) }
        : undefined,
    },
    include: { options: true },
  })
  res.status(201).json(decision)
})

router.get('/:id', requireAuth, async (req, res: Response) => {
  const decision = await prisma.decision.findUnique({
    where: { id: req.params.id },
    include: { options: true, messages: { orderBy: { createdAt: 'asc' } }, milestone: true },
  })
  if (!decision) { res.status(404).json({ error: 'Not found' }); return }
  res.json(decision)
})

router.patch('/:id', requireAuth, async (req, res: Response) => {
  const { title, description, room, priority, dueDate, status, allowance } = req.body
  const decision = await prisma.decision.update({
    where: { id: req.params.id },
    data: {
      title, description, room: room !== undefined ? (room || null) : undefined,
      priority, dueDate, status,
      allowance: allowance != null ? parseFloat(allowance) : undefined,
    },
  })
  res.json(decision)
})

// Stage decision to client — sends notification
router.post('/:id/stage', requireAuth, async (req, res: Response) => {
  const decision = await prisma.decision.findUnique({
    where: { id: req.params.id },
    include: { project: { include: { client: true } } },
  })
  if (!decision) { res.status(404).json({ error: 'Not found' }); return }

  const updated = await prisma.decision.update({
    where: { id: req.params.id },
    data: { status: 'staged', stagedAt: new Date() },
    include: { options: true },
  })

  await notify.toClient(decision.project.client, {
    event: 'decision_staged',
    subject: `New decision needed: ${decision.title}`,
    body: `Your GC has a new decision for you to review: "${decision.title}". Open your project portal to respond.`,
    metadata: { decisionId: decision.id, projectId: decision.projectId },
  })

  res.json(updated)
})

// Unstage decision — pulls it back to pending silently (no notification)
router.post('/:id/unstage', requireAuth, async (req, res: Response) => {
  const decision = await prisma.decision.findUnique({ where: { id: req.params.id } })
  if (!decision) { res.status(404).json({ error: 'Not found' }); return }
  if (decision.status === 'locked') { res.status(400).json({ error: 'Cannot unstage a locked decision' }); return }

  const updated = await prisma.decision.update({
    where: { id: req.params.id },
    data: { status: 'pending', stagedAt: null, decidedAt: null, selectedOptionId: null },
    include: { options: true },
  })
  res.json(updated)
})

// Lock decision (GC confirms client's choice or overrides)
router.post('/:id/lock', requireAuth, async (req, res: Response) => {
  const { selectedOptionId, chosenPrice } = req.body

  // Auto-derive chosenPrice from the option if not explicitly provided
  let resolvedPrice: number | null = null
  if (chosenPrice != null) {
    resolvedPrice = parseFloat(chosenPrice)
  } else if (selectedOptionId) {
    const opt = await prisma.decisionOption.findUnique({ where: { id: selectedOptionId } })
    resolvedPrice = opt?.price ?? null
  }

  const decision = await prisma.decision.update({
    where: { id: req.params.id },
    data: {
      status: 'locked',
      decidedAt: new Date(),
      selectedOptionId: selectedOptionId || null,
      chosenPrice: resolvedPrice,
    },
    include: { options: true },
  })
  res.json(decision)
})

// GC adds message to free-form decision thread
router.post('/:id/messages', requireAuth, async (req, res: Response) => {
  const { body, attachmentS3Keys } = req.body
  const msg = await prisma.decisionMessage.create({
    data: { decisionId: req.params.id, senderType: 'gc', body, attachmentS3Keys: attachmentS3Keys || [] },
  })
  res.status(201).json(msg)
})

// Client responds to decision (structured option selection or proposal)
router.post('/:id/respond', requireClientSession, async (req: ClientSessionRequest, res: Response) => {
  const { selectedOptionId, proposedUrl, proposedNote, proposedPrice } = req.body
  const decision = await prisma.decision.findUnique({
    where: { id: req.params.id },
    include: { project: true },
  })
  if (!decision || decision.project.clientId !== req.clientId) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  // Auto-derive chosenPrice from option when client selects one
  let chosenPrice: number | null = null
  if (selectedOptionId) {
    const opt = await prisma.decisionOption.findUnique({ where: { id: selectedOptionId } })
    chosenPrice = opt?.price ?? null
  }
  if (proposedPrice != null) chosenPrice = parseFloat(proposedPrice)

  const updated = await prisma.decision.update({
    where: { id: req.params.id },
    data: {
      status: 'decided',
      decidedAt: new Date(),
      selectedOptionId: selectedOptionId || null,
      chosenPrice,
      proposedUrl: proposedUrl || null,
      proposedNote: proposedNote || null,
      proposedPrice: proposedPrice != null ? parseFloat(proposedPrice) : null,
    },
  })

  // Notify GC
  const gcUsers = await prisma.gCUser.findMany()
  for (const gc of gcUsers) {
    await notify.toGC(gc, {
      event: 'decision_responded',
      subject: `Client responded: ${decision.title}`,
      body: `The client has made a selection for "${decision.title}". Review and lock it in.`,
      metadata: { decisionId: decision.id, projectId: decision.projectId },
    })
  }

  res.json(updated)
})

// Client posts free-form message
router.post('/:id/client-messages', requireClientSession, async (req: ClientSessionRequest, res: Response) => {
  const { body, attachmentS3Keys } = req.body
  const decision = await prisma.decision.findUnique({
    where: { id: req.params.id },
    include: { project: true },
  })
  if (!decision || decision.project.clientId !== req.clientId) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const msg = await prisma.decisionMessage.create({
    data: { decisionId: req.params.id, senderType: 'client', body, attachmentS3Keys: attachmentS3Keys || [] },
  })

  const gcUsers = await prisma.gCUser.findMany()
  for (const gc of gcUsers) {
    await notify.toGC(gc, {
      event: 'decision_message',
      subject: `Client message on: ${decision.title}`,
      body,
      metadata: { decisionId: decision.id },
    })
  }

  res.status(201).json(msg)
})

router.delete('/:id', requireAuth, async (req, res: Response) => {
  await prisma.decision.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
