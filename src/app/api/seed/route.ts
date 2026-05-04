import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Supply by class: unique=1, grail=10, elite=100, premium=1000, essential=10000
const SUPPLY: Record<string, number> = { unique: 1, grail: 10, elite: 100, premium: 1000, essential: 10000 }
// Editions minted upfront (rest available on demand)
const MINT: Record<string, number>   = { unique: 1, grail: 5,  elite: 10,  premium: 10,   essential: 10   }

const ITEMS = [
  // Cars
  { name: 'Obsidian GT Coupé',       category: 'cars',         class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80',  description: 'Matte black. Zero compromises.',              referencePrice: 420000, hasOwnershipCost: true, ownershipCostPct: 0.005 },
  { name: 'Crimson Phantom S',        category: 'cars',         class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=600&q=80',  description: 'The car people stop to photograph.',           referencePrice: 950000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Midnight Racer X',         category: 'cars',         class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80',  description: 'Weekend track weapon.',                        referencePrice: 180000, hasOwnershipCost: true },
  { name: 'Silver Arrow Roadster',    category: 'cars',         class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&q=80',  description: 'Classic lines, modern soul.',                  referencePrice:  32000 },
  { name: 'The One',                  category: 'cars',         class: 'unique',    imageUrl: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=600&q=80',  description: 'One car. One owner. Forever.',                 referencePrice: 999000, hasOwnershipCost: true, ownershipCostPct: 0.02 },

  // Yachts
  { name: 'Ocean Glass Villa',        category: 'yachts',       class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80',  description: '45m superyacht. Full-length pool deck.',       referencePrice: 620000, hasOwnershipCost: true, ownershipCostPct: 0.005 },
  { name: 'Nordic Drifter',           category: 'yachts',       class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1581872151-9d5c0f71a91e?w=600&q=80',  description: 'Explorer yacht. Built for 6-month voyages.',   referencePrice: 880000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Weekend Sailor',           category: 'yachts',       class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',  description: 'Sleek 28m day sailor.',                        referencePrice: 140000, hasOwnershipCost: true },
  { name: 'Phantom of the Deep',      category: 'yachts',       class: 'unique',    imageUrl: 'https://images.unsplash.com/photo-1504885338222-98b6b5e4b026?w=600&q=80',  description: 'Custom submersible yacht. Truly one of one.',  referencePrice: 999000, hasOwnershipCost: true, ownershipCostPct: 0.02 },

  // Watches
  { name: 'Obsidian Panther',         category: 'watches',      class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',  description: 'In-house movement. 500 jewels.',               referencePrice: 380000 },
  { name: 'Gold Skeleton Tourbillon', category: 'watches',      class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80',  description: 'Visible tourbillon. 18k gold case.',           referencePrice: 920000 },
  { name: 'Titanium Sport Pro',       category: 'watches',      class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=600&q=80',  description: 'Precision engineering. Everyday wearable.',    referencePrice:  95000 },
  { name: 'Classic Field Watch',      category: 'watches',      class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600&q=80',  description: 'Military heritage. Solid Swiss movement.',     referencePrice:  18000 },

  // Art
  { name: 'Neon Void #12',           category: 'art',           class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80',  description: 'Large-format neon installation.',              referencePrice: 290000 },
  { name: 'The Last Collector',       category: 'art',           class: 'unique',    imageUrl: 'https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=600&q=80',  description: 'Mixed media. One of one.',                     referencePrice: 850000 },
  { name: 'Blue Period Study',        category: 'art',           class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80',  description: 'Oil on linen. Emotionally devastating.',       referencePrice:  75000 },
  { name: 'Urban Sketch #44',        category: 'art',           class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&q=80',  description: 'Giclee print. Limited run.',                   referencePrice:   8500 },

  // Fashion
  { name: 'Onyx Leather Jacket',      category: 'fashion',      class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',  description: 'Full-grain calf leather. Custom lining.',      referencePrice: 260000 },
  { name: 'Platinum Cashmere Set',    category: 'fashion',      class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',  description: 'Grade-A Mongolian cashmere.',                  referencePrice: 110000 },
  { name: 'Heritage Court Sneaker',   category: 'fashion',      class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',  description: 'Icon colourway. Timeless.',                    referencePrice:  22000 },

  // Jets
  { name: 'SkyArrow G700',            category: 'jets',         class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&q=80',  description: 'Ultra-long range. 18 passengers.',             referencePrice: 990000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Citation Series V',        category: 'jets',         class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',  description: 'Light jet. Perfect for weekend hops.',         referencePrice: 480000, hasOwnershipCost: true, ownershipCostPct: 0.005 },
  { name: 'Sovereign One',            category: 'jets',         class: 'unique',    imageUrl: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=600&q=80',  description: 'Custom widebody. Flying palace.',              referencePrice: 999000, hasOwnershipCost: true, ownershipCostPct: 0.02 },

  // Mansions
  { name: 'Malibu Clifftop Estate',   category: 'mansions',     class: 'grail',     imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',  description: 'Ocean views. Infinity pool. Private beach.',   referencePrice: 980000, hasOwnershipCost: true, ownershipCostPct: 0.015 },
  { name: 'Tokyo Penthouse',          category: 'mansions',     class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',  description: 'Sky-high. Mt Fuji views.',                     referencePrice: 550000, hasOwnershipCost: true, ownershipCostPct: 0.005 },
  { name: 'Toscana Stone Villa',      category: 'mansions',     class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80',  description: 'Vineyard estate. 12 bedrooms.',                referencePrice: 220000, hasOwnershipCost: true },
  { name: 'The Address',              category: 'mansions',     class: 'unique',    imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80',  description: 'The most prestigious address on earth.',       referencePrice: 999000, hasOwnershipCost: true, ownershipCostPct: 0.02 },

  // Collectibles
  { name: 'Genesis Sneaker #001',     category: 'collectibles', class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',  description: 'First colourway. Never worn.',                 referencePrice: 310000 },
  { name: 'Holographic Trading Card', category: 'collectibles', class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&q=80',  description: 'Ultra-rare misprint.',                         referencePrice:  85000 },
  { name: 'Vintage Poster Original',  category: 'collectibles', class: 'essential', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80',  description: '1972 lithograph. Mint condition.',             referencePrice:  12000 },

  // Businesses
  { name: 'Midnight Café Chain',      category: 'businesses',   class: 'premium',   imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80',  description: '12 locations. Profitable and growing.',        referencePrice: 190000 },
  { name: 'Rooftop Hotel Portfolio',  category: 'businesses',   class: 'elite',     imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',  description: '5 boutique hotels. 92% occupancy avg.',        referencePrice: 650000, hasOwnershipCost: true },
  { name: 'Global Media House',       category: 'businesses',   class: 'unique',    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',  description: 'One owner. One empire.',                       referencePrice: 999000, hasOwnershipCost: true, ownershipCostPct: 0.01 },
]

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-seed-key')
  if (key !== process.env.SEED_KEY) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { reset } = await req.json().catch(() => ({ reset: false }))

  try {
    if (reset) {
      // Clear in dependency order
      await prisma.feedEvent.deleteMany()
      await prisma.notification.deleteMany()
      await prisma.priceHistory.deleteMany()
      await prisma.ownership.deleteMany()
      await prisma.bid.deleteMany()
      await prisma.auction.deleteMany()
      await prisma.offer.deleteMany()
      await prisma.transaction.deleteMany()
      await prisma.itemEdition.deleteMany()
      await prisma.item.deleteMany()
    } else {
      const existing = await prisma.item.count()
      if (existing > 0) return NextResponse.json({ error: 'Already seeded — pass reset:true to wipe and re-seed' }, { status: 400 })
    }

    for (const item of ITEMS) {
      const supply = SUPPLY[item.class] ?? 100
      const mint   = MINT[item.class]   ?? 5
      const created = await prisma.item.create({
        data: {
          name:             item.name,
          description:      item.description,
          category:         item.category,
          class:            item.class,
          imageUrl:         item.imageUrl,
          totalSupply:      supply,
          referencePrice:   item.referencePrice,
          hasOwnershipCost: item.hasOwnershipCost ?? false,
          ownershipCostPct: item.ownershipCostPct ?? null,
          isOfficial:       true,
          isApproved:       true,
        },
      })
      const edCount = Math.min(supply, mint)
      for (let i = 1; i <= edCount; i++) {
        await prisma.itemEdition.create({ data: { itemId: created.id, editionNumber: i } })
      }
    }

    return NextResponse.json({ ok: true, seeded: ITEMS.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
