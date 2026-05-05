import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import bcrypt from 'bcryptjs'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

function rarityFor(benchmark: number): string {
  if (benchmark >= 10_000_000) return 'Mythic'
  if (benchmark >= 2_000_000)  return 'Legendary'
  if (benchmark >= 500_000)    return 'Exotic'
  if (benchmark >= 100_000)    return 'Rare'
  return 'Common'
}

function supplyFor(rarity: string): number {
  switch (rarity) {
    case 'Mythic':    return 1
    case 'Legendary': return 3
    case 'Exotic':    return 5
    case 'Rare':      return 7
    default:          return 10
  }
}

const CARS = [
  { name: 'Rosso Strada V12',     inspiration: 'Ferrari Testarossa',        benchmark: 125_000,     image: '/items/rosso-strada-v12.png' },
  { name: 'Silverback Apex Coupe',inspiration: 'Porsche 911 Turbo',         benchmark: 150_000,     image: '/items/silverback-apex-coupe.png' },
  { name: 'Inferno Wedge GT',     inspiration: 'Lamborghini Diablo',        benchmark: 215_000,     image: '/items/inferno-wedge-gt.png' },
  { name: 'Silver Arrow Gullwing',inspiration: 'Mercedes 300SL',            benchmark: 1_500_000,   image: '/items/silver-arrow-gullwing.png' },
  { name: 'Eclipse Hyperion',     inspiration: 'Bugatti Chiron',            benchmark: 2_250_000,   image: '/items/eclipse-hyperion.png' },
  { name: 'Crimson Ghost LM',     inspiration: 'Ferrari F40',               benchmark: 2_300_000,   image: '/items/crimson-ghost-lm.png' },
  { name: 'Neon Wedge Raptor',    inspiration: 'Lamborghini Countach',      benchmark: 500_000,     image: '/items/neon-wedge-raptor.png' },
  { name: 'Carrera Phantom RS',   inspiration: 'Porsche Carrera GT',        benchmark: 1_250_000,   image: '/items/carrera-phantom-rs.png' },
  { name: 'TriVector Falcon',     inspiration: 'McLaren F1',                benchmark: 17_000_000,  image: '/items/trivector-falcon.png' },
  { name: 'Emerald Spear Roadster',inspiration: 'Jaguar E-Type',            benchmark: 90_000,      image: '/items/emerald-spear-roadster.png' },
  { name: 'Monarch Sterling GT',  inspiration: 'Aston Martin DB5',          benchmark: 550_000,     image: '/items/monarch-sterling-gt.png' },
  { name: 'Le Mans Shadow MK1',   inspiration: 'Ford GT40',                 benchmark: 4_500_000,   image: '/items/le-mans-shadow-mk1.png' },
  { name: 'Venom Coil Roadster',  inspiration: 'Shelby Cobra',              benchmark: 800_000,     image: '/items/venom-coil-roadster.png' },
  { name: 'Stingblade V8 Coupe',  inspiration: 'Corvette Stingray',         benchmark: 65_000,      image: '/items/stingblade-v8-coupe.png' },
  { name: 'Tokyo Storm Turbo',    inspiration: 'Toyota Supra MK4',          benchmark: 95_000,      image: '/items/tokyo-storm-turbo.png' },
  { name: 'Zenith Pulse GT',      inspiration: 'Acura NSX',                 benchmark: 75_000,      image: '/items/zenith-pulse-gt.png' },
  { name: 'Midnight Skyline R',   inspiration: 'Nissan Skyline GT-R',       benchmark: 90_000,      image: '/items/midnight-skyline-r.png' },
  { name: 'Rotary Flame Coupe',   inspiration: 'Mazda RX-7',                benchmark: 45_000,      image: '/items/rotary-flame-coupe.png' },
  { name: 'Copper Fang V10',      inspiration: 'Dodge Viper',               benchmark: 75_000,      image: null },
  { name: 'Bavaria Edge M1',      inspiration: 'BMW M1',                    benchmark: 400_000,     image: '/items/bavaria-edge-m1.png' },
  { name: 'Ghostline Sprint',     inspiration: 'Lotus Esprit',              benchmark: 55_000,      image: '/items/ghostline-sprint.png' },
  { name: 'Steel Time Coupe',     inspiration: 'DeLorean DMC-12',           benchmark: 45_000,      image: '/items/steel-time-coupe.png' },
  { name: 'Rosso Heritage 250',   inspiration: 'Ferrari 250 GTO',           benchmark: 35_000_000,  image: '/items/rosso-heritage-250.png' },
  { name: 'Atlantic Noir 57',     inspiration: 'Bugatti Type 57 Atlantic',  benchmark: 25_000_000,  image: '/items/atlantic-noir-57.png' },
  { name: 'Milano Scarlet 33',    inspiration: 'Alfa Romeo 33 Stradale',    benchmark: 7_500_000,   image: '/items/milano-scarlet-33.png' },
  { name: 'Bora Vento GT',        inspiration: 'Maserati Bora',             benchmark: 150_000,     image: '/items/bora-vento-gt.png' },
  { name: 'Strato Rally Hawk',    inspiration: 'Lancia Stratos',            benchmark: 450_000,     image: '/items/strato-rally-hawk.png' },
  { name: 'Aero King Daytona',    inspiration: 'Plymouth Superbird',        benchmark: 180_000,     image: '/items/aero-king-daytona.png' },
  { name: 'Nordic Apex RS',       inspiration: 'Koenigsegg Agera',          benchmark: 2_200_000,   image: null },
  { name: 'Tempestia V12',        inspiration: 'Pagani Zonda',              benchmark: 5_000_000,   image: '/items/tempestia-v12.png' },
]

