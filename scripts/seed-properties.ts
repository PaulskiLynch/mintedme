import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { PROPERTY_TIER_DEFS, type PropertyTier } from '../src/lib/property'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })


const prisma = new PrismaClient({ adapter })

function imgPath(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `/items/property/${slug}.png`
}

const PROPERTIES: Array<{
  name: string
  propertyTier: PropertyTier
  benchmarkPrice: number
  totalSupply: number
}> = [
  // ── Rent-Free (collectible shame tier — 3 editions each, ~1 per 100 players) ──
  { name: 'Wooden Shack',              propertyTier: 'rent_free', benchmarkPrice: 250,        totalSupply: 3 },
  { name: 'One-Man Tent',              propertyTier: 'rent_free', benchmarkPrice: 500,        totalSupply: 3 },
  { name: 'Hammock Between Two Trees', propertyTier: 'rent_free', benchmarkPrice: 1000,       totalSupply: 3 },
  { name: 'Two-Man Caravan',           propertyTier: 'rent_free', benchmarkPrice: 3000,       totalSupply: 3 },
  { name: 'Converted Outhouse',        propertyTier: 'rent_free', benchmarkPrice: 8000,       totalSupply: 3 },

  // ── Apartments — Common — 6 editions each (120 total per 1k players) ─────────
  { name: 'Metro Starter Loft',        propertyTier: 'apartment', benchmarkPrice: 75000,      totalSupply: 6 },
  { name: 'Skyline Micro Suite',       propertyTier: 'apartment', benchmarkPrice: 85000,      totalSupply: 6 },
  { name: 'Urban Glass Flat',          propertyTier: 'apartment', benchmarkPrice: 95000,      totalSupply: 6 },
  { name: 'Corner City Studio',        propertyTier: 'apartment', benchmarkPrice: 105000,     totalSupply: 6 },
  { name: 'Riverside Starter Apartment', propertyTier: 'apartment', benchmarkPrice: 115000,   totalSupply: 6 },
  { name: 'Bronze Window Loft',        propertyTier: 'apartment', benchmarkPrice: 125000,     totalSupply: 6 },
  { name: 'Midnight City Flat',        propertyTier: 'apartment', benchmarkPrice: 135000,     totalSupply: 6 },
  { name: 'Harbor View Studio',        propertyTier: 'apartment', benchmarkPrice: 145000,     totalSupply: 6 },
  { name: 'Crownline Apartment',       propertyTier: 'apartment', benchmarkPrice: 155000,     totalSupply: 6 },
  { name: 'Westside Starter Loft',     propertyTier: 'apartment', benchmarkPrice: 165000,     totalSupply: 6 },
  { name: 'Glassbox City Suite',       propertyTier: 'apartment', benchmarkPrice: 175000,     totalSupply: 6 },
  { name: 'Parkline Studio Flat',      propertyTier: 'apartment', benchmarkPrice: 185000,     totalSupply: 6 },
  { name: 'Noir Balcony Apartment',    propertyTier: 'apartment', benchmarkPrice: 195000,     totalSupply: 6 },
  { name: 'Goldline Micro Loft',       propertyTier: 'apartment', benchmarkPrice: 205000,     totalSupply: 6 },
  { name: 'District One Flat',         propertyTier: 'apartment', benchmarkPrice: 215000,     totalSupply: 6 },
  { name: 'Cloudview Studio',          propertyTier: 'apartment', benchmarkPrice: 225000,     totalSupply: 6 },
  { name: 'Bricklane Starter Loft',    propertyTier: 'apartment', benchmarkPrice: 230000,     totalSupply: 6 },
  { name: 'Velvet City Apartment',     propertyTier: 'apartment', benchmarkPrice: 235000,     totalSupply: 6 },
  { name: 'Obsidian Studio Flat',      propertyTier: 'apartment', benchmarkPrice: 240000,     totalSupply: 6 },
  { name: 'Northbank Micro Suite',     propertyTier: 'apartment', benchmarkPrice: 250000,     totalSupply: 6 },

  // ── Townhouses — Premium — 4 editions each (60 total per 1k players) ─────────
  { name: 'Ashford Row House',         propertyTier: 'townhouse', benchmarkPrice: 250000,     totalSupply: 4 },
  { name: 'Marblegate Townhouse',      propertyTier: 'townhouse', benchmarkPrice: 285000,     totalSupply: 4 },
  { name: 'Westbridge Terrace',        propertyTier: 'townhouse', benchmarkPrice: 320000,     totalSupply: 4 },
  { name: 'Bronzehaven Row',           propertyTier: 'townhouse', benchmarkPrice: 355000,     totalSupply: 4 },
  { name: 'Kensington Noir House',     propertyTier: 'townhouse', benchmarkPrice: 390000,     totalSupply: 4 },
  { name: 'Goldcrest Townhome',        propertyTier: 'townhouse', benchmarkPrice: 425000,     totalSupply: 4 },
  { name: 'Parkstone Terrace',         propertyTier: 'townhouse', benchmarkPrice: 460000,     totalSupply: 4 },
  { name: 'Elmhurst City House',       propertyTier: 'townhouse', benchmarkPrice: 495000,     totalSupply: 4 },
  { name: 'Velvet Row Residence',      propertyTier: 'townhouse', benchmarkPrice: 530000,     totalSupply: 4 },
  { name: 'Northgate Townhouse',       propertyTier: 'townhouse', benchmarkPrice: 565000,     totalSupply: 4 },
  { name: 'Crownfield Terrace',        propertyTier: 'townhouse', benchmarkPrice: 600000,     totalSupply: 4 },
  { name: 'Obsidian Row House',        propertyTier: 'townhouse', benchmarkPrice: 635000,     totalSupply: 4 },
  { name: 'Sterling Lane Residence',   propertyTier: 'townhouse', benchmarkPrice: 670000,     totalSupply: 4 },
  { name: 'Regent Glass Townhome',     propertyTier: 'townhouse', benchmarkPrice: 710000,     totalSupply: 4 },
  { name: 'Blackstone Heritage House', propertyTier: 'townhouse', benchmarkPrice: 750000,     totalSupply: 4 },

  // ── Villas — Rare — 3 editions each (30 total per 1k players) ────────────────
  { name: 'Azure Coast Villa',         propertyTier: 'villa',     benchmarkPrice: 750000,     totalSupply: 3 },
  { name: 'Marbella Sunset Estate',    propertyTier: 'villa',     benchmarkPrice: 900000,     totalSupply: 3 },
  { name: 'Palmcrest Luxury Villa',    propertyTier: 'villa',     benchmarkPrice: 1050000,    totalSupply: 3 },
  { name: 'Riviera Glass Villa',       propertyTier: 'villa',     benchmarkPrice: 1200000,    totalSupply: 3 },
  { name: 'Golden Dune Retreat',       propertyTier: 'villa',     benchmarkPrice: 1350000,    totalSupply: 3 },
  { name: 'Oceanview Horizon Villa',   propertyTier: 'villa',     benchmarkPrice: 1500000,    totalSupply: 3 },
  { name: 'Silver Palm Residence',     propertyTier: 'villa',     benchmarkPrice: 1700000,    totalSupply: 3 },
  { name: 'Amalfi Noir Villa',         propertyTier: 'villa',     benchmarkPrice: 1900000,    totalSupply: 3 },
  { name: 'Obsidian Cliff Villa',      propertyTier: 'villa',     benchmarkPrice: 2200000,    totalSupply: 3 },
  { name: 'Crown Coast Estate',        propertyTier: 'villa',     benchmarkPrice: 2500000,    totalSupply: 3 },

  // ── Mansions — Exotic — 2 editions each (10 total per 1k players) ────────────
  { name: 'Blackwood Grand Estate',    propertyTier: 'mansion',   benchmarkPrice: 2500000,    totalSupply: 2 },
  { name: 'Crownridge Mansion',        propertyTier: 'mansion',   benchmarkPrice: 4250000,    totalSupply: 2 },
  { name: 'Sterling Gate Manor',       propertyTier: 'mansion',   benchmarkPrice: 6000000,    totalSupply: 2 },
  { name: 'Obsidian Hills Estate',     propertyTier: 'mansion',   benchmarkPrice: 8000000,    totalSupply: 2 },
  { name: 'Monarch Palace Residence',  propertyTier: 'mansion',   benchmarkPrice: 10000000,   totalSupply: 2 },

  // ── Penthouses — Legendary — 1 edition each (3 total per 1k players) ─────────
  { name: 'Skyline Crown Penthouse',   propertyTier: 'penthouse', benchmarkPrice: 5000000,    totalSupply: 1 },
  { name: 'Obsidian Tower Residence',  propertyTier: 'penthouse', benchmarkPrice: 12000000,   totalSupply: 1 },
  { name: 'Monarch Sky Palace',        propertyTier: 'penthouse', benchmarkPrice: 20000000,   totalSupply: 1 },

  // ── Private Island — Mythic — 1 edition (1 total per 1k players) ─────────────
  { name: 'Sovereign Atoll',           propertyTier: 'private_island', benchmarkPrice: 50000000, totalSupply: 1 },
]

async function main() {
  console.log(`Seeding ${PROPERTIES.length} property items…`)
  let created = 0
  let skipped = 0

  for (const p of PROPERTIES) {
    const exists = await prisma.item.findFirst({ where: { name: p.name } })
    if (exists) { skipped++; continue }

    const def = PROPERTY_TIER_DEFS[p.propertyTier]
    const minimumBid = Math.round(p.benchmarkPrice * 0.10)

    const item = await prisma.item.create({
      data: {
        name:            p.name,
        category:        'properties',
        rarityTier:      def.rarityTier,
        propertyTier:    p.propertyTier,
        benchmarkPrice:  p.benchmarkPrice,
        minimumBid,
        totalSupply:     p.totalSupply,
        imageUrl:        imgPath(p.name),
        isApproved:      true,
        itemStatus:      'active',
      },
    })

    // Seed edition #1 (unowned, ready for market)
    await prisma.itemEdition.create({
      data: { itemId: item.id, editionNumber: 1 },
    })

    console.log(`  ✓ ${p.name} (${def.label}, $${p.benchmarkPrice.toLocaleString()})`)
    created++
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already exist).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
