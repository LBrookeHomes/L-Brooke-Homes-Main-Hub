import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { getVapidPublicKey } from '../services/push'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' })
    return
  }
  const user = await prisma.gCUser.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as `${number}${'s'|'m'|'h'|'d'|'w'|'y'}`,
  })
  res
    .cookie('token', token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({ id: user.id, name: user.name, email: user.email })
})

router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token').json({ ok: true })
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.gCUser.findUnique({
    where: { id: req.gcUserId },
    select: { id: true, name: true, email: true },
  })
  if (!user) { res.status(404).json({ error: 'Not found' }); return }
  res.json(user)
})

router.post('/push-subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  const { subscription } = req.body
  const user = await prisma.gCUser.findUnique({ where: { id: req.gcUserId } })
  if (!user) { res.status(404).json({ error: 'Not found' }); return }
  const subs = (user.pushSubs as object[]) || []
  const exists = subs.some((s: any) => s.endpoint === subscription.endpoint)
  if (!exists) {
    await prisma.gCUser.update({
      where: { id: req.gcUserId },
      data: { pushSubs: [...subs, subscription] },
    })
  }
  res.json({ ok: true })
})

router.get('/vapid-public-key', (_req, res: Response) => {
  res.json({ key: getVapidPublicKey() })
})

export default router
