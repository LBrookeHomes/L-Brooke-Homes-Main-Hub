import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Allowances and option prices for the bath+kitchen template.
// Key = decision title (exact match). allowance = GC's budget for this item.
// options = array matching the option order in the template, each with price + vendorUrl.

const BUDGET_DATA: Record<string, {
  allowance?: number
  options?: { price?: number; vendorUrl?: string }[]
}> = {
  'Appliance dimensions & brand': {
    allowance: 9500,
    options: [
      { price: 4800 },
      { price: 9500, vendorUrl: 'https://www.thermador.com/us/products/ranges' },
      { price: 6500 },
    ],
  },
  'Island dimensions': {
    allowance: 0,
    options: [
      { price: 0 },
      { price: 1800 },
      { price: 2800 },
      { price: 4200 },
    ],
  },
  'Sink location(s)': {
    allowance: 1200,
    options: [
      { price: 0 },
      { price: 1800, vendorUrl: 'https://www.kohler.com/en/products/kitchen-sinks' },
      { price: 2400 },
    ],
  },
  'Shower configuration': {
    allowance: 6500,
    options: [
      { price: 4800 },
      { price: 7500 },
      { price: 3800 },
    ],
  },
  'Under-cabinet lighting': {
    allowance: 900,
    options: [
      { price: 900, vendorUrl: 'https://www.acuitybrands.com/products/detail/1516551/Juno/UPLED' },
      { price: 350 },
      { price: 0 },
    ],
  },
  'Pendant lighting over island': {
    allowance: 800,
    options: [
      { price: 400 },
      { price: 650 },
      { price: 800, vendorUrl: 'https://www.restorationhardware.com/catalog/category/collections.jsp?categoryId=cat4580001' },
      { price: 350 },
    ],
  },
  'Bathroom exhaust fan': {
    allowance: 300,
    options: [
      { price: 120, vendorUrl: 'https://www.broan-nutone.com/en-us/products/ventilation-fans' },
      { price: 200 },
      { price: 320 },
    ],
  },
  'Kitchen flooring material': {
    allowance: 5500,
    options: [
      { price: 5500, vendorUrl: 'https://www.flooranddecor.com/porcelain-tile' },
      { price: 3800, vendorUrl: 'https://www.flooranddecor.com/luxury-vinyl-plank' },
      { price: 7200 },
      { price: 6800 },
    ],
  },
  'Kitchen backsplash tile': {
    allowance: 1800,
    options: [
      { price: 800, vendorUrl: 'https://www.flooranddecor.com/subway-tile' },
      { price: 1800 },
      { price: 3200, vendorUrl: 'https://www.cletile.com/collections/zellige' },
      { price: 2200 },
    ],
  },
  'Backsplash grout color': {
    allowance: 0,
    options: [
      { price: 0 },
      { price: 0 },
      { price: 0 },
      { price: 0 },
    ],
  },
  'Bathroom floor tile': {
    allowance: 1600,
    options: [
      { price: 1200, vendorUrl: 'https://www.flooranddecor.com/porcelain-tile/bathroom' },
      { price: 2200, vendorUrl: 'https://www.flooranddecor.com/marble-look-porcelain' },
      { price: 1800 },
      { price: 1400 },
    ],
  },
  'Shower wall tile': {
    allowance: 2800,
    options: [
      { price: 2000, vendorUrl: 'https://www.flooranddecor.com/large-format-tile' },
      { price: 1800 },
      { price: 4200, vendorUrl: 'https://www.artistic-tile.com/natural-stone' },
      { price: 2800 },
    ],
  },
  'Cabinet style': {
    allowance: 18000,
    options: [
      { price: 16000 },
      { price: 18000 },
      { price: 20000 },
      { price: 12000 },
    ],
  },
  'Countertop material': {
    allowance: 6500,
    options: [
      { price: 6200, vendorUrl: 'https://www.caesarstoneus.com' },
      { price: 5800, vendorUrl: 'https://www.msisurfaces.com/granite' },
      { price: 9500 },
      { price: 3200 },
    ],
  },
  'Cabinet hardware': {
    allowance: 600,
    options: [
      { price: 420, vendorUrl: 'https://www.amerock.com' },
      { price: 580, vendorUrl: 'https://www.rejuvenation.com/hardware' },
      { price: 720, vendorUrl: 'https://www.rejuvenation.com/hardware' },
      { price: 350 },
    ],
  },
  'Bathroom vanity style': {
    allowance: 2200,
    options: [
      { price: 1400, vendorUrl: 'https://www.homedepot.com/b/Bath-Bathroom-Vanities/N-5yc1vZbzej' },
      { price: 2200 },
      { price: 2600, vendorUrl: 'https://www.wayfair.com/keyword.php?keyword=floating+vanity' },
      { price: 1800 },
    ],
  },
  'Kitchen faucet style & finish': {
    allowance: 500,
    options: [
      { price: 280, vendorUrl: 'https://www.deltafaucet.com/kitchen/faucets' },
      { price: 480, vendorUrl: 'https://www.kohler.com/en/products/kitchen/shop-kitchen/kitchen-faucets' },
      { price: 620, vendorUrl: 'https://www.signaturehardware.com/kitchen-faucets.html' },
      { price: 400, vendorUrl: 'https://www.deltafaucet.com/kitchen/faucets/touch-kitchen-faucets' },
    ],
  },
  'Shower head type': {
    allowance: 700,
    options: [
      { price: 180, vendorUrl: 'https://www.kohler.com/en/products/showering' },
      { price: 550, vendorUrl: 'https://www.grohe.com/us/bath/showers/rain-showers.html' },
      { price: 850, vendorUrl: 'https://www.hansgrohe-usa.com/articlelist-shower-systems' },
      { price: 2200 },
    ],
  },
  'Bathroom faucet finish': {
    allowance: 350,
    options: [
      { price: 220, vendorUrl: 'https://www.deltafaucet.com/bathroom/faucets' },
      { price: 280, vendorUrl: 'https://www.kohler.com/en/products/bathroom/shop-bathroom/bathroom-sink-faucets' },
      { price: 190 },
      { price: 340, vendorUrl: 'https://www.brizo.com/bathroom/faucets' },
    ],
  },
  'Trim & ceiling color': {
    allowance: 400,
    options: [
      { price: 0, vendorUrl: 'https://www.benjaminmoore.com/en-us/color-overview/find-your-color/color/OC-65/chantilly-lace' },
      { price: 0, vendorUrl: 'https://www.sherwin-williams.com/en-us/color/color-family/white-paint-colors/SW7006' },
      { price: 0 },
      { price: 0 },
    ],
  },
  'Outlet and switch plate finish': {
    allowance: 200,
    options: [
      { price: 120 },
      { price: 220, vendorUrl: 'https://www.lutron.com/en-US/Products/Pages/StandAloneControls/SCRs/Overview.aspx' },
      { price: 160 },
      { price: 180 },
    ],
  },
  'Trim profile style': {
    allowance: 600,
    options: [
      { price: 400 },
      { price: 500 },
      { price: 700 },
      { price: 350 },
    ],
  },
  'Door hardware finish': {
    allowance: 400,
    options: [
      { price: 280, vendorUrl: 'https://www.schlage.com' },
      { price: 320, vendorUrl: 'https://www.emtek.com' },
      { price: 360 },
      { price: 240 },
    ],
  },
}

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: 'Demo Bath + Kitchen Renovation' },
  })
  if (!project) {
    console.log('Demo project not found — nothing to patch.')
    return
  }

  const decisions = await prisma.decision.findMany({
    where: { projectId: project.id },
    include: { options: { orderBy: { createdAt: 'asc' } } },
  })

  let updated = 0
  let optionsUpdated = 0

  for (const decision of decisions) {
    const patch = BUDGET_DATA[decision.title]
    if (!patch) continue

    await prisma.decision.update({
      where: { id: decision.id },
      data: { allowance: patch.allowance ?? null },
    })

    if (patch.options && decision.options.length > 0) {
      for (let i = 0; i < Math.min(patch.options.length, decision.options.length); i++) {
        const optPatch = patch.options[i]
        const opt = decision.options[i]
        await prisma.decisionOption.update({
          where: { id: opt.id },
          data: {
            price: optPatch.price ?? null,
            vendorUrl: optPatch.vendorUrl ?? null,
          },
        })
        optionsUpdated++
      }
    }

    updated++
  }

  // Add some standard project documents
  const docs = await prisma.document.count({ where: { projectId: project.id } })
  if (docs === 0) {
    const milestone = await prisma.milestone.findFirst({
      where: { projectId: project.id, name: 'Discovery & Scope' },
    })
    await prisma.document.createMany({
      data: [
        { projectId: project.id, name: 'Construction Drawings', kind: 'plans', status: 'needed', milestoneId: milestone?.id },
        { projectId: project.id, name: 'Plot Plan', kind: 'plot', status: 'needed' },
        { projectId: project.id, name: 'Grading Plan', kind: 'grading', status: 'needed' },
        { projectId: project.id, name: 'Soils Report', kind: 'soils', status: 'needed' },
        { projectId: project.id, name: 'Signed Contract', kind: 'contracts', status: 'on_file' },
        { projectId: project.id, name: 'Building Permit', kind: 'permits', status: 'needed' },
      ],
    })
    console.log('Created 6 standard project documents.')
  }

  console.log(`Patched ${updated} decisions, ${optionsUpdated} options.`)
  console.log('Budget patch complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
