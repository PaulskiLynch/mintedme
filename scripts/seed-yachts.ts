import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { type YachtType } from '../src/lib/yachts'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function imgPath(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `/items/yachts/${slug}.png`
}

const YACHTS: Array<{
  name:        string
  yachtType:   YachtType
  rarityTier:  string
  benchmarkPrice: number
  totalSupply: number
  horsepower:  number
  topSpeed:    number
  zeroToHundred?: number
  description?: string
}> = [
  // ── Rare ─────────────────────────────────────────────────────────────
  {
    name: 'CrownWave 88', yachtType: 'luxury_yacht', rarityTier: 'Rare',
    benchmarkPrice: 2_500_000, totalSupply: 4, horsepower: 3200, topSpeed: 58,
    description: '0–100 km/h: Eventually.',
  },
  {
    name: 'Azure Monarch', yachtType: 'luxury_yacht', rarityTier: 'Rare',
    benchmarkPrice: 3_200_000, totalSupply: 4, horsepower: 4000, topSpeed: 65,
    zeroToHundred: 18.0,
  },

  // ── Exotic ───────────────────────────────────────────────────────────
  {
    name: 'Velvet Harbor 120', yachtType: 'superyacht', rarityTier: 'Exotic',
    benchmarkPrice: 6_500_000, totalSupply: 2, horsepower: 6500, topSpeed: 72,
    zeroToHundred: 15.5,
  },
  {
    name: 'Obsidian Tide', yachtType: 'superyacht', rarityTier: 'Exotic',
    benchmarkPrice: 9_000_000, totalSupply: 2, horsepower: 8200, topSpeed: 80,
    zeroToHundred: 13.0,
  },

  // ── Legendary ────────────────────────────────────────────────────────
  {
    name: 'Goldwake Sovereign', yachtType: 'mega_yacht', rarityTier: 'Legendary',
    benchmarkPrice: 18_000_000, totalSupply: 1, horsepower: 12000, topSpeed: 92,
    zeroToHundred: 11.5,
  },
  {
    name: 'Black Pearl Palace', yachtType: 'mega_yacht', rarityTier: 'Legendary',
    benchmarkPrice: 32_000_000, totalSupply: 1, horsepower: 16000, topSpeed: 105,
    zeroToHundred: 10.2,
  },

  // ── Mythic ───────────────────────────────────────────────────────────
  {
    name: 'StratoSea Mansion', yachtType: 'floating_mansion', rarityTier: 'Mythic',
    benchmarkPrice: 55_000_000, totalSupply: 1, horsepower: 22000, topSpeed: 120,
    zeroToHundred: 9.8,
  },
  {
    name: 'Island King Voyager', yachtType: 'private_island_yacht', rarityTier: 'Mythic',
    benchmarkPrice: 95_000_000, totalSupply: 1, horsepower: 28000, topSpeed: 135,
    zeroToHundred: 9.0,
  },

  // ── Premium ──────────────────────────────────────────────────────────
  {
    name: 'Mini Marina Cruiser', yachtType: 'small_yacht', rarityTier: 'Premium',
    benchmarkPrice: 650_000, totalSupply: 7, horsepower: 1200, topSpeed: 42,
    description: '0–100 km/h: Maybe.',
  },
  {
    name: 'Weekend Wave Runner', yachtType: 'cabin_cruiser', rarityTier: 'Premium',
    benchmarkPrice: 350_000, totalSupply: 7, horsepower: 850, topSpeed: 36,
    description: '0–100 km/h: Bring Snacks.',
  },

  // ── Common ───────────────────────────────────────────────────────────
  {
    name: 'Inflatable CEO Dinghy', yachtType: 'budget_yacht', rarityTier: 'Common',
    benchmarkPrice: 8_000, totalSupply: 10, horsepower: 6, topSpeed: 11,
    description: '0–100 km/h: Strong Tailwind Required. Budget yachts have almost no upkeep, almost no prestige, and questionable buoyancy — but they technically count as yachts.',
  },
  {
    name: 'Paddleboard Penthouse', yachtType: 'budget_yacht', rarityTier: 'Common',
    benchmarkPrice: 3_500, totalSupply: 10, horsepower: 0, topSpeed: 7,
    description: '0–100 km/h: Paddle Faster. Budget yachts have almost no upkeep, almost no prestige, and questionable buoyancy — but they technically count as yachts.',
  },
  {
    name: 'Shopping Cart Pontoon', yachtType: 'junk_yacht', rarityTier: 'Common',
    benchmarkPrice: 1_200, totalSupply: 10, horsepower: 0, topSpeed: 4,
    description: '0–100 km/h: Coast Guard Interested.',
  },
  {
    name: 'Bathtub Buccaneer', yachtType: 'junk_yacht', rarityTier: 'Common',
    benchmarkPrice: 900, totalSupply: 10, horsepower: 0, topSpeed: 2,
    description: '0–100 km/h: Bathwater Overflow.',
  },
  {
    name: 'Door With A Sail', yachtType: 'survival_yacht', rarityTier: 'Common',
    benchmarkPrice: 150, totalSupply: 10, horsepower: 0, topSpeed: 6,
    description: '0–100 km/h: Depends on Weather.',
  },
]

async function main() {
  console.log(`Seeding ${YACHTS.length} yacht items…`)
  let created = 0
  let skipped = 0

  for (const y of YACHTS) {
    const exists = await prisma.item.findFirst({ where: { name: y.name } })
    if (exists) { skipped++; console.log(`  — ${y.name} already exists`); continue }

    const item = await prisma.item.create({
      data: {
        name:           y.name,
        category:       'yachts',
        rarityTier:     y.rarityTier,
        benchmarkPrice: y.benchmarkPrice,
        minimumBid:     Math.round(y.benchmarkPrice * 0.10),
        totalSupply:    y.totalSupply,
        horsepower:     y.horsepower || null,
        topSpeed:       y.topSpeed   || null,
        zeroToHundred:  y.zeroToHundred ?? null,
        yachtType:      y.yachtType,
        description:    y.description ?? null,
        imageUrl:       imgPath(y.name),
        isApproved:     true,
        itemStatus:     'active',
      },
    })

    await prisma.itemEdition.create({
      data: { itemId: item.id, editionNumber: 1 },
    })

    console.log(`  ✓ ${y.name} (${y.yachtType}, ${y.rarityTier}, $${y.benchmarkPrice.toLocaleString()})`)
    created++
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already exist).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
