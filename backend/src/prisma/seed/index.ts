import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedBathKitchenTemplate } from './bathKitchenTemplate'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.GC_SEED_EMAIL || 'admin@weebrook.app'
  const password = process.env.GC_SEED_PASSWORD || 'changeme'

  const existing = await prisma.gCUser.findUnique({ where: { email } })
  if (!existing) {
    await prisma.gCUser.create({
      data: {
        email,
        name: 'GC Admin',
        passwordHash: await bcrypt.hash(password, 10),
      },
    })
    console.log(`Created GC admin: ${email}`)
  }

  const demoClient = await prisma.client.upsert({
    where: { email: 'demo-client@example.com' },
    update: {},
    create: {
      name: 'Demo Homeowner',
      email: 'demo-client@example.com',
      phone: '+15550001234',
      notifPrefs: { email: true, sms: false, push: false },
    },
  })

  const existingDemo = await prisma.project.findFirst({
    where: { name: 'Demo Bath + Kitchen Renovation' },
  })

  if (!existingDemo) {
    const project = await prisma.project.create({
      data: {
        name: 'Demo Bath + Kitchen Renovation',
        address: '123 Maple Street, Springfield',
        clientId: demoClient.id,
        status: 'planning',
        templateType: 'bath-kitchen',
        startDate: new Date('2026-07-01'),
        targetDate: new Date('2026-10-31'),
      },
    })
    await seedBathKitchenTemplate(prisma, project.id)

    // Standard project documents
    const discoveryMilestone = await prisma.milestone.findFirst({
      where: { projectId: project.id, name: 'Discovery & Scope' },
    })
    await prisma.document.createMany({
      data: [
        { projectId: project.id, milestoneId: discoveryMilestone?.id, name: 'Construction Drawings', kind: 'plans', status: 'needed' },
        { projectId: project.id, name: 'Plot Plan', kind: 'plot', status: 'needed' },
        { projectId: project.id, name: 'Grading Plan', kind: 'grading', status: 'needed' },
        { projectId: project.id, name: 'Soils Report', kind: 'soils', status: 'needed' },
        { projectId: project.id, name: 'Signed Contract', kind: 'contracts', status: 'on_file' },
        { projectId: project.id, name: 'Building Permit', kind: 'permits', status: 'needed' },
      ],
    })

    console.log(`Created demo project with bath-kitchen template: ${project.id}`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
