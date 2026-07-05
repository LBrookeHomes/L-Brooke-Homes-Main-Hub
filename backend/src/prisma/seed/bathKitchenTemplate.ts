import { PrismaClient, DecisionPriority, DecisionType, MilestonePhase } from '@prisma/client'

export interface MilestoneTemplate {
  name: string
  phase: MilestonePhase
  order: number
  decisions: DecisionTemplate[]
}

export interface DecisionTemplate {
  title: string
  description: string
  type: DecisionType
  priority: DecisionPriority
  allowance?: number
  options?: { label: string; description: string; price?: number; vendorUrl?: string }[]
}

export const BATH_KITCHEN_TEMPLATE: MilestoneTemplate[] = [
  {
    name: 'Discovery & Scope',
    phase: 'onboarding',
    order: 1,
    decisions: [
      {
        title: 'Appliance dimensions & brand',
        description: 'Range, refrigerator, and dishwasher dimensions must be confirmed before cabinet layout is drawn. This is a blocking decision.',
        type: 'structured',
        priority: 'critical',
        allowance: 9500,
        options: [
          { label: 'Standard (30" range, counter-depth fridge)', description: 'Fits most layouts without modification', price: 4800 },
          { label: 'Professional (36" range)', description: 'Requires wider opening, impacts adjacent cabinets', price: 9500, vendorUrl: 'https://www.thermador.com/us/products/ranges' },
          { label: 'Custom / already have appliances', description: 'Provide exact measurements at kickoff', price: 6500 },
        ],
      },
      {
        title: 'Island dimensions',
        description: 'Island footprint must be locked in before rough framing begins. Affects traffic flow and electrical/plumbing rough-in.',
        type: 'structured',
        priority: 'critical',
        allowance: 0,
        options: [
          { label: 'No island', description: 'Maximize open floor space', price: 0 },
          { label: 'Small (36" x 48")', description: 'Good for prep, limited seating', price: 1800 },
          { label: 'Medium (36" x 72")', description: 'Seating for 3–4, standard choice', price: 2800 },
          { label: 'Large (42" x 96"+)', description: 'Full entertainment island, verify clearance', price: 4200 },
        ],
      },
      {
        title: 'Project scope: kitchen only, bath only, or both',
        description: 'Confirm final scope to set budget and contractor schedule.',
        type: 'structured',
        priority: 'high',
        options: [
          { label: 'Kitchen only', description: '' },
          { label: 'Bath only', description: '' },
          { label: 'Kitchen + Bath', description: 'Can share some contractor visits to reduce cost' },
        ],
      },
    ],
  },
  {
    name: 'Demolition',
    phase: 'preconstruction',
    order: 2,
    decisions: [
      {
        title: 'Items to salvage vs demo',
        description: 'Identify any cabinets, fixtures, or flooring the client wants to keep or donate.',
        type: 'freeform',
        priority: 'normal',
      },
    ],
  },
  {
    name: 'Rough-in Plumbing',
    phase: 'preconstruction',
    order: 3,
    decisions: [
      {
        title: 'Sink location(s)',
        description: 'Confirm placement of kitchen sink and any wet bar or secondary sink. Moves after rough-in are expensive.',
        type: 'structured',
        priority: 'high',
        allowance: 1200,
        options: [
          { label: 'Under window (existing location)', description: 'No relocation cost', price: 0 },
          { label: 'Island sink added', description: 'Requires new drain run through slab or subfloor', price: 1800, vendorUrl: 'https://www.kohler.com/en/products/kitchen-sinks' },
          { label: 'New wall location', description: 'Requires full re-route', price: 2400 },
        ],
      },
      {
        title: 'Shower configuration',
        description: 'Walk-in vs tub-shower combo determines drain and valve rough-in.',
        type: 'structured',
        priority: 'critical',
        allowance: 6500,
        options: [
          { label: 'Walk-in shower only', description: 'Linear drain or center drain options', price: 4800 },
          { label: 'Freestanding tub + separate shower', description: 'Requires additional drain and filler rough-in', price: 7500 },
          { label: 'Tub-shower combo', description: 'Smallest footprint', price: 3800 },
        ],
      },
    ],
  },
  {
    name: 'Rough-in Electrical',
    phase: 'preconstruction',
    order: 4,
    decisions: [
      {
        title: 'Under-cabinet lighting',
        description: 'Hardwired vs plug-in. Hardwired requires rough-in now.',
        type: 'structured',
        priority: 'high',
        allowance: 900,
        options: [
          { label: 'Hardwired LED strip', description: 'Cleanest look, requires rough-in now', price: 900 },
          { label: 'Plug-in puck lights', description: 'No rough-in needed, slightly less clean', price: 350 },
          { label: 'None', description: '', price: 0 },
        ],
      },
      {
        title: 'Pendant lighting over island',
        description: 'Number and spacing of pendants determines junction box placement now.',
        type: 'structured',
        priority: 'normal',
        allowance: 800,
        options: [
          { label: '2 pendants', description: 'Good for islands up to 60"', price: 400 },
          { label: '3 pendants', description: 'Standard for 72"+ islands', price: 650 },
          { label: 'Single linear pendant', description: 'Modern look, one centered box', price: 800, vendorUrl: 'https://www.restorationhardware.com/catalog/category/collections.jsp?categoryId=cat4580001' },
          { label: 'No pendants (recessed only)', description: '', price: 350 },
        ],
      },
      {
        title: 'Bathroom exhaust fan',
        description: 'Standard vs combination fan/light/heat. Duct path must be planned now.',
        type: 'structured',
        priority: 'normal',
        allowance: 300,
        options: [
          { label: 'Standard exhaust fan', description: '', price: 120, vendorUrl: 'https://www.broan-nutone.com/en-us/products/ventilation-fans' },
          { label: 'Fan + light combo', description: '', price: 200 },
          { label: 'Fan + light + heat combo', description: 'Good for cold climates', price: 320 },
        ],
      },
    ],
  },
  {
    name: 'Rough Framing',
    phase: 'preconstruction',
    order: 5,
    decisions: [
      {
        title: 'Window changes',
        description: 'Any window additions, enlargements, or removals must be decided before framing is closed.',
        type: 'freeform',
        priority: 'high',
      },
      {
        title: 'Open wall vs closed wall (kitchen to living)',
        description: 'Removing a wall between kitchen and living area changes structural requirements.',
        type: 'structured',
        priority: 'high',
        options: [
          { label: 'Keep existing walls', description: 'No structural work needed', price: 0 },
          { label: 'Full open concept (remove wall)', description: 'May require beam — engineer to assess', price: 4500 },
          { label: 'Pass-through opening only', description: 'Partial removal, lower cost', price: 1800 },
        ],
      },
    ],
  },
  {
    name: 'Inspections',
    phase: 'preconstruction',
    order: 6,
    decisions: [],
  },
  {
    name: 'Insulation & Drywall',
    phase: 'construction',
    order: 7,
    decisions: [
      {
        title: 'Ceiling height modification',
        description: 'Vaulting or dropping ceiling sections must be confirmed before drywall.',
        type: 'structured',
        priority: 'normal',
        options: [
          { label: 'Existing height (no change)', description: '', price: 0 },
          { label: 'Vault / raise ceiling', description: 'Requires structural assessment', price: 3500 },
          { label: 'Drop soffit over cabinets', description: 'Traditional look, hides mechanicals', price: 800 },
        ],
      },
    ],
  },
  {
    name: 'Tile & Flooring',
    phase: 'construction',
    order: 8,
    decisions: [
      {
        title: 'Kitchen flooring material',
        description: 'Material must be selected before tile subcontractor is scheduled.',
        type: 'structured',
        priority: 'high',
        allowance: 5500,
        options: [
          { label: 'Large-format porcelain tile', description: 'Durable, easy clean, wide style range', price: 5500, vendorUrl: 'https://www.flooranddecor.com/porcelain-tile' },
          { label: 'Luxury vinyl plank (LVP)', description: 'Warm look, waterproof, lower cost', price: 3800, vendorUrl: 'https://www.flooranddecor.com/luxury-vinyl-plank' },
          { label: 'Hardwood', description: 'Classic, matches existing floors if present', price: 7200 },
          { label: 'Cement / encaustic tile', description: 'Bold look, requires sealing', price: 6800 },
        ],
      },
      {
        title: 'Kitchen floor tile / plank color & style',
        description: 'Specific product selection. Provide sample or link.',
        type: 'freeform',
        priority: 'high',
      },
      {
        title: 'Kitchen backsplash tile',
        description: 'Type, color, pattern, and grout color.',
        type: 'structured',
        priority: 'high',
        allowance: 1800,
        options: [
          { label: 'Subway tile (3x6)', description: 'Classic, widely available', price: 800, vendorUrl: 'https://www.flooranddecor.com/subway-tile' },
          { label: 'Large-format slab look', description: 'Modern, fewer grout lines', price: 1800 },
          { label: 'Zellige / handmade tile', description: 'Artisan look, higher cost', price: 3200, vendorUrl: 'https://www.cletile.com/collections/zellige' },
          { label: 'Mosaic / patterned', description: 'Bold focal point', price: 2200 },
        ],
      },
      {
        title: 'Backsplash grout color',
        description: 'Light grout shows less dirt; dark grout makes a design statement.',
        type: 'structured',
        priority: 'normal',
        options: [
          { label: 'White / bright white', description: 'Classic, clean look', price: 0 },
          { label: 'Gray (light to mid)', description: 'Most popular, hides wear', price: 0 },
          { label: 'Dark / charcoal', description: 'High contrast, modern', price: 0 },
          { label: 'Colored (to match tile)', description: 'Tone-on-tone', price: 0 },
        ],
      },
      {
        title: 'Bathroom floor tile',
        description: 'Must withstand wet conditions. Non-slip rating recommended.',
        type: 'structured',
        priority: 'high',
        allowance: 1600,
        options: [
          { label: 'Porcelain (matte, non-slip)', description: 'Most durable choice', price: 1200, vendorUrl: 'https://www.flooranddecor.com/porcelain-tile/bathroom' },
          { label: 'Marble look porcelain', description: 'Luxurious, verify slip rating', price: 2200, vendorUrl: 'https://www.flooranddecor.com/marble-look-porcelain' },
          { label: 'Penny tile or mosaic', description: 'Classic bath look, more grout maintenance', price: 1800 },
          { label: 'Concrete look', description: 'Modern industrial', price: 1400 },
        ],
      },
      {
        title: 'Shower wall tile',
        description: 'Full-height vs half-height; large format vs small format.',
        type: 'structured',
        priority: 'high',
        allowance: 2800,
        options: [
          { label: 'Large-format porcelain (12x24 or bigger)', description: 'Fewer grout lines, easy clean', price: 2000, vendorUrl: 'https://www.flooranddecor.com/large-format-tile' },
          { label: 'Subway tile', description: 'Timeless, many layout options', price: 1800 },
          { label: 'Stone / natural marble', description: 'Requires regular sealing', price: 4200, vendorUrl: 'https://www.artistic-tile.com/natural-stone' },
          { label: 'Patterned accent + field tile', description: 'Mix of two tiles for visual interest', price: 2800 },
        ],
      },
    ],
  },
  {
    name: 'Cabinets & Countertops',
    phase: 'construction',
    order: 9,
    decisions: [
      {
        title: 'Cabinet style',
        description: 'Door profile and overall aesthetic direction.',
        type: 'structured',
        priority: 'critical',
        allowance: 18000,
        options: [
          { label: 'Shaker (recessed panel)', description: 'Most popular, works in any style', price: 16000 },
          { label: 'Flat-front / slab', description: 'Clean modern look', price: 18000 },
          { label: 'Raised panel', description: 'Traditional, formal', price: 20000 },
          { label: 'Open shelving (upper only)', description: 'Airy look, requires tidiness', price: 12000 },
        ],
      },
      {
        title: 'Cabinet finish color',
        description: 'Upper and lower cabinet colors (can differ for two-tone look).',
        type: 'freeform',
        priority: 'critical',
      },
      {
        title: 'Countertop material',
        description: 'Must be selected before cabinet templating. Lead time can be 3–6 weeks.',
        type: 'structured',
        priority: 'critical',
        allowance: 6500,
        options: [
          { label: 'Quartz (engineered stone)', description: 'Non-porous, low maintenance, wide range', price: 6200, vendorUrl: 'https://www.caesarstoneus.com' },
          { label: 'Granite (natural stone)', description: 'Unique patterns, requires sealing', price: 5800, vendorUrl: 'https://www.msisurfaces.com/granite' },
          { label: 'Marble', description: 'High-end look, etches with acid, requires sealing', price: 9500 },
          { label: 'Butcher block', description: 'Warm, natural, requires oiling', price: 3200 },
        ],
      },
      {
        title: 'Cabinet hardware',
        description: 'Pulls and knobs finish. Finish should coordinate with plumbing fixtures.',
        type: 'structured',
        priority: 'normal',
        allowance: 600,
        options: [
          { label: 'Brushed nickel', description: 'Classic, matches most plumbing', price: 420, vendorUrl: 'https://www.amerock.com' },
          { label: 'Matte black', description: 'Bold, modern', price: 580, vendorUrl: 'https://www.rejuvenation.com/hardware' },
          { label: 'Brass / unlacquered brass', description: 'Warm, on-trend', price: 720, vendorUrl: 'https://www.rejuvenation.com/hardware' },
          { label: 'No hardware (integrated pulls)', description: 'Clean look', price: 350 },
        ],
      },
      {
        title: 'Bathroom vanity style',
        description: 'Freestanding vs built-in; single vs double sink.',
        type: 'structured',
        priority: 'high',
        allowance: 2200,
        options: [
          { label: 'Built-in single sink vanity', description: 'Max storage', price: 1400, vendorUrl: 'https://www.homedepot.com/b/Bath-Bathroom-Vanities/N-5yc1vZbzej' },
          { label: 'Built-in double sink vanity', description: 'For shared bath', price: 2200 },
          { label: 'Floating / wall-mount', description: 'Modern, easier floor cleaning', price: 2600, vendorUrl: 'https://www.wayfair.com/keyword.php?keyword=floating+vanity' },
          { label: 'Freestanding furniture-style', description: 'Unique look', price: 1800 },
        ],
      },
    ],
  },
  {
    name: 'Plumbing Trim-out',
    phase: 'construction',
    order: 10,
    decisions: [
      {
        title: 'Kitchen faucet style & finish',
        description: 'Finish must match or coordinate with cabinet hardware.',
        type: 'structured',
        priority: 'high',
        allowance: 500,
        options: [
          { label: 'Single-handle pull-down', description: 'Most practical for kitchen use', price: 280, vendorUrl: 'https://www.deltafaucet.com/kitchen/faucets' },
          { label: 'Bridge faucet (farmhouse style)', description: 'Traditional, two handles', price: 480, vendorUrl: 'https://www.kohler.com/en/products/kitchen/shop-kitchen/kitchen-faucets' },
          { label: 'Commercial-style with spray', description: 'Pro look, higher flow', price: 620, vendorUrl: 'https://www.signaturehardware.com/kitchen-faucets.html' },
          { label: 'Touch / touchless', description: 'Convenient, higher cost', price: 400, vendorUrl: 'https://www.deltafaucet.com/kitchen/faucets/touch-kitchen-faucets' },
        ],
      },
      {
        title: 'Shower head type',
        description: 'Affects valve trim selection.',
        type: 'structured',
        priority: 'normal',
        allowance: 700,
        options: [
          { label: 'Standard wall-mount', description: 'Simple, cost-effective', price: 180, vendorUrl: 'https://www.kohler.com/en/products/showering' },
          { label: 'Rain head (ceiling mount)', description: 'Spa feel, requires ceiling rough-in', price: 550, vendorUrl: 'https://www.grohe.com/us/bath/showers/rain-showers.html' },
          { label: 'Rain head + hand shower combo', description: 'Maximum flexibility', price: 850, vendorUrl: 'https://www.hansgrohe-usa.com/articlelist-shower-systems' },
          { label: 'Multi-function body spray system', description: 'Luxury, high water use', price: 2200 },
        ],
      },
      {
        title: 'Bathroom faucet finish',
        description: 'Should coordinate with shower fixtures and cabinet hardware.',
        type: 'structured',
        priority: 'high',
        allowance: 350,
        options: [
          { label: 'Brushed nickel', description: '', price: 220, vendorUrl: 'https://www.deltafaucet.com/bathroom/faucets' },
          { label: 'Matte black', description: '', price: 280, vendorUrl: 'https://www.kohler.com/en/products/bathroom/shop-bathroom/bathroom-sink-faucets' },
          { label: 'Polished chrome', description: '', price: 190 },
          { label: 'Brushed gold / champagne bronze', description: '', price: 340, vendorUrl: 'https://www.brizo.com/bathroom/faucets' },
        ],
      },
    ],
  },
  {
    name: 'Electrical Trim-out',
    phase: 'construction',
    order: 11,
    decisions: [
      {
        title: 'Lighting fixtures — kitchen',
        description: 'Select recessed trim style and pendant fixtures (if applicable). Provide product links.',
        type: 'freeform',
        priority: 'normal',
      },
      {
        title: 'Lighting fixtures — bathroom',
        description: 'Vanity light bar and any accent lighting. Finish should match other fixtures.',
        type: 'freeform',
        priority: 'normal',
      },
      {
        title: 'Outlet and switch plate finish',
        description: 'Decora vs Screwless; color (white, ivory, black, almond).',
        type: 'structured',
        priority: 'low',
        allowance: 200,
        options: [
          { label: 'White standard Decora', description: 'Most common', price: 120 },
          { label: 'White screwless (Lutron Claro)', description: 'Clean look, no visible screws', price: 220, vendorUrl: 'https://www.lutron.com/en-US/Products/Pages/StandAloneControls/SCRs/Overview.aspx' },
          { label: 'Black', description: 'Matches matte black hardware', price: 160 },
          { label: 'Match wall color', description: 'Painted to blend in', price: 180 },
        ],
      },
    ],
  },
  {
    name: 'Paint',
    phase: 'construction',
    order: 12,
    decisions: [
      {
        title: 'Kitchen wall color',
        description: 'Provide paint brand, color name, and sheen (eggshell recommended for kitchens).',
        type: 'freeform',
        priority: 'high',
      },
      {
        title: 'Bathroom wall color',
        description: 'Provide paint brand, color name, and sheen (satin recommended for bathrooms).',
        type: 'freeform',
        priority: 'high',
      },
      {
        title: 'Trim & ceiling color',
        description: 'Typically white or off-white. Specify if different from standard.',
        type: 'structured',
        priority: 'normal',
        allowance: 400,
        options: [
          { label: 'Benjamin Moore Chantilly Lace OC-65', description: 'Bright white, very popular', price: 0, vendorUrl: 'https://www.benjaminmoore.com/en-us/color-overview/find-your-color/color/OC-65/chantilly-lace' },
          { label: 'Sherwin-Williams Extra White SW 7006', description: 'Warm white', price: 0, vendorUrl: 'https://www.sherwin-williams.com/en-us/color/color-family/white-paint-colors/SW7006' },
          { label: 'Match existing trim in home', description: 'Bring existing paint chip to match', price: 0 },
          { label: 'Custom color', description: 'Specify in free-form note', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Finish Carpentry',
    phase: 'construction',
    order: 13,
    decisions: [
      {
        title: 'Trim profile style',
        description: 'Base, casing, and crown profile. Should match existing home trim if visible.',
        type: 'structured',
        priority: 'normal',
        allowance: 600,
        options: [
          { label: 'Match existing home trim', description: 'Most cohesive', price: 400 },
          { label: 'Simple / modern (flat casing)', description: 'Clean lines, pairs with shaker', price: 500 },
          { label: 'Traditional (craftsman or colonial)', description: 'More decorative profile', price: 700 },
          { label: 'No crown molding', description: 'Skip crown for cost savings or modern look', price: 350 },
        ],
      },
      {
        title: 'Door hardware finish',
        description: 'Should coordinate with cabinet hardware and plumbing fixtures.',
        type: 'structured',
        priority: 'normal',
        allowance: 400,
        options: [
          { label: 'Brushed nickel', description: '', price: 280, vendorUrl: 'https://www.schlage.com' },
          { label: 'Matte black', description: '', price: 320, vendorUrl: 'https://www.emtek.com' },
          { label: 'Satin brass', description: '', price: 360 },
          { label: 'Polished chrome', description: '', price: 240 },
        ],
      },
    ],
  },
  {
    name: 'Punch List & Final Walk',
    phase: 'closeout',
    order: 14,
    decisions: [
      {
        title: 'Punch list items',
        description: 'Final walk-through notes. Client identifies any items requiring touch-up or correction.',
        type: 'freeform',
        priority: 'normal',
      },
    ],
  },
]

export async function seedBathKitchenTemplate(
  prisma: PrismaClient,
  projectId: string
): Promise<void> {
  for (const milestoneTemplate of BATH_KITCHEN_TEMPLATE) {
    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name: milestoneTemplate.name,
        phase: milestoneTemplate.phase,
        order: milestoneTemplate.order,
        status: 'pending',
      },
    })

    for (const decisionTemplate of milestoneTemplate.decisions) {
      await prisma.decision.create({
        data: {
          projectId,
          milestoneId: milestone.id,
          title: decisionTemplate.title,
          description: decisionTemplate.description,
          type: decisionTemplate.type,
          priority: decisionTemplate.priority,
          allowance: decisionTemplate.allowance ?? null,
          options:
            decisionTemplate.options && decisionTemplate.options.length > 0
              ? {
                  create: decisionTemplate.options.map((opt) => ({
                    label: opt.label,
                    description: opt.description || null,
                    price: opt.price ?? null,
                    vendorUrl: opt.vendorUrl ?? null,
                  })),
                }
              : undefined,
        },
      })
    }
  }
}
