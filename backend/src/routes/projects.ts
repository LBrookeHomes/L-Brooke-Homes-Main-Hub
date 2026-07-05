import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { seedBathKitchenTemplate } from '../prisma/seed/bathKitchenTemplate'
import { seedRoomTemplates } from '../prisma/seed/roomTemplates'

const router = Router()
router.use(requireAuth)

router.get('/', async (_req, res: Response) => {
  const projects = await prisma.project.findMany({
    include: {
      client: { select: { id: true, name: true, email: true } },
      milestones: { orderBy: { order: 'asc' } },
      _count: { select: { decisions: true, workOrders: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (projects.length === 0) { res.json(projects); return }

  const ids = projects.map((p) => p.id)

  // Budget aggregates: allowance sum + committed sum per project
  const [allowanceRows, committedRows] = await Promise.all([
    prisma.decision.groupBy({
      by: ['projectId'],
      _sum: { allowance: true },
      where: { projectId: { in: ids }, allowance: { not: null } },
    }),
    prisma.decision.groupBy({
      by: ['projectId'],
      _sum: { chosenPrice: true },
      where: { projectId: { in: ids }, status: { in: ['decided', 'locked'] }, chosenPrice: { not: null } },
    }),
  ])

  const allowanceMap = Object.fromEntries(allowanceRows.map((r) => [r.projectId, r._sum.allowance ?? 0]))
  const committedMap = Object.fromEntries(committedRows.map((r) => [r.projectId, r._sum.chosenPrice ?? 0]))

  const projectsWithBudget = projects.map((p) => ({
    ...p,
    budget: allowanceMap[p.id] != null
      ? { allowance: allowanceMap[p.id] ?? 0, committed: committedMap[p.id] ?? 0 }
      : null,
  }))

  res.json(projectsWithBudget)
})

const STANDARD_DOCS = [
  { name: 'Construction Drawings', kind: 'plans' as const, status: 'needed' as const },
  { name: 'Plot Plan', kind: 'plot' as const, status: 'needed' as const },
  { name: 'Grading Plan', kind: 'grading' as const, status: 'needed' as const },
  { name: 'Soils Report', kind: 'soils' as const, status: 'needed' as const },
  { name: 'Signed Contract', kind: 'contracts' as const, status: 'on_file' as const },
  { name: 'Building Permit', kind: 'permits' as const, status: 'needed' as const },
]

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, address, clientId, startDate, targetDate, templateType, rooms } = req.body
  if (!name || !address || !clientId) {
    res.status(400).json({ error: 'name, address, clientId required' })
    return
  }
  const project = await prisma.project.create({
    data: { name, address, clientId, startDate, targetDate, templateType },
  })
  if (templateType === 'bath-kitchen') {
    await seedBathKitchenTemplate(prisma, project.id)
  } else if (templateType === 'custom' && Array.isArray(rooms) && rooms.length > 0) {
    await seedRoomTemplates(prisma, project.id, rooms)
  }
  // Seed standard project documents
  await prisma.document.createMany({
    data: STANDARD_DOCS.map((d) => ({ ...d, projectId: project.id })),
  })
  const full = await prisma.project.findUnique({
    where: { id: project.id },
    include: { client: true, milestones: { orderBy: { order: 'asc' } } },
  })
  res.status(201).json(full)
})

router.get('/:id', async (req, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      milestones: { orderBy: { order: 'asc' } },
      contractors: { include: { contractor: true } },
      _count: { select: { decisions: true, workOrders: true } },
    },
  })
  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  res.json(project)
})

router.patch('/:id', async (req, res: Response) => {
  const { name, address, status, startDate, targetDate } = req.body
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { name, address, status, startDate, targetDate },
  })
  res.json(project)
})

// GC dashboard attention queue
router.get('/:id/attention', async (req, res: Response) => {
  const projectId = req.params.id
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [blockingDecisions, overdueDecisions, unstaged, upcomingMilestones, overdueMilestones] =
    await Promise.all([
      // Decisions still pending while a work order in same milestone is draft/sent
      prisma.decision.findMany({
        where: {
          projectId,
          status: 'pending',
          milestoneId: {
            in: (
              await prisma.workOrder.findMany({
                where: { projectId, status: { in: ['draft', 'sent'] }, milestoneId: { not: null } },
                select: { milestoneId: true },
              })
            )
              .map((w) => w.milestoneId)
              .filter(Boolean) as string[],
          },
        },
        include: { milestone: true },
      }),
      // Overdue decisions
      prisma.decision.findMany({
        where: { projectId, status: { in: ['pending', 'staged'] }, dueDate: { lt: now } },
        include: { milestone: true },
      }),
      // High/critical decisions not yet staged
      prisma.decision.findMany({
        where: { projectId, status: 'pending', priority: { in: ['critical', 'high'] } },
        include: { milestone: true },
      }),
      // Milestones starting in next 7 days
      prisma.milestone.findMany({
        where: { projectId, status: 'pending', startDate: { gte: now, lte: in7Days } },
      }),
      // Overdue milestones
      prisma.milestone.findMany({
        where: { projectId, status: { in: ['pending', 'in_progress'] }, endDate: { lt: now } },
      }),
    ])

  res.json({ blockingDecisions, overdueDecisions, unstaged, upcomingMilestones, overdueMilestones })
})

// Add contractor to project
router.post('/:id/contractors', async (req, res: Response) => {
  const { contractorId, role } = req.body
  const pc = await prisma.projectContractor.upsert({
    where: { projectId_contractorId: { projectId: req.params.id, contractorId } },
    update: { role },
    create: { projectId: req.params.id, contractorId, role },
  })
  res.json(pc)
})

router.delete('/:id/contractors/:contractorId', async (req, res: Response) => {
  await prisma.projectContractor.delete({
    where: { projectId_contractorId: { projectId: req.params.id, contractorId: req.params.contractorId } },
  })
  res.json({ ok: true })
})

export default router
