import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/project/:projectId', async (req, res: Response) => {
  const docs = await prisma.document.findMany({
    where: { projectId: req.params.projectId },
    include: { milestone: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(docs)
})

router.post('/', async (req, res: Response) => {
  const { projectId, milestoneId, name, kind, status, link } = req.body
  if (!projectId || !name) {
    res.status(400).json({ error: 'projectId and name required' })
    return
  }
  const doc = await prisma.document.create({
    data: {
      projectId,
      milestoneId: milestoneId || null,
      name,
      kind: kind || 'other',
      status: status || 'needed',
      link: link || null,
    },
    include: { milestone: { select: { id: true, name: true } } },
  })
  res.status(201).json(doc)
})

router.patch('/:id', async (req, res: Response) => {
  const { name, kind, status, link, milestoneId } = req.body
  const doc = await prisma.document.update({
    where: { id: req.params.id },
    data: { name, kind, status, link, milestoneId: milestoneId ?? undefined },
    include: { milestone: { select: { id: true, name: true } } },
  })
  res.json(doc)
})

router.delete('/:id', async (req, res: Response) => {
  await prisma.document.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Attach document to a work order
router.post('/:id/attach/:workOrderId', async (req, res: Response) => {
  await prisma.workOrderDocument.upsert({
    where: { workOrderId_documentId: { workOrderId: req.params.workOrderId, documentId: req.params.id } },
    update: {},
    create: { workOrderId: req.params.workOrderId, documentId: req.params.id },
  })
  res.json({ ok: true })
})

// Detach document from a work order
router.delete('/:id/attach/:workOrderId', async (req, res: Response) => {
  await prisma.workOrderDocument.deleteMany({
    where: { workOrderId: req.params.workOrderId, documentId: req.params.id },
  })
  res.json({ ok: true })
})

export default router