async function main() {
  console.log('Seeding MilliBux cars...')

  // ── Demo users ────────────────────────────────────────────────────────────────
  const userDefs = [
    { username: 'velocityvince', tagline: 'Cars are freedom. Speed is wealth.', balance: 4_000_000, password: 'password123' },
    { username: 'luxelinda',     tagline: 'Only the finest. Always tasteful.',  balance: 3_500_000, password: 'password123' },
    { username: 'cryptokai',     tagline: 'Build income. Stack assets.',        balance: 5_000_000, password: 'password123' },
  ]

  const userIds: Record<string, string> = {}
  for (const u of userDefs) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } })
    if (existing) { userIds[u.username] = existing.id; console.log(`  ↳ @${u.username} exists`); continue }
    const hash = await bcrypt.hash(u.password, 10)
    const user = await prisma.user.create({
      data: { email: `${u.username}@demo.millibux.com`, username: u.username, passwordHash: hash, tagline: u.tagline, balance: u.balance, isEstablished: true },
    })
    userIds[u.username] = user.id
    console.log(`  ✓ @${u.username}`)
  }

  // ── Items ─────────────────────────────────────────────────────────────────────
  const itemIds: Record<string, string> = {}
  for (const car of CARS) {
    const rarity     = rarityFor(car.benchmark)
    const supply     = supplyFor(rarity)
    const minimumBid = Math.round(car.benchmark * 0.10)

    const existing = await prisma.item.findFirst({ where: { name: car.name } })
    if (existing) { itemIds[car.name] = existing.id; continue }

    const item = await prisma.item.create({
      data: {
        name:           car.name,
        inspirationName:car.inspiration,
        category:       'cars',
        rarityTier:     rarity,
        imageUrl:       car.image ?? undefined,
        totalSupply:    supply,
        benchmarkPrice: car.benchmark,
        minimumBid,
        isApproved:     true,
        itemStatus:     'active',
      },
    })
    itemIds[car.name] = item.id
  }
  console.log(`  ✓ ${CARS.length} cars seeded`)

  // ── Give each demo user 1–2 cars ──────────────────────────────────────────────
  const assignments: Array<{ car: string; owner: string; price: number }> = [
    { car: 'Rosso Strada V12',      owner: 'velocityvince', price: 130_000 },
    { car: 'Inferno Wedge GT',      owner: 'velocityvince', price: 220_000 },
    { car: 'Silver Arrow Gullwing', owner: 'luxelinda',     price: 1_600_000 },
    { car: 'Monarch Sterling GT',   owner: 'luxelinda',     price: 560_000 },
    { car: 'Tempestia V12',         owner: 'cryptokai',     price: 5_200_000 },
    { car: 'Le Mans Shadow MK1',    owner: 'cryptokai',     price: 4_800_000 },
  ]

  for (const a of assignments) {
    const itemId  = itemIds[a.car]
    const ownerId = userIds[a.owner]
    if (!itemId || !ownerId) continue

    const existing = await prisma.itemEdition.findFirst({ where: { itemId, editionNumber: 1 } })
    if (existing) continue

    await prisma.itemEdition.create({
      data: {
        itemId,
        editionNumber:  1,
        currentOwnerId: ownerId,
        lastSalePrice:  a.price,
        lastSaleDate:   new Date(Date.now() - 2 * 86400000),
      },
    })
  }
  console.log('  ✓ Demo ownership assigned')

  console.log('\nSeed complete.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
