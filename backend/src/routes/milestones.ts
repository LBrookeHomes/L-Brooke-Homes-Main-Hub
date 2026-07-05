import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/project/:projectId', async (req, res: Response) => {
  const milestones = await prisma.milestone.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { decisions: true, workOrders: true } },
    },
  })
  res.json(milestones)
})

router.post('/', async (req, res: Response) => {
  const { projectId, name, order, startDate, endDate } = req.body
  if (!projectId || !name || order == null) {
    res.status(400).json({ error: 'projectId, name, order required' })
    return
  }
  const milestone = await prisma.milestone.create({
    data: { projectId, name, order, startDate, endDate },
  })
  res.status(201).json(milestone)
})

router.patch('/:id', async (req, res: Response) => {
  const { name, status, startDate, endDate, order } = req.body
  const milestone = await prisma.milestone.update({
    where: { id: req.params.id },
    data: { name, status, startDate, endDate, order },
  })
  res.json(milestone)
})

router.delete('/:id', async (req, res: Response) => {
  await prisma.milestone.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
