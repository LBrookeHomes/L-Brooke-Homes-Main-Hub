import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedBathKitchenTemplate } from './bathKitchenTemplate'

const prisma = new PrismaClient()

async function main() {
  // ── 1. GC user ───────────────────────────────────────────────────────────
  const email = process.env.GC_SEED_EMAIL || 'admin@weebrook.app'
  const password = process.env.GC_SEED_PASSWORD || 'changeme'

  await prisma.gCUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'GC Admin',
      passwordHash: await bcrypt.hash(password, 10),
    },
  })
  console.log(`✓ GC user: ${email}`)

  // ── 2. Demo client ───────────────────────────────────────────────────────
  const client = await prisma.client.upsert({
    where: { email: 'demo-client@example.com' },
    update: {},
    create: {
      name: 'Sarah & Mike Calloway',
      email: 'demo-client@example.com',
      phone: '+15550001234',
      notifPrefs: { email: true, sms: false, push: false },
    },
  })
  console.log(`✓ Client: ${client.name}`)

  // ── 3. Contractors ───────────────────────────────────────────────────────
  const contractorDefs = [
    { name: 'Rivera Plumbing Co.', phone: '+15550011001', trade: 'plumbing' as const },
    { name: 'Bright Wire Electric', phone: '+15550022002', trade: 'electrical' as const },
    { name: 'Ortega Tile & Stone', phone: '+15550033003', trade: 'tiling' as const },
  ]

  const contractors: Record<string, string> = {}
  for (const def of contractorDefs) {
    const existing = await prisma.contractor.findFirst({ where: { name: def.name } })
    const c = existing ?? await prisma.contractor.create({ data: def })
    contractors[def.trade] = c.id
  }
  console.log(`✓ ${contractorDefs.length} contractors`)

  // ── 4. Demo project ──────────────────────────────────────────────────────
  let project = await prisma.project.findFirst({
    where: { name: 'Demo Bath + Kitchen Renovation' },
    include: { milestones: true },
  })

  if (!project) {
    const created = await prisma.project.create({
      data: {
        name: 'Demo Bath + Kitchen Renovation',
        address: '123 Maple Street, Springfield',
        clientId: client.id,
        status: 'active',
        templateType: 'bath-kitchen',
        startDate: new Date('2026-07-01'),
        targetDate: new Date('2026-10-31'),
      },
    })
    await seedBathKitchenTemplate(prisma, created.id)
    await prisma.document.createMany({
      data: [
        { projectId: created.id, name: 'Construction Drawings', kind: 'plans', status: 'needed' },
        { projectId: created.id, name: 'Signed Contract', kind: 'contracts', status: 'on_file' },
        { projectId: created.id, name: 'Building Permit', kind: 'permits', status: 'needed' },
      ],
    })
    project = await prisma.project.findFirstOrThrow({
      where: { id: created.id },
      include: { milestones: true },
    })
    console.log(`✓ Created project: ${project.id}`)
  } else {
    console.log(`✓ Project already exists: ${project.id}`)
  }

  // Attach contractors to project
  for (const [trade, contractorId] of Object.entries(contractors)) {
    await prisma.projectContractor.upsert({
      where: { projectId_contractorId: { projectId: project.id, contractorId } },
      update: {},
      create: { projectId: project.id, contractorId, role: trade },
    })
  }

  // ── 5. Stage key decisions ───────────────────────────────────────────────
  // Stage all critical + high decisions in Discovery & Scope and Rough-in Plumbing
  // so the dashboard attention queue has something to show.
  const milestonesToStage = ['Discovery & Scope', 'Rough-in Plumbing']
  const stagedAt = new Date()

  for (const milestoneName of milestonesToStage) {
    const milestone = project.milestones.find(m => m.name === milestoneName)
    if (!milestone) continue
    await prisma.decision.updateMany({
      where: {
        projectId: project.id,
        milestoneId: milestone.id,
        status: 'pending',
        priority: { in: ['critical', 'high'] },
      },
      data: { status: 'staged', stagedAt },
    })
  }
  console.log(`✓ Staged critical/high decisions in Discovery & Rough-in Plumbing`)

  // ── 6. Decide one decision (appliance dimensions) ────────────────────────
  const applianceDecision = await prisma.decision.findFirst({
    where: { projectId: project.id, title: 'Appliance dimensions & brand', status: 'staged' },
    include: { options: true },
  })

  if (applianceDecision) {
    const chosenOption = applianceDecision.options.find(o => o.label.startsWith('Standard'))
    if (chosenOption) {
      await prisma.decision.update({
        where: { id: applianceDecision.id },
        data: {
          status: 'decided',
          selectedOptionId: chosenOption.id,
          chosenPrice: chosenOption.price,
          decidedAt: new Date(),
        },
      })
      console.log(`✓ Decided: Appliance dimensions → "${chosenOption.label}"`)
    }
  }

  // ── 7. Draft work order ──────────────────────────────────────────────────
  const demolitionMilestone = project.milestones.find(m => m.name === 'Demolition')
  const existingWO = demolitionMilestone
    ? await prisma.workOrder.findFirst({
        where: { projectId: project.id, milestoneId: demolitionMilestone.id },
      })
    : null

  if (!existingWO && demolitionMilestone && contractors['plumbing']) {
    await prisma.workOrder.create({
      data: {
        projectId: project.id,
        milestoneId: demolitionMilestone.id,
        contractorId: contractors['plumbing'],
        trade: 'plumbing',
        title: 'Demo & rough-in prep — kitchen + bath',
        instructions: `Remove existing kitchen sink, faucet, and dishwasher supply/drain lines.
Cap all lines at wall. Do not disturb main stack.
Bath: remove tub drain and overflow. Cap shower drain.
Leave subfloor exposed for flooring contractor.`,
        status: 'draft',
        scheduledDate: new Date('2026-07-07'),
        dueDate: new Date('2026-07-09'),
        magicLinkExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    console.log(`✓ Draft work order created for Demolition milestone`)
  }

  console.log('\n✓ Demo seed complete.')
  console.log(`  Login: ${email} / ${password}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
