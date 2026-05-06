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

const CARS: Array<{
  name: string
  benchmarkPrice: number
  horsepower: number
  topSpeed: number
  zeroToHundred: string
  rarityTier: string
  totalSupply: number
}> = [
  { name: 'Eldorado Sovereign',     benchmarkPrice: 175000,   horsepower: 682,  topSpeed: 320, zeroToHundred: '3.6', rarityTier: 'Common',    totalSupply: 10 },
  { name: 'Ion Seven Executive',    benchmarkPrice: 180000,   horsepower: 650,  topSpeed: 250, zeroToHundred: '3.7', rarityTier: 'Common',    totalSupply: 10 },
  { name: 'Ion Sprint Turbo',       benchmarkPrice: 185000,   horsepower: 750,  topSpeed: 260, zeroToHundred: '2.8', rarityTier: 'Common',    totalSupply: 10 },
  { name: 'Imperial Noir Mayfair',  benchmarkPrice: 250000,   horsepower: 621,  topSpeed: 250, zeroToHundred: '4.5', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Aurora Vector GT',       benchmarkPrice: 250000,   horsepower: 671,  topSpeed: 330, zeroToHundred: '3.0', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Silverback Track RS',    benchmarkPrice: 275000,   horsepower: 518,  topSpeed: 296, zeroToHundred: '3.2', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Stormfang Coupe',        benchmarkPrice: 275000,   horsepower: 631,  topSpeed: 325, zeroToHundred: '3.2', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Falcon Crest Saloon',    benchmarkPrice: 275000,   horsepower: 626,  topSpeed: 333, zeroToHundred: '3.8', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Silver Ghost Regent',    benchmarkPrice: 300000,   horsepower: 563,  topSpeed: 250, zeroToHundred: '4.8', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Sterling Vantage Royale',benchmarkPrice: 300000,   horsepower: 715,  topSpeed: 340, zeroToHundred: '3.4', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Maranello Pulse GT',     benchmarkPrice: 325000,   horsepower: 819,  topSpeed: 330, zeroToHundred: '2.9', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Monarch Phantom Luxe',   benchmarkPrice: 350000,   horsepower: 563,  topSpeed: 250, zeroToHundred: '5.3', rarityTier: 'Premium',   totalSupply: 7  },
  { name: 'Velocity Seven RS',      benchmarkPrice: 400000,   horsepower: 755,  topSpeed: 330, zeroToHundred: '2.8', rarityTier: 'Rare',      totalSupply: 4  },
  { name: 'Inferno Apex SV',        benchmarkPrice: 525000,   horsepower: 759,  topSpeed: 350, zeroToHundred: '2.8', rarityTier: 'Rare',      totalSupply: 4  },
  { name: 'Rosso Strada Hybrid',    benchmarkPrice: 575000,   horsepower: 986,  topSpeed: 340, zeroToHundred: '2.5', rarityTier: 'Rare',      totalSupply: 4  },
  { name: 'Tempest Bull V12',       benchmarkPrice: 600000,   horsepower: 1001, topSpeed: 350, zeroToHundred: '2.5', rarityTier: 'Rare',      totalSupply: 4  },
  { name: 'Valenhall Apex',         benchmarkPrice: 900000,   horsepower: 998,  topSpeed: 350, zeroToHundred: '2.5', rarityTier: 'Exotic',    totalSupply: 2  },
  { name: 'Windspire Hyper GT',     benchmarkPrice: 1600000,  horsepower: 791,  topSpeed: 383, zeroToHundred: '3.2', rarityTier: 'Exotic',    totalSupply: 2  },
  { name: 'Regal Storm RS',         benchmarkPrice: 2100000,  horsepower: 1500, topSpeed: 410, zeroToHundred: '2.8', rarityTier: 'Legendary', totalSupply: 1  },
  { name: 'Valkyr Shadow X',        benchmarkPrice: 2500000,  horsepower: 1160, topSpeed: 355, zeroToHundred: '2.5', rarityTier: 'Legendary', totalSupply: 1  },
  { name: 'Nordic Fury Absolut',    benchmarkPrice: 3000000,  horsepower: 1600, topSpeed: 480, zeroToHundred: '2.5', rarityTier: 'Mythic',    totalSupply: 1  },
  { name: 'Chrono Hyperion',        benchmarkPrice: 3800000,  horsepower: 1775, topSpeed: 445, zeroToHundred: '2.0', rarityTier: 'Mythic',    totalSupply: 1  },
]

async function main() {
  console.log(`Seeding ${CARS.length} car items…`)
  let created = 0
  let skipped = 0

  for (const car of CARS) {
    const exists = await prisma.item.findFirst({ where: { name: car.name } })
    if (exists) { skipped++; console.log(`  — ${car.name} already exists`); continue }

    const item = await prisma.item.create({
      data: {
        name:           car.name,
        category:       'cars',
        rarityTier:     car.rarityTier,
        benchmarkPrice: car.benchmarkPrice,
        minimumBid:     Math.round(car.benchmarkPrice * 0.10),
        totalSupply:    car.totalSupply,
        horsepower:     car.horsepower,
        topSpeed:       car.topSpeed,
        zeroToHundred:  car.zeroToHundred,
        imageUrl:       imgPath(car.name),
        isApproved:     true,
        itemStatus:     'active',
      },
    })

    await prisma.itemEdition.create({
      data: { itemId: item.id, editionNumber: 1 },
    })

    console.log(`  ✓ ${car.name} (${car.rarityTier}, $${car.benchmarkPrice.toLocaleString()}, ${car.horsepower}hp)`)
    created++
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already exist).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
