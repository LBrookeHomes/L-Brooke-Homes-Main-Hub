import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export interface ClientSessionRequest extends Request {
  clientId?: string
}

export async function requireClientSession(
  req: ClientSessionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.clientSession
  if (!token) {
    res.status(401).json({ error: 'No client session' })
    return
  }
  const client = await prisma.client.findFirst({
    where: {
      portalToken: token,
      portalTokenExpires: { gt: new Date() },
    },
  })
  if (!client) {
    res.status(401).json({ error: 'Session expired or invalid' })
    return
  }
  req.clientId = client.id
  next()
}
