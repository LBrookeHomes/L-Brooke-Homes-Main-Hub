import { Router, Response, Request } from 'express'
import prisma from '../lib/prisma'
import { requireClientSession, ClientSessionRequest } from '../middleware/magicLink'
import { getPresignedUploadUrl, getPresignedDownloadUrl } from '../services/storage'
import notify from '../services/notify'

const router = Router()

async function findWOByToken(token: string) {
  return prisma.workOrder.findFirst({
    where: {
      magicLinkToken: token,
      magicLinkExpiresAt: { gt: new Date() },
    },
    include: {
      photos: true,
      contractor: { select: { name: true, trade: true } },
      milestone: { select: { name: true } },
      project: { select: { name: true, address: true } },
      documents: { include: { document: true } },
    },
  })
}

// Contractor work order — magic link, no auth
router.get('/work-orders/:token', async (req: Request, res: Response) => {
  const wo = await findWOByToken(req.params.token)
  if (!wo) {
    res.status(404).json({ error: 'Work order not found or link expired' })
    return
  }
  const photosWithUrls = await Promise.all(
    wo.photos.map(async (p) => ({
      ...p,
      url: await getPresignedDownloadUrl(p.s3Key),
    }))
  )
  res.json({ ...wo, photos: photosWithUrls })
})

// Contractor: get presigned upload URL (validates magic link token)
router.post('/work-orders/:token/upload-url', async (req: Request, res: Response) => {
  const wo = await findWOByToken(req.params.token)
  if (!wo) { res.status(404).json({ error: 'Work order not found or link expired' }); return }
  const { filename, contentType } = req.body
  if (!filename || !contentType) { res.status(400).json({ error: 'filename and contentType required' }); return }
  const { uploadUrl, s3Key } = await getPresignedUploadUrl(filename, contentType)
  res.json({ uploadUrl, s3Key })
})

// Contractor: register an uploaded photo
router.post('/work-orders/:token/photos', async (req: Request, res: Response) => {
  const wo = await findWOByToken(req.params.token)
  if (!wo) { res.status(404).json({ error: 'Work order not found or link expired' }); return }
  const { s3Key, caption } = req.body
  if (!s3Key) { res.status(400).json({ error: 's3Key required' }); return }
  const photo = await prisma.workOrderPhoto.create({
    data: { workOrderId: wo.id, s3Key, caption: caption || null },
  })
  res.status(201).json(photo)
})

// Contractor: mark started
router.post('/work-orders/:token/start', async (req: Request, res: Response) => {
  const wo = await findWOByToken(req.params.token)
  if (!wo) { res.status(404).json({ error: 'Work order not found or link expired' }); return }
  if (wo.status === 'completed') { res.status(400).json({ error: 'Already completed' }); return }
  const updated = await prisma.workOrder.update({
    where: { id: wo.id },
    data: { status: 'in_progress' },
  })
  res.json(updated)
})

// Contractor: mark complete — notifies GC
router.post('/work-orders/:token/complete', async (req: Request, res: Response) => {
  const wo = await findWOByToken(req.params.token)
  if (!wo) { res.status(404).json({ error: 'Work order not found or link expired' }); return }
  const updated = await prisma.workOrder.update({
    where: { id: wo.id },
    data: { status: 'completed', completedDate: new Date() },
  })
  // Notify GC
  const gcUsers = await prisma.gCUser.findMany()
  for (const gc of gcUsers) {
    await notify.toGC(gc, {
      event: 'work_order_completed',
      subject: `Work complete: ${wo.title}`,
      body: `${wo.contractor?.name ?? 'Contractor'} marked "${wo.title}" at ${wo.project.address} as complete.`,
      metadata: { workOrderId: wo.id },
    })
  }
  res.json(updated)
})

// Client portal magic-link login
router.get('/client-session/:token', async (req: Request, res: Response) => {
  const client = await prisma.client.findFirst({
    where: {
      portalToken: req.params.token,
      portalTokenExpires: { gt: new Date() },
    },
    include: {
      projects: { select: { id: true, name: true, status: true } },
    },
  })
  if (!client) {
    res.status(401).json({ error: 'Link expired or invalid' })
    return
  }
  res
    .cookie('clientSession', req.params.token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json({ clientId: client.id, name: client.name, projects: client.projects })
})

// Client portal: get their project + pending decisions
router.get('/portal/project/:projectId', requireClientSession, async (req: ClientSessionRequest, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    include: { milestones: { orderBy: { order: 'asc' } } },
  })
  if (!project || project.clientId !== req.clientId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const decisions = await prisma.decision.findMany({
    where: {
      projectId: req.params.projectId,
      status: { in: ['staged', 'decided'] },
    },
    include: {
      options: true,
      messages: { orderBy: { createdAt: 'asc' } },
      milestone: { select: { name: true } },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
  })
  // Attach presigned URLs to decision option photos
  const decisionsWithUrls = await Promise.all(
    decisions.map(async (d) => ({
      ...d,
      options: await Promise.all(
        d.options.map(async (o) => ({
          ...o,
          photoUrl: o.photoS3Key ? await getPresignedDownloadUrl(o.photoS3Key) : null,
        }))
      ),
    }))
  )
  res.json({ project, decisions: decisionsWithUrls })
})

// Presigned upload URL (for GC photo uploads, S3 direct)
router.post('/upload-url', async (req: Request, res: Response) => {
  const { filename, contentType } = req.body
  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType required' })
    return
  }
  const { uploadUrl, s3Key } = await getPresignedUploadUrl(filename, contentType)
  res.json({ uploadUrl, s3Key })
})

export default router
