import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  gcUserId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string }
    req.gcUserId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
