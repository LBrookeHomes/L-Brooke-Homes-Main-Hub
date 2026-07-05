import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (_req, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { recipientType: 'gc' },
    orderBy: { sentAt: 'desc' },
    take: 50,
  })
  res.json(notifications)
})

export default router
