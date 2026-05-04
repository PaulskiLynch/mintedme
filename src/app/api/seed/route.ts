import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const ITEMS = [
  // Cars — Elite
  { name: 'Obsidian GT Coupé',      category: 'cars',        class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80', description: 'Matte black. Zero compromises.', totalSupply: 50, referencePrice: 420000, hasOwnershipCost: true, ownershipCostPct: 0.005 },
  { name: 'Crimson Phantom S',       category: 'cars',        class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=600&q=80', description: 'The car people stop to photograph.', totalSupply: 10, referencePrice: 950000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Midnight Racer X',        category: 'cars',        class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80', description: 'Weekend track weapon.', totalSupply: 200, referencePrice: 180000, hasOwnershipCost: true, ownershipCostPct: 0 },
  { name: 'Silver Arrow Roadster',   category: 'cars',        class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&q=80', description: 'Classic lines, modern soul.', totalSupply: 1000, referencePrice: 32000 },

  // Yachts — Elite
  { name: 'Ocean Glass Villa',       category: 'yachts',      class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80', description: '45m superyacht. Full-length pool deck.', totalSupply: 50, referencePrice: 620000, hasOwnershipCost: true, ownershipCostPct: 0.005 },
  { name: 'Nordic Drifter',          category: 'yachts',      class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1581872151-9d5c0f71a91e?w=600&q=80', description: 'Explorer yacht. Built for 6-month voyages.', totalSupply: 10, referencePrice: 880000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Weekend Sailor',          category: 'yachts',      class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', description: 'Sleek 28m day sailor.', totalSupply: 250, referencePrice: 140000, hasOwnershipCost: true, ownershipCostPct: 0.005 },

  // Watches — Elite
  { name: 'Obsidian Panther Watch',  category: 'watches',     class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80', description: 'In-house movement. 500 jewels.', totalSupply: 50, referencePrice: 380000 },
  { name: 'Gold Skeleton Tourbillon',category: 'watches',     class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80', description: 'Visible tourbillon. 18k gold case.', totalSupply: 10, referencePrice: 920000 },
  { name: 'Titanium Sport Pro',      category: 'watches',     class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=600&q=80', description: 'Precision engineering. Everyday wearable.', totalSupply: 250, referencePrice: 95000 },
  { name: 'Classic Field Watch',     category: 'watches',     class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600&q=80', description: 'Military heritage. Solid Swiss movement.', totalSupply: 1000, referencePrice: 18000 },

  // Art — Elite
  { name: 'Neon Void #12',          category: 'art',         class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80', description: 'Large-format neon installation.', totalSupply: 50, referencePrice: 290000 },
  { name: 'The Last Collector',      category: 'art',         class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=600&q=80', description: 'Mixed media. One of one.', totalSupply: 1, referencePrice: 1200000 },
  { name: 'Blue Period Study',       category: 'art',         class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80', description: 'Oil on linen. Emotionally devastating.', totalSupply: 250, referencePrice: 75000 },
  { name: 'Urban Sketch #44',       category: 'art',         class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&q=80', description: 'Giclee print. Limited run.', totalSupply: 1000, referencePrice: 8500 },

  // Fashion — Premium
  { name: 'Onyx Leather Jacket',     category: 'fashion',     class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', description: 'Full-grain calf leather. Custom lining.', totalSupply: 50, referencePrice: 260000 },
  { name: 'Platinum Cashmere Set',   category: 'fashion',     class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80', description: 'Grade-A Mongolian cashmere.', totalSupply: 250, referencePrice: 110000 },

  // Jets
  { name: 'SkyArrow G700',           category: 'jets',        class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&q=80', description: 'Ultra-long range. 18 passengers.', totalSupply: 10, referencePrice: 990000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Citation Series V',       category: 'jets',        class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80', description: 'Light jet. Perfect for weekend hops.', totalSupply: 50, referencePrice: 480000, hasOwnershipCost: true, ownershipCostPct: 0.005 },

  // Mansions
  { name: 'Malibu Clifftop Estate',  category: 'mansions',    class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', description: 'Ocean views. Infinity pool. Private beach.', totalSupply: 10, referencePrice: 980000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Tokyo Penthouse',         category: 'mansions',    class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80', description: 'Sky-high. Mt Fuji views.', totalSupply: 50, referencePrice: 550000, hasOwnershipCost: true, ownershipCostPct: 0.005 },
  { name: 'Toscana Stone Villa',     category: 'mansions',    class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80', description: 'Vineyard estate. 12 bedrooms.', totalSupply: 250, referencePrice: 220000, hasOwnershipCost: true, ownershipCostPct: 0.005 },

  // Collectibles
  { name: 'Genesis Sneaker #001',    category: 'collectibles', class: 'elite',    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', description: 'First colourway. Never worn.', totalSupply: 50, referencePrice: 310000 },
  { name: 'Holographic Trading Card',category: 'collectibles', class: 'premium',  imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&q=80', description: 'Ultra-rare misprint.', totalSupply: 250, referencePrice: 85000 },
  { name: 'Vintage Poster Original', category: 'collectibles', class: 'essential',imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80', description: '1972 lithograph. Mint condition.', totalSupply: 1000, referencePrice: 12000 },

  // Businesses
  { name: 'Midnight Café Chain',     category: 'businesses',  class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', description: '12 locations. Profitable and growing.', totalSupply: 250, referencePrice: 190000 },
  { name: 'Rooftop Hotel Portfolio', category: 'businesses',  class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', description: '5 boutique hotels. 92% occupancy avg.', totalSupply: 50, referencePrice: 650000, hasOwnershipCost: true, ownershipCostPct: 0 },
]

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-seed-key')
  if (key !== process.env.SEED_KEY) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const existing = await prisma.item.count()
    if (existing > 0) return NextResponse.json({ error: 'Already seeded' }, { status: 400 })

    for (const item of ITEMS) {
      const created = await prisma.item.create({
        data: {
          name:             item.name,
          description:      item.description,
          category:         item.category,
          class:            item.class,
          imageUrl:         item.imageUrl,
          totalSupply:      item.totalSupply,
          referencePrice:   item.referencePrice,
          hasOwnershipCost: item.hasOwnershipCost ?? false,
          ownershipCostPct: item.ownershipCostPct ?? null,
          isOfficial:       true,
          isApproved:       true,
        },
      })
      const edCount = Math.min(item.totalSupply, item.class === 'grail' ? 10 : item.class === 'elite' ? 5 : 3)
      for (let i = 1; i <= edCount; i++) {
        await prisma.itemEdition.create({
          data: { itemId: created.id, editionNumber: i },
        })
      }
    }

    return NextResponse.json({ ok: true, seeded: ITEMS.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
