import { PrismaClient } from '@prisma/client'
import { MilestoneTemplate } from './bathKitchenTemplate'

const ROOM_TEMPLATES: Record<string, MilestoneTemplate[]> = {
  kitchen: [
    {
      name: 'Kitchen Planning',
      phase: 'onboarding',
      order: 1,
      decisions: [
        { title: 'Appliance dimensions & brand', description: 'Range, refrigerator, and dishwasher dimensions must be confirmed before cabinet layout.', type: 'structured', priority: 'critical', allowance: 9500, options: [{ label: 'Budget suite (Samsung/LG)', description: 'Standard 30" range, 36" fridge', price: 4800 }, { label: 'Mid-range (Bosch/KitchenAid)', description: '30" range, French door fridge', price: 7500 }, { label: 'High-end (Wolf/Sub-Zero)', description: '36" range, 36" column fridge', price: 18000 }] },
        { title: 'Island dimensions', description: 'Island size determines clearance and traffic flow. Locked before framing.', type: 'structured', priority: 'critical', allowance: 0, options: [{ label: 'No island', description: 'Open floor plan', price: 0 }, { label: '4×2 fixed island', description: 'Standard prep island', price: 1800 }, { label: '6×3 island with seating', description: 'Seating for 3-4', price: 2800 }] },
        { title: 'Cabinet style & finish', description: 'Inset vs overlay, paint color or stain.', type: 'structured', priority: 'critical', allowance: 18000, options: [{ label: 'Semi-custom painted', description: 'Box stock, custom doors', price: 16000 }, { label: 'Full custom painted', description: 'Site-built inset', price: 20000 }, { label: 'RTA flat-front', description: 'IKEA-style assembly', price: 8000 }] },
        { title: 'Countertop material', description: 'Must be selected before template measurement.', type: 'structured', priority: 'high', allowance: 6500, options: [{ label: 'Quartz', description: 'Low maintenance, consistent pattern', price: 6200, vendorUrl: 'https://www.caesarstoneus.com' }, { label: 'Granite', description: 'Natural stone, unique slabs', price: 5800 }, { label: 'Quartzite', description: 'Natural stone, harder than marble', price: 9500 }, { label: 'Butcher block', description: 'Warm wood look, requires sealing', price: 3200 }] },
      ],
    },
    {
      name: 'Kitchen Demolition & Rough-in',
      phase: 'preconstruction',
      order: 2,
      decisions: [
        { title: 'Sink location', description: 'Under-window vs island sink. Determines drain rough-in location.', type: 'structured', priority: 'high', allowance: 1200, options: [{ label: 'Under window (existing)', description: 'No relocation needed', price: 0 }, { label: 'Island primary sink', description: 'Requires new drain run', price: 1800 }, { label: 'Both locations', description: 'Prep and clean sink', price: 2400 }] },
        { title: 'Gas vs electric range', description: 'Determines rough-in type. Gas requires gas line; electric requires 240V circuit.', type: 'structured', priority: 'critical', options: [{ label: 'Gas range (existing line)', description: 'Use existing gas stub', price: 0 }, { label: 'Gas range (new line)', description: 'Run new gas line', price: 800 }, { label: 'Electric range (240V)', description: 'New 50A circuit', price: 400 }, { label: 'Induction range (240V)', description: 'New 50A circuit + induction cooktop', price: 400 }] },
      ],
    },
    {
      name: 'Kitchen Finish',
      phase: 'construction',
      order: 3,
      decisions: [
        { title: 'Backsplash tile', description: 'Material and pattern for above-counter wall tile.', type: 'structured', priority: 'high', allowance: 1800, options: [{ label: 'Subway tile', description: '3×6 classic white', price: 800, vendorUrl: 'https://www.flooranddecor.com/subway-tile' }, { label: 'Large format porcelain', description: '12×24 or 24×48', price: 1800 }, { label: 'Zellige', description: 'Handmade Moroccan tile', price: 3200, vendorUrl: 'https://www.cletile.com/collections/zellige' }, { label: 'Slab backsplash (quartz/marble)', description: 'Continuous slab, no grout', price: 2800 }] },
        { title: 'Kitchen flooring', description: 'Floor material to match or complement rest of main level.', type: 'structured', priority: 'high', allowance: 5500, options: [{ label: 'Porcelain tile', description: 'Durable, easy clean', price: 5500, vendorUrl: 'https://www.flooranddecor.com/porcelain-tile' }, { label: 'LVP', description: 'Waterproof plank', price: 3800 }, { label: 'Hardwood to match existing', description: 'Species and stain match', price: 7200 }, { label: 'New hardwood (different zone)', description: 'New species/stain', price: 6800 }] },
        { title: 'Kitchen faucet', description: 'Style and finish for primary sink.', type: 'structured', priority: 'normal', allowance: 500, options: [{ label: 'Single-handle pull-down', description: 'Classic utility', price: 280, vendorUrl: 'https://www.deltafaucet.com/kitchen/faucets' }, { label: 'Commercial-style', description: 'High arc, restaurant look', price: 480, vendorUrl: 'https://www.kohler.com/en/products/kitchen/shop-kitchen/kitchen-faucets' }, { label: 'Bridge faucet', description: 'Traditional farmhouse', price: 620 }] },
        { title: 'Cabinet hardware', description: 'Pulls and knobs. Selected after cabinet color confirmed.', type: 'structured', priority: 'normal', allowance: 600, options: [{ label: 'Brushed nickel bar pulls', description: 'Clean modern look', price: 420, vendorUrl: 'https://www.amerock.com' }, { label: 'Matte black pulls', description: 'Contemporary contrast', price: 580 }, { label: 'Satin brass', description: 'Warm transitional', price: 720, vendorUrl: 'https://www.rejuvenation.com/hardware' }, { label: 'Bin pulls (vintage)', description: 'Farmhouse character', price: 350 }] },
        { title: 'Under-cabinet lighting', description: 'Task lighting below wall cabinets.', type: 'structured', priority: 'normal', allowance: 900, options: [{ label: 'LED tape (hardwired)', description: 'Sleek, dimmable', price: 900 }, { label: 'LED puck lights', description: 'Plug-in, easier install', price: 350 }, { label: 'None', description: 'Skip under-cabinet lighting', price: 0 }] },
        { title: 'Pendant lighting over island', description: 'Decorative pendants above island or peninsula.', type: 'structured', priority: 'normal', allowance: 800, options: [{ label: 'Drum pendants (3)', description: 'Classic look', price: 400 }, { label: 'Glass globe pendants (3)', description: 'Light and airy', price: 650 }, { label: 'Statement pendants (2)', description: 'Dramatic focal point', price: 800, vendorUrl: 'https://www.restorationhardware.com' }, { label: 'Track lighting', description: 'Adjustable, no pendants', price: 350 }] },
      ],
    },
    { name: 'Kitchen Punch List', phase: 'closeout', order: 4, decisions: [{ title: 'Punch list items', description: 'Final walk-through. Identify any touch-ups or corrections needed.', type: 'freeform', priority: 'normal' }] },
  ],

  bathroom: [
    {
      name: 'Bathroom Planning',
      phase: 'onboarding',
      order: 1,
      decisions: [
        { title: 'Shower configuration', description: 'Tub/shower combo, walk-in shower, or freestanding tub?', type: 'structured', priority: 'critical', allowance: 6500, options: [{ label: 'Walk-in shower (tile)', description: 'Custom tile shower, no tub', price: 7500 }, { label: 'Tub/shower combo', description: 'Alcove or drop-in tub with surround', price: 4800 }, { label: 'Freestanding tub + separate shower', description: 'Luxury configuration', price: 12000 }, { label: 'Prefab shower unit', description: 'Acrylic surround, faster install', price: 3800 }] },
        { title: 'Vanity style', description: 'Freestanding, floating, or built-in. Single or double.', type: 'structured', priority: 'high', allowance: 2200, options: [{ label: 'Single floating vanity', description: 'Modern, open floor', price: 2200, vendorUrl: 'https://www.wayfair.com/keyword.php?keyword=floating+vanity' }, { label: 'Double floating vanity', description: 'His/hers, larger bath', price: 3800 }, { label: 'Furniture-style vanity', description: 'Traditional look', price: 1800 }, { label: 'Built-in custom vanity', description: 'Matches cabinetry', price: 4500 }] },
      ],
    },
    {
      name: 'Bathroom Rough-in',
      phase: 'preconstruction',
      order: 2,
      decisions: [
        { title: 'Toilet location', description: 'Keep in place vs. reposition. Repositioning requires new drain run.', type: 'structured', priority: 'high', options: [{ label: 'Keep existing location', description: 'No plumbing relocation', price: 0 }, { label: 'Reposition (minor shift)', description: 'Extend drain < 3 ft', price: 600 }, { label: 'Reposition (major)', description: 'New drain stub > 3 ft', price: 1400 }] },
        { title: 'Exhaust fan', description: 'Fan-only vs combo unit.', type: 'structured', priority: 'normal', allowance: 300, options: [{ label: 'Standard exhaust fan', description: 'Quiet series, 110 CFM', price: 120, vendorUrl: 'https://www.broan-nutone.com' }, { label: 'Fan + LED light combo', description: 'Recessed look', price: 200 }, { label: 'Fan + heat lamp combo', description: 'Warmth for cold mornings', price: 320 }] },
      ],
    },
    {
      name: 'Bathroom Finish',
      phase: 'construction',
      order: 3,
      decisions: [
        { title: 'Shower wall tile', description: 'Tile material and pattern for shower surround.', type: 'structured', priority: 'high', allowance: 2800, options: [{ label: 'Large format porcelain', description: '24×48, minimal grout lines', price: 2000, vendorUrl: 'https://www.flooranddecor.com' }, { label: 'Subway tile', description: '3×6 or 4×8 classic', price: 1800 }, { label: 'Natural stone', description: 'Marble or travertine', price: 4200, vendorUrl: 'https://www.artistic-tile.com' }, { label: 'Porcelain wood-look', description: 'Warm texture without maintenance', price: 2800 }] },
        { title: 'Floor tile', description: 'Bathroom floor material and pattern.', type: 'structured', priority: 'high', allowance: 1600, options: [{ label: 'Hexagon mosaic', description: '2" hex, classic bath look', price: 1200, vendorUrl: 'https://www.flooranddecor.com' }, { label: 'Marble look porcelain', description: 'Polished finish', price: 2200 }, { label: 'Large format (12×24)', description: 'Fewer grout lines', price: 1800 }, { label: 'Cement look', description: 'Industrial/contemporary', price: 1400 }] },
        { title: 'Bathroom faucet finish', description: 'Finish for vanity faucet(s), towel bars, TP holder.', type: 'structured', priority: 'normal', allowance: 350, options: [{ label: 'Chrome', description: 'Classic, easy to match', price: 190 }, { label: 'Brushed nickel', description: 'Warm neutral, popular', price: 220, vendorUrl: 'https://www.deltafaucet.com/bathroom/faucets' }, { label: 'Matte black', description: 'Modern contrast', price: 280 }, { label: 'Brushed gold/brass', description: 'Warm luxe look', price: 340, vendorUrl: 'https://www.brizo.com' }] },
        { title: 'Shower head type', description: 'Rain, handheld, or combo system.', type: 'structured', priority: 'normal', allowance: 700, options: [{ label: 'Standard fixed', description: 'Simple, reliable', price: 180, vendorUrl: 'https://www.kohler.com/en/products/showering' }, { label: 'Rain head (ceiling mount)', description: 'Spa-like experience', price: 550, vendorUrl: 'https://www.grohe.com/us/bath/showers' }, { label: 'Combo system (rain + handheld)', description: 'Best of both', price: 850, vendorUrl: 'https://www.hansgrohe-usa.com' }, { label: 'Full shower system (thermostatic)', description: 'Multiple outlets, precise temp', price: 2200 }] },
        { title: 'Mirror style', description: 'Framed, frameless, or medicine cabinet.', type: 'structured', priority: 'normal', allowance: 400, options: [{ label: 'Frameless rectangle', description: 'Simple, modern', price: 180 }, { label: 'LED backlit mirror', description: 'Built-in lighting', price: 420 }, { label: 'Medicine cabinet', description: 'Storage behind mirror', price: 350 }, { label: 'Framed decorative', description: 'Statement piece', price: 280 }] },
      ],
    },
    { name: 'Bathroom Punch List', phase: 'closeout', order: 4, decisions: [{ title: 'Punch list items', description: 'Final walk-through. Identify any touch-ups or corrections needed.', type: 'freeform', priority: 'normal' }] },
  ],

  bedroom: [
    {
      name: 'Bedroom Planning',
      phase: 'onboarding',
      order: 1,
      decisions: [
        { title: 'Closet type', description: 'Standard reach-in, walk-in expansion, or built-in wardrobe system.', type: 'structured', priority: 'high', allowance: 2500, options: [{ label: 'Standard reach-in (existing)', description: 'Paint and rods only', price: 200 }, { label: 'Walk-in expansion', description: 'Framing to expand closet footprint', price: 3500 }, { label: 'Built-in system', description: 'Custom shelving and drawers', price: 2500 }, { label: 'Wardrobe armoire', description: 'Free-standing, no framing', price: 1200 }] },
        { title: 'Window treatment rough-in', description: 'Blackout shades, curtain rods, or motorized blinds require blocking before drywall.', type: 'structured', priority: 'normal', options: [{ label: 'Standard curtain rods', description: 'No blocking needed', price: 0 }, { label: 'Blackout roller shades', description: 'Inside mount, no blocking', price: 400 }, { label: 'Motorized blinds', description: 'Requires wiring before drywall', price: 1200 }] },
      ],
    },
    {
      name: 'Bedroom Finish',
      phase: 'construction',
      order: 2,
      decisions: [
        { title: 'Flooring', description: 'Material and finish for bedroom floor.', type: 'structured', priority: 'high', allowance: 3500, options: [{ label: 'Hardwood (solid)', description: 'Classic, refinishable', price: 5500 }, { label: 'Engineered hardwood', description: 'Stable, wider plank', price: 4200 }, { label: 'LVP', description: 'Waterproof, great value', price: 3000 }, { label: 'Carpet', description: 'Soft underfoot, quiet', price: 2200 }] },
        { title: 'Paint color', description: 'Wall color and sheen for bedroom.', type: 'structured', priority: 'normal', options: [{ label: 'Warm white/cream', description: 'Bright and open', price: 0 }, { label: 'Soft gray or greige', description: 'Neutral contemporary', price: 0 }, { label: 'Deep color (navy, forest, etc.)', description: 'Dramatic accent', price: 0 }, { label: 'Client provides color code', description: 'Custom selection', price: 0 }] },
        { title: 'Ceiling fan or light fixture', description: 'Overhead light type for bedroom.', type: 'structured', priority: 'normal', allowance: 300, options: [{ label: 'Ceiling fan with light', description: 'Function + air circulation', price: 280 }, { label: 'Semi-flush light fixture', description: 'Clean look, no fan', price: 200 }, { label: 'Recessed lights (2-4)', description: 'Requires can locations before drywall', price: 400 }, { label: 'Ceiling fan only', description: 'No dedicated light', price: 180 }] },
      ],
    },
    { name: 'Bedroom Punch List', phase: 'closeout', order: 3, decisions: [{ title: 'Punch list items', description: 'Final walk-through corrections and touch-ups.', type: 'freeform', priority: 'normal' }] },
  ],

  living: [
    {
      name: 'Living Room Planning',
      phase: 'onboarding',
      order: 1,
      decisions: [
        { title: 'Fireplace treatment', description: 'Existing fireplace: update surround, add gas insert, or leave as-is.', type: 'structured', priority: 'high', allowance: 3000, options: [{ label: 'Keep existing', description: 'Paint or clean only', price: 0 }, { label: 'New tile or stone surround', description: 'Update the facing material', price: 2800 }, { label: 'Add gas insert', description: 'Requires gas line and liner', price: 4500 }, { label: 'Drywall over / remove', description: 'Eliminate fireplace entirely', price: 1200 }] },
        { title: 'Built-in shelving', description: 'Flanking fireplace or entertainment wall built-ins.', type: 'structured', priority: 'normal', allowance: 2000, options: [{ label: 'None', description: 'No built-ins', price: 0 }, { label: 'Simple open shelving', description: 'Pine or MDF painted', price: 1800 }, { label: 'Full built-in with doors', description: 'Custom cabinetry, doors below', price: 4500 }] },
      ],
    },
    {
      name: 'Living Room Finish',
      phase: 'construction',
      order: 2,
      decisions: [
        { title: 'Flooring', description: 'Main living area floor material.', type: 'structured', priority: 'high', allowance: 6000, options: [{ label: 'Hardwood (match existing)', description: 'Seamless transition', price: 7000 }, { label: 'New hardwood', description: 'New species or stain', price: 6000 }, { label: 'LVP', description: 'Modern and waterproof', price: 4000 }, { label: 'Tile', description: 'Best for high-traffic', price: 5500 }] },
        { title: 'Lighting plan', description: 'Recessed lighting layout and any accent fixtures.', type: 'structured', priority: 'normal', allowance: 800, options: [{ label: 'Existing fixture (no change)', description: 'Keep ceiling outlet only', price: 0 }, { label: 'Recessed lighting (4-6 cans)', description: 'Before drywall placement', price: 800 }, { label: 'Recessed + accent', description: 'Cans plus directional spots', price: 1200 }] },
        { title: 'Paint color', description: 'Wall color and sheen for living areas.', type: 'structured', priority: 'normal', options: [{ label: 'Warm white/off-white', description: 'Bright and versatile', price: 0 }, { label: 'Warm neutral (greige/tan)', description: 'Cozy and popular', price: 0 }, { label: 'Cool gray', description: 'Modern and calm', price: 0 }, { label: 'Accent wall + neutral', description: 'One bold wall', price: 0 }] },
      ],
    },
    { name: 'Living Room Punch List', phase: 'closeout', order: 3, decisions: [{ title: 'Punch list items', description: 'Final walk-through corrections.', type: 'freeform', priority: 'normal' }] },
  ],

  exterior: [
    {
      name: 'Exterior Planning',
      phase: 'onboarding',
      order: 1,
      decisions: [
        { title: 'Siding material', description: 'Replacement or partial siding update.', type: 'structured', priority: 'critical', allowance: 15000, options: [{ label: 'HardiePlank (fiber cement)', description: 'Durable, paintable, 50-year warranty', price: 18000 }, { label: 'LP SmartSide (engineered wood)', description: 'Similar durability, lower cost', price: 14000 }, { label: 'Vinyl (premium)', description: 'Low maintenance, insulated', price: 11000 }, { label: 'Cedar (natural wood)', description: 'Traditional look, higher maintenance', price: 22000 }] },
        { title: 'Exterior paint colors', description: 'Body, trim, and front door color selections.', type: 'structured', priority: 'high', options: [{ label: 'Classic white + black trim', description: 'Timeless curb appeal', price: 0 }, { label: 'Gray body + white trim', description: 'Modern neutral', price: 0 }, { label: 'Warm tone + contrasting trim', description: 'Character and warmth', price: 0 }, { label: 'Client provides selections', description: 'Custom color spec', price: 0 }] },
      ],
    },
    {
      name: 'Exterior Rough Work',
      phase: 'preconstruction',
      order: 2,
      decisions: [
        { title: 'Window replacement', description: 'Replace some or all windows during siding project.', type: 'structured', priority: 'high', allowance: 12000, options: [{ label: 'No window replacement', description: 'Siding only', price: 0 }, { label: 'Replace all windows', description: 'New double-pane vinyl', price: 12000 }, { label: 'Replace damaged windows only', description: 'Selective replacement', price: 4000 }] },
        { title: 'Insulation upgrade', description: 'Add house wrap or rigid foam under new siding.', type: 'structured', priority: 'normal', allowance: 2500, options: [{ label: 'Standard house wrap', description: 'WRB only, code minimum', price: 800 }, { label: 'House wrap + 1" rigid foam', description: 'Improved thermal break', price: 2500 }, { label: 'House wrap + 2" rigid foam', description: 'Best energy performance', price: 3800 }] },
      ],
    },
    {
      name: 'Exterior Finish',
      phase: 'construction',
      order: 3,
      decisions: [
        { title: 'Front door', description: 'Replace or refinish front entry door.', type: 'structured', priority: 'high', allowance: 2500, options: [{ label: 'Refinish existing', description: 'Strip, stain, and seal', price: 400 }, { label: 'Fiberglass (steel-door look)', description: 'Low maintenance, good insulation', price: 2500 }, { label: 'Steel door', description: 'Security and durability', price: 1800 }, { label: 'Solid wood entry door', description: 'Premium look, requires maintenance', price: 4500 }] },
        { title: 'Gutters', description: 'Replace or add gutters during exterior work.', type: 'structured', priority: 'normal', allowance: 1500, options: [{ label: 'Keep existing gutters', description: 'Clean and reseal only', price: 200 }, { label: 'Replace with aluminum (5")', description: 'Standard replacement', price: 1500 }, { label: 'Seamless aluminum (6")', description: 'Oversized, fewer leaks', price: 2200 }, { label: 'Copper gutters', description: 'Premium, ages beautifully', price: 6000 }] },
      ],
    },
    { name: 'Exterior Punch List', phase: 'closeout', order: 4, decisions: [{ title: 'Punch list items', description: 'Final exterior walk-through corrections.', type: 'freeform', priority: 'normal' }] },
  ],

  deck: [
    {
      name: 'Deck Planning',
      phase: 'onboarding',
      order: 1,
      decisions: [
        { title: 'Deck size & shape', description: 'Square footage and configuration. Determines permit requirements.', type: 'structured', priority: 'critical', options: [{ label: 'Small (up to 200 sq ft)', description: 'May not require permit', price: 0 }, { label: 'Medium (200–400 sq ft)', description: 'Permit typically required', price: 0 }, { label: 'Large (400+ sq ft)', description: 'Full permit + engineering', price: 0 }] },
        { title: 'Decking material', description: 'Surface material for deck boards.', type: 'structured', priority: 'critical', allowance: 8000, options: [{ label: 'Pressure treated pine', description: 'Classic, paintable or stainable', price: 5000 }, { label: 'Cedar', description: 'Rot-resistant, natural beauty', price: 7000 }, { label: 'Composite (Trex/TimberTech)', description: 'Low maintenance, 25-year warranty', price: 12000 }, { label: 'Ipe (hardwood)', description: 'Ultra-durable tropical hardwood', price: 15000 }] },
        { title: 'Railing style', description: 'Code-required guardrail style and material.', type: 'structured', priority: 'high', allowance: 3000, options: [{ label: 'Wood (match decking)', description: 'Integrated look', price: 2800 }, { label: 'Cable railing', description: 'Open views, modern', price: 4500 }, { label: 'Glass panel railing', description: 'Unobstructed views', price: 6000 }, { label: 'Aluminum railing', description: 'Low maintenance, many styles', price: 3200 }] },
      ],
    },
    {
      name: 'Deck Construction',
      phase: 'construction',
      order: 2,
      decisions: [
        { title: 'Lighting', description: 'Post cap lights, step lights, or string lights.', type: 'structured', priority: 'normal', allowance: 600, options: [{ label: 'None', description: 'No built-in lighting', price: 0 }, { label: 'Post cap lights', description: 'Solar or low-voltage caps', price: 600 }, { label: 'Step lights + post caps', description: 'Integrated deck lighting system', price: 1400 }] },
        { title: 'Pergola or shade structure', description: 'Add shade element over deck.', type: 'structured', priority: 'normal', allowance: 0, options: [{ label: 'None', description: 'Open deck only', price: 0 }, { label: 'Pergola (wood)', description: 'Partial shade, great look', price: 5000 }, { label: 'Pergola with retractable shade', description: 'Weather protection', price: 8000 }] },
      ],
    },
    { name: 'Deck Punch List', phase: 'closeout', order: 3, decisions: [{ title: 'Punch list items', description: 'Final deck walk-through corrections.', type: 'freeform', priority: 'normal' }] },
  ],

  garage: [
    {
      name: 'Garage Planning',
      phase: 'onboarding',
      order: 1,
      decisions: [
        { title: 'Garage door', description: 'Replace or repair garage door.', type: 'structured', priority: 'high', allowance: 3000, options: [{ label: 'Steel raised panel', description: 'Standard, durable', price: 2200 }, { label: 'Steel carriage house style', description: 'Traditional curb appeal', price: 2800 }, { label: 'Aluminum modern', description: 'Contemporary, windows', price: 3500 }, { label: 'Wood (custom)', description: 'Premium, unique look', price: 5500 }] },
        { title: 'Garage use intent', description: 'How will the garage primarily be used?', type: 'structured', priority: 'high', options: [{ label: 'Vehicle storage only', description: 'Minimal finish', price: 0 }, { label: 'Workshop', description: 'Heavy-duty outlets, lighting, bench', price: 0 }, { label: 'Gym / flex space', description: 'Insulated, HVAC, nicer floor', price: 0 }, { label: 'ADU conversion', description: 'Full finish-out, separate permit', price: 0 }] },
      ],
    },
    {
      name: 'Garage Finish',
      phase: 'construction',
      order: 2,
      decisions: [
        { title: 'Floor coating', description: 'Garage floor treatment.', type: 'structured', priority: 'normal', allowance: 1500, options: [{ label: 'Bare concrete (clean)', description: 'No coating, seal only', price: 200 }, { label: 'Epoxy coating (DIY kit)', description: 'Roll-on, good durability', price: 600 }, { label: 'Polyurea coating (professional)', description: 'Best durability, fast cure', price: 1800 }, { label: 'Interlocking tile system', description: 'Removable, various colors', price: 2200 }] },
        { title: 'Storage system', description: 'Wall or ceiling storage for garage.', type: 'structured', priority: 'normal', allowance: 1200, options: [{ label: 'None', description: 'Open walls', price: 0 }, { label: 'Wire shelving', description: 'Simple and cheap', price: 400 }, { label: 'Slatwall + bins', description: 'Flexible organization system', price: 1200 }, { label: 'Custom cabinetry', description: 'Finished look, full storage', price: 3500 }] },
        { title: 'Lighting upgrade', description: 'Improve garage lighting.', type: 'structured', priority: 'normal', allowance: 400, options: [{ label: 'Replace fixtures only', description: 'LED shop lights in existing locations', price: 300 }, { label: 'Add circuits + fixtures', description: 'Better coverage', price: 800 }, { label: 'Full lighting redesign', description: 'Task lighting, motion sensors', price: 1400 }] },
      ],
    },
    { name: 'Garage Punch List', phase: 'closeout', order: 3, decisions: [{ title: 'Punch list items', description: 'Final garage walk-through corrections.', type: 'freeform', priority: 'normal' }] },
  ],
}

export const ROOM_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  living: 'Living Room',
  exterior: 'Exterior',
  deck: 'Deck / Patio',
  garage: 'Garage',
}

export async function seedRoomTemplates(
  prisma: PrismaClient,
  projectId: string,
  rooms: string[]
): Promise<void> {
  let orderOffset = 0
  for (const room of rooms) {
    const templates = ROOM_TEMPLATES[room]
    if (!templates) continue
    for (const milestoneTemplate of templates) {
      const milestone = await prisma.milestone.create({
        data: {
          projectId,
          name: milestoneTemplate.name,
          phase: milestoneTemplate.phase,
          order: milestoneTemplate.order + orderOffset,
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
    orderOffset += templates.length
  }
}
