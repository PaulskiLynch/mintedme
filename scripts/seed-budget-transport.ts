import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function imgPath(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `/items/cars/${slug}.png`
}

const VEHICLES: Array<{
  name: string
  benchmarkPrice: number
  horsepower: number | null
  topSpeed: number
  zeroToHundred: string | null  // null = store as null in DB; only real seconds stored
  description: string           // the funny 0-100 caption
  rarityTier: string
  totalSupply: number
}> = [
  // Banger tier = 1-of-1 comedy collectibles
  { name: 'Rickshaw and Driver',          benchmarkPrice: 1500,  horsepower: 1,    topSpeed: 18,  zeroToHundred: null, description: '0–100 km/h: Eventually',              rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'RustBucket',                   benchmarkPrice: 2000,  horsepower: 47,   topSpeed: 62,  zeroToHundred: null, description: '0–100 km/h: Yes',                    rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Chassis Seat & Steering Wheel',benchmarkPrice: 750,   horsepower: null, topSpeed: 12,  zeroToHundred: null, description: '0–100 km/h: Hill required',           rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Wooden Box with Wheels',       benchmarkPrice: 300,   horsepower: null, topSpeed: 22,  zeroToHundred: null, description: '0–100 km/h: Depends on slope',        rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Oversized Kids Trike',         benchmarkPrice: 450,   horsepower: null, topSpeed: 9,   zeroToHundred: null, description: '0–100 km/h: Not happening',           rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Shopping Cart Cruiser',        benchmarkPrice: 120,   horsepower: null, topSpeed: 16,  zeroToHundred: null, description: '0–100 km/h: Only downhill',           rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Lawnmower Limo',               benchmarkPrice: 600,   horsepower: 6,    topSpeed: 11,  zeroToHundred: null, description: '0–100 km/h: Never',                  rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Sofa on Skateboards',          benchmarkPrice: 250,   horsepower: null, topSpeed: 28,  zeroToHundred: null, description: '0–100 km/h: Pray first',             rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Shopping Trolley GT',          benchmarkPrice: 180,   horsepower: null, topSpeed: 14,  zeroToHundred: null, description: '0–100 km/h: Security arrives first',  rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Cardboard Supercar Kit',       benchmarkPrice: 90,    horsepower: null, topSpeed: 0,   zeroToHundred: null, description: '0–100 km/h: In your dreams',          rarityTier: 'Banger',  totalSupply: 1 },
  { name: 'Oversized Kids Trike 2',       benchmarkPrice: 450,   horsepower: null, topSpeed: 9,   zeroToHundred: null, description: '0–100 km/h: Not happening',           rarityTier: 'Banger',  totalSupply: 1 },
  // Running Robot — real stats, small supply
  { name: 'Running Robot',                benchmarkPrice: 60000, horsepower: 65,   topSpeed: 130, zeroToHundred: '2.5', description: 'Electric · Self-propelled',           rarityTier: 'Common',  totalSupply: 5 },
]

async function main() {
  console.log(`Seeding ${VEHICLES.length} budget transport items…`)
  let created = 0
  let skipped = 0

  for (const v of VEHICLES) {
    const exists = await prisma.item.findFirst({ where: { name: v.name } })
    if (exists) { skipped++; console.log(`  — ${v.name} already exists`); continue }

    const item = await prisma.item.create({
      data: {
        name:           v.name,
        category:       'cars',
        rarityTier:     v.rarityTier,
        description:    v.description,
        benchmarkPrice: v.benchmarkPrice,
        minimumBid:     Math.round(v.benchmarkPrice * 0.10),
        totalSupply:    v.totalSupply,
        horsepower:     v.horsepower,
        topSpeed:       v.topSpeed,
        zeroToHundred:  v.zeroToHundred,
        imageUrl:       imgPath(v.name),
        isApproved:     true,
        itemStatus:     'active',
      },
    })

    await prisma.itemEdition.create({
      data: { itemId: item.id, editionNumber: 1 },
    })

    const priceStr = v.benchmarkPrice < 1000
      ? `$${v.benchmarkPrice}`
      : `$${v.benchmarkPrice.toLocaleString()}`
    console.log(`  ✓ ${v.name} (${v.rarityTier}, ${priceStr}) — ${v.description}`)
    created++
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already exist).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
