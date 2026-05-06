import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { type AircraftType } from '../src/lib/aircraft'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function imgPath(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `/items/aircraft/${slug}.png`
}

const AIRCRAFT: Array<{
  name: string
  aircraftType: AircraftType
  rarityTier: string
  benchmarkPrice: number
  totalSupply: number
  description?: string
}> = [
  // ── Prop / Seaplane ──────────────────────────────────────────────
  { name: 'Pocket Prop Commuter', aircraftType: 'prop_plane',       rarityTier: 'Premium',   benchmarkPrice: 450000,    totalSupply: 7 },
  { name: 'Island Hopper',        aircraftType: 'seaplane',         rarityTier: 'Premium',   benchmarkPrice: 750000,    totalSupply: 7 },

  // ── Jets ─────────────────────────────────────────────────────────
  { name: 'Silver Finch AirTaxi',     aircraftType: 'light_jet',          rarityTier: 'Rare',      benchmarkPrice: 1200000,   totalSupply: 4 },
  { name: 'Cloudline Executive Jet',  aircraftType: 'private_jet',        rarityTier: 'Rare',      benchmarkPrice: 2500000,   totalSupply: 4 },
  { name: 'Velvet Wing 300',          aircraftType: 'private_jet_vip',    rarityTier: 'Exotic',    benchmarkPrice: 4000000,   totalSupply: 2 },
  { name: 'Monarch Sky Cruiser',      aircraftType: 'long_range_jet',     rarityTier: 'Exotic',    benchmarkPrice: 7500000,   totalSupply: 2 },
  { name: 'Obsidian Gulfstreamer',    aircraftType: 'ultra_lux_jet',      rarityTier: 'Legendary', benchmarkPrice: 12000000,  totalSupply: 1 },
  { name: 'CrownAir Sovereign',       aircraftType: 'ultra_lux_flagship', rarityTier: 'Legendary', benchmarkPrice: 18000000,  totalSupply: 1 },
  { name: 'StratoPalace 900',         aircraftType: 'flying_mansion',     rarityTier: 'Mythic',    benchmarkPrice: 45000000,  totalSupply: 1 },
  { name: 'Sky Whale Cargo Luxe',     aircraftType: 'cargo_lux',          rarityTier: 'Mythic',    benchmarkPrice: 80000000,  totalSupply: 1 },

  // ── Helicopters ──────────────────────────────────────────────────
  { name: 'Golden Rotor VIP', aircraftType: 'helicopter',     rarityTier: 'Rare',      benchmarkPrice: 1800000,   totalSupply: 4 },
  { name: 'Midnight Helix',   aircraftType: 'helicopter_vip', rarityTier: 'Exotic',    benchmarkPrice: 3200000,   totalSupply: 2 },

  // ── Novelty / Budget ─────────────────────────────────────────────
  { name: 'Jetpack Disaster Unit',    aircraftType: 'budget_aircraft',  rarityTier: 'Common',    benchmarkPrice: 35000,     totalSupply: 10, description: 'Fly responsibly. Or don\'t.' },
  { name: 'Luxury Hot Air Balloon',   aircraftType: 'novelty_aircraft', rarityTier: 'Common',    benchmarkPrice: 80000,     totalSupply: 10, description: 'Nowhere fast, in style.' },
  { name: 'Billionaire Blimp',        aircraftType: 'blimp',            rarityTier: 'Legendary', benchmarkPrice: 9000000,   totalSupply: 1,  description: 'Because jets are for people with taste.' },

  // ── Crazy Private Flight Assets ──────────────────────────────────
  { name: 'Desk Fan Jetpack',                aircraftType: 'crazy_jetpack',   rarityTier: 'Rare', benchmarkPrice: 12000,  totalSupply: 4, description: '0–100 km/h: Certain Regret' },
  { name: 'Pigeon-Powered Cardboard Wings',  aircraftType: 'crazy_wings',     rarityTier: 'Rare', benchmarkPrice: 8000,   totalSupply: 4, description: '0–100 km/h: Questionable' },
  { name: 'Office Chair Paraglider',         aircraftType: 'crazy_paraglider',rarityTier: 'Rare', benchmarkPrice: 15000,  totalSupply: 4, description: '0–100 km/h: HR Violation' },
  { name: 'Leaf Blower Hover Throne',        aircraftType: 'crazy_throne',    rarityTier: 'Rare', benchmarkPrice: 22000,  totalSupply: 4, description: '0–100 km/h: Loudly Unsafe' },
]

async function main() {
  console.log(`Seeding ${AIRCRAFT.length} aircraft items…`)
  let created = 0
  let skipped = 0

  for (const a of AIRCRAFT) {
    const exists = await prisma.item.findFirst({ where: { name: a.name } })
    if (exists) { skipped++; console.log(`  — ${a.name} already exists`); continue }

    const item = await prisma.item.create({
      data: {
        name:           a.name,
        category:       'aircraft',
        rarityTier:     a.rarityTier,
        aircraftType:   a.aircraftType,
        description:    a.description ?? null,
        benchmarkPrice: a.benchmarkPrice,
        minimumBid:     Math.round(a.benchmarkPrice * 0.10),
        totalSupply:    a.totalSupply,
        imageUrl:       imgPath(a.name),
        isApproved:     true,
        itemStatus:     'active',
      },
    })

    await prisma.itemEdition.create({
      data: { itemId: item.id, editionNumber: 1 },
    })

    console.log(`  ✓ ${a.name} (${a.rarityTier}, $${a.benchmarkPrice.toLocaleString()})`)
    created++
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already exist).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
