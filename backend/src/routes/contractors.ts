import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (_req, res: Response) => {
  const contractors = await prisma.contractor.findMany({
    where: { isRetired: false },
    orderBy: [{ trade: 'asc' }, { name: 'asc' }],
  })
  res.json(contractors)
})

router.post('/', async (req, res: Response) => {
  const { name, phone, email, trade, notes } = req.body
  if (!name || !phone || !trade) {
    res.status(400).json({ error: 'name, phone, trade required' })
    return
  }
  const contractor = await prisma.contractor.create({
    data: { name, phone, email, trade, notes },
  })
  res.status(201).json(contractor)
})

router.get('/:id', async (req, res: Response) => {
  const contractor = await prisma.contractor.findUnique({
    where: { id: req.params.id },
    include: {
      workOrders: {
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })
  if (!contractor) { res.status(404).json({ error: 'Not found' }); return }
  res.json(contractor)
})

router.patch('/:id', async (req, res: Response) => {
  const { name, phone, email, trade, notes, active } = req.body
  const contractor = await prisma.contractor.update({
    where: { id: req.params.id },
    data: { name, phone, email, trade, notes, active },
  })
  res.json(contractor)
})

router.post('/:id/retire', async (req, res: Response) => {
  const contractor = await prisma.contractor.update({
    where: { id: req.params.id },
    data: { isRetired: true },
  })
  res.json(contractor)
})

export default router
