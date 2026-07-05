import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import notify from '../services/notify'

const router = Router()
router.use(requireAuth)

router.get('/', async (_req, res: Response) => {
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } })
  res.json(clients)
})

router.post('/', async (req, res: Response) => {
  const { name, email, phone, notifPrefs } = req.body
  if (!name || !email) {
    res.status(400).json({ error: 'name and email required' })
    return
  }
  const client = await prisma.client.create({
    data: {
      name,
      email,
      phone: phone || null,
      notifPrefs: notifPrefs || { email: true, sms: false, push: false },
    },
  })
  res.status(201).json(client)
})

router.get('/:id', async (req, res: Response) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: { projects: { select: { id: true, name: true, status: true } } },
  })
  if (!client) { res.status(404).json({ error: 'Not found' }); return }
  res.json(client)
})

router.patch('/:id', async (req, res: Response) => {
  const { name, email, phone, notifPrefs } = req.body
  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: { name, email, phone, notifPrefs },
  })
  res.json(client)
})

// GC sends magic link login to client
router.post('/:id/send-portal-link', async (req, res: Response) => {
  const token = uuidv4()
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: { portalToken: token, portalTokenExpires: expires },
  })

  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const link = `${appUrl}/portal/login?token=${token}`

  await notify.toClient(client, {
    event: 'portal_invite',
    subject: 'Access your Weebrook project portal',
    body: `Click here to view your project decisions and updates: ${link}\n\nThis link expires in 30 days.`,
    metadata: { clientId: client.id },
  })

  res.json({ ok: true, expiresAt: expires })
})

// Client push subscription (registered from portal)
router.post('/:id/push-subscribe', async (req, res: Response) => {
  const { subscription } = req.body
  const client = await prisma.client.findUnique({ where: { id: req.params.id } })
  if (!client) { res.status(404).json({ error: 'Not found' }); return }
  const subs = (client.pushSubs as object[]) || []
  const exists = subs.some((s: any) => s.endpoint === subscription.endpoint)
  if (!exists) {
    await prisma.client.update({
      where: { id: req.params.id },
      data: { pushSubs: [...subs, subscription] },
    })
  }
  res.json({ ok: true })
})

export default router
