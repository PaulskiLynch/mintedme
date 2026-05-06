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
  if (benchmark >= 65_000)     return 'Premium'
  return 'Common'
}

function supplyFor(rarity: string): number {
  switch (rarity) {
    case 'Custom':
    case 'Banger':    return 1
    case 'Mythic':    return 1
    case 'Legendary': return 3
    case 'Exotic':    return 5
    case 'Rare':      return 7
    case 'Premium':   return 8
    default:          return 10
  }
}

const CARS = [
  { name: 'Rosso Strada V12',      inspiration: 'Ferrari Testarossa',       benchmark: 125_000,    hp: 390,   topSpeed: 290, z100: 5.3,  image: '/items/rosso-strada-v12.png' },
  { name: 'Silverback Apex Coupe', inspiration: 'Porsche 911 Turbo',        benchmark: 150_000,    hp: 572,   topSpeed: 320, z100: 2.9,  image: '/items/silverback-apex-coupe.png' },
  { name: 'Inferno Wedge GT',      inspiration: 'Lamborghini Diablo',       benchmark: 215_000,    hp: 492,   topSpeed: 325, z100: 4.1,  image: '/items/inferno-wedge-gt.png' },
  { name: 'Silver Arrow Gullwing', inspiration: 'Mercedes 300SL',           benchmark: 1_500_000,  hp: 215,   topSpeed: 260, z100: 8.8,  image: '/items/silver-arrow-gullwing.png' },
  { name: 'Eclipse Hyperion',      inspiration: 'Bugatti Chiron',           benchmark: 2_250_000,  hp: 1479,  topSpeed: 420, z100: 2.4,  image: '/items/eclipse-hyperion.png' },
  { name: 'Crimson Ghost LM',      inspiration: 'Ferrari F40',              benchmark: 2_300_000,  hp: 471,   topSpeed: 324, z100: 3.8,  image: '/items/crimson-ghost-lm.png' },
  { name: 'Neon Wedge Raptor',     inspiration: 'Lamborghini Countach',     benchmark: 500_000,    hp: 455,   topSpeed: 295, z100: 4.7,  image: '/items/neon-wedge-raptor.png' },
  { name: 'Carrera Phantom RS',    inspiration: 'Porsche Carrera GT',       benchmark: 1_250_000,  hp: 603,   topSpeed: 330, z100: 3.6,  image: '/items/carrera-phantom-rs.png' },
  { name: 'TriVector Falcon',      inspiration: 'McLaren F1',               benchmark: 17_000_000, hp: 627,   topSpeed: 386, z100: 3.2,  image: '/items/trivector-falcon.png' },
  { name: 'Emerald Spear Roadster',inspiration: 'Jaguar E-Type',            benchmark: 90_000,     hp: 265,   topSpeed: 240, z100: 6.9,  image: '/items/emerald-spear-roadster.png' },
  { name: 'Monarch Sterling GT',   inspiration: 'Aston Martin DB5',         benchmark: 550_000,    hp: 282,   topSpeed: 230, z100: 7.1,  image: '/items/monarch-sterling-gt.png' },
  { name: 'Le Mans Shadow MK1',    inspiration: 'Ford GT40',                benchmark: 4_500_000,  hp: 485,   topSpeed: 330, z100: 4.3,  image: '/items/le-mans-shadow-mk1.png' },
  { name: 'Venom Coil Roadster',   inspiration: 'Shelby Cobra',             benchmark: 800_000,    hp: 425,   topSpeed: 266, z100: 4.2,  image: '/items/venom-coil-roadster.png' },
  { name: 'Stingblade V8 Coupe',   inspiration: 'Corvette Stingray',        benchmark: 65_000,     hp: 495,   topSpeed: 312, z100: 3.0,  image: '/items/stingblade-v8-coupe.png' },
  { name: 'Tokyo Storm Turbo',     inspiration: 'Toyota Supra MK4',         benchmark: 95_000,     hp: 320,   topSpeed: 285, z100: 4.9,  image: '/items/tokyo-storm-turbo.png' },
  { name: 'Zenith Pulse GT',       inspiration: 'Acura NSX',                benchmark: 75_000,     hp: 290,   topSpeed: 270, z100: 5.7,  image: '/items/zenith-pulse-gt.png' },
  { name: 'Midnight Skyline R',    inspiration: 'Nissan Skyline GT-R',      benchmark: 90_000,     hp: 276,   topSpeed: 250, z100: 5.6,  image: '/items/midnight-skyline-r.png' },
  { name: 'Rotary Flame Coupe',    inspiration: 'Mazda RX-7',               benchmark: 45_000,     hp: 276,   topSpeed: 250, z100: 5.3,  image: '/items/rotary-flame-coupe.png' },
  { name: 'Copper Fang V10',       inspiration: 'Dodge Viper',              benchmark: 75_000,     hp: 645,   topSpeed: 332, z100: 3.5,  image: null },
  { name: 'Bavaria Edge M1',       inspiration: 'BMW M1',                   benchmark: 400_000,    hp: 273,   topSpeed: 262, z100: 5.6,  image: '/items/bavaria-edge-m1.png' },
  { name: 'Ghostline Sprint',      inspiration: 'Lotus Esprit',             benchmark: 55_000,     hp: 350,   topSpeed: 282, z100: 4.7,  image: '/items/ghostline-sprint.png' },
  { name: 'Steel Time Coupe',      inspiration: 'DeLorean DMC-12',          benchmark: 45_000,     hp: 130,   topSpeed: 209, z100: 10.5, image: '/items/steel-time-coupe.png' },
  { name: 'Rosso Heritage 250',    inspiration: 'Ferrari 250 GTO',          benchmark: 35_000_000, hp: 296,   topSpeed: 280, z100: 5.4,  image: '/items/rosso-heritage-250.png' },
  { name: 'Atlantic Noir 57',      inspiration: 'Bugatti Type 57 Atlantic', benchmark: 25_000_000, hp: 200,   topSpeed: 200, z100: 10.0, image: '/items/atlantic-noir-57.png' },
  { name: 'Milano Scarlet 33',     inspiration: 'Alfa Romeo 33 Stradale',   benchmark: 7_500_000,  hp: 230,   topSpeed: 260, z100: 5.5,  image: '/items/milano-scarlet-33.png' },
  { name: 'Bora Vento GT',         inspiration: 'Maserati Bora',            benchmark: 150_000,    hp: 310,   topSpeed: 280, z100: 6.5,  image: '/items/bora-vento-gt.png' },
  { name: 'Strato Rally Hawk',     inspiration: 'Lancia Stratos',           benchmark: 450_000,    hp: 190,   topSpeed: 232, z100: 6.8,  image: '/items/strato-rally-hawk.png' },
  { name: 'Aero King Daytona',     inspiration: 'Plymouth Superbird',       benchmark: 180_000,    hp: 425,   topSpeed: 240, z100: 5.5,  image: '/items/aero-king-daytona.png' },
  { name: 'Nordic Apex RS',        inspiration: 'Koenigsegg Agera',         benchmark: 2_200_000,  hp: 1160,  topSpeed: 420, z100: 2.8,  image: null },
  { name: 'Tempestia V12',         inspiration: 'Pagani Zonda',             benchmark: 5_000_000,  hp: 740,   topSpeed: 355, z100: 3.1,  image: '/items/tempestia-v12.png' },
]

const BUSINESSES: Array<{
  name: string; businessType: string; businessRiskTier: string; benchmark: number; image: string | null
}> = [
  // Safe
  { name: 'Grind & Go Café Chain',      businessType: 'cafe_chain',             businessRiskTier: 'safe',     benchmark: 250_000,    image: '/items/biz-cafe-chain.png' },
  { name: 'IronCore Gym Group',         businessType: 'boutique_gym',           businessRiskTier: 'safe',     benchmark: 350_000,    image: '/items/biz-boutique-gym.png' },
  { name: 'ShineStar Car Wash Network', businessType: 'car_wash_network',       businessRiskTier: 'safe',     benchmark: 180_000,    image: '/items/biz-car-wash-network.png' },
  { name: 'LockBox Storage Portfolio',  businessType: 'storage_unit_portfolio', businessRiskTier: 'safe',     benchmark: 400_000,    image: '/items/biz-storage-unit-portfolio.png' },
  { name: 'VendVault Machine Route',    businessType: 'vending_machine_route',  businessRiskTier: 'safe',     benchmark: 120_000,    image: '/items/biz-vending-machine-route.png' },
  { name: 'StreetEats Truck Fleet',     businessType: 'food_truck_fleet',       businessRiskTier: 'safe',     benchmark: 200_000,    image: '/items/biz-food-truck-fleet.png' },
  { name: 'Blade & Brass Barber Lounge',businessType: 'luxury_barber_lounge',   businessRiskTier: 'safe',     benchmark: 300_000,    image: '/items/biz-luxury-barber-lounge.png' },
  // Growth
  { name: 'HeatWave Sneaker Store',     businessType: 'sneaker_resale_store',   businessRiskTier: 'growth',   benchmark: 500_000,    image: '/items/biz-sneaker-resale-store.png' },
  { name: 'The Vault Boutique Hotel',   businessType: 'boutique_hotel',         businessRiskTier: 'growth',   benchmark: 1_200_000,  image: '/items/biz-boutique-hotel.png' },
  { name: 'Skyline Rooftop Restaurant', businessType: 'rooftop_restaurant',     businessRiskTier: 'growth',   benchmark: 800_000,    image: '/items/biz-rooftop-restaurant.png' },
  { name: 'Neon District Nightclub',    businessType: 'nightclub_venue',        businessRiskTier: 'growth',   benchmark: 900_000,    image: '/items/biz-nightclub-venue.png' },
  { name: 'Black Shield Security Firm', businessType: 'private_security_firm',  businessRiskTier: 'growth',   benchmark: 650_000,    image: '/items/biz-private-security-firm.png' },
  { name: 'Pulse Digital Media Studio', businessType: 'digital_media_studio',   businessRiskTier: 'growth',   benchmark: 750_000,    image: '/items/biz-digital-media-studio.png' },
  { name: 'Apex Event Production Co.',  businessType: 'event_production_co',    businessRiskTier: 'growth',   benchmark: 600_000,    image: '/items/biz-event-production-co.png' },
  { name: 'Prestige Luxury Rental Agency',businessType:'luxury_rental_agency',  businessRiskTier: 'growth',   benchmark: 1_000_000,  image: '/items/biz-luxury-rental-agency.png' },
  // Risky
  { name: 'Apex Supercar Rental Club',  businessType: 'supercar_rental_club',   businessRiskTier: 'risky',    benchmark: 2_500_000,  image: '/items/biz-supercar-rental-club.png' },
  { name: 'GOLD CHAIN Music Label',     businessType: 'music_label',            businessRiskTier: 'risky',    benchmark: 3_000_000,  image: '/items/biz-music-label.png' },
  { name: 'Reel One Indie Film Studio', businessType: 'indie_film_studio',      businessRiskTier: 'risky',    benchmark: 1_800_000,  image: '/items/biz-indie-film-studio.png' },
  { name: 'MARQ Fashion Label',         businessType: 'fashion_label',          businessRiskTier: 'risky',    benchmark: 2_200_000,  image: '/items/biz-fashion-label.png' },
  { name: 'NovaSpark Tech Startup',     businessType: 'tech_startup',           businessRiskTier: 'risky',    benchmark: 4_000_000,  image: '/items/biz-tech-startup.png' },
  { name: 'Vortex Esports Team',        businessType: 'esports_team',           businessRiskTier: 'risky',    benchmark: 1_500_000,  image: '/items/biz-esports-team.png' },
  { name: 'Cipher Crypto Trading Desk', businessType: 'crypto_trading_desk',    businessRiskTier: 'risky',    benchmark: 5_000_000,  image: '/items/biz-crypto-trading-desk.png' },
  { name: 'Starmaker Talent Agency',    businessType: 'talent_mgmt_agency',     businessRiskTier: 'risky',    benchmark: 2_000_000,  image: '/items/biz-talent-mgmt-agency.png' },
  // Prestige
  { name: 'The Meridian Art Gallery',   businessType: 'art_gallery',            businessRiskTier: 'prestige', benchmark: 6_000_000,  image: '/items/biz-art-gallery.png' },
  { name: 'Calibre Watch Boutique',     businessType: 'luxury_watch_boutique',  businessRiskTier: 'prestige', benchmark: 8_000_000,  image: '/items/biz-luxury-watch-boutique.png' },
  { name: 'The Obsidian Members Club',  businessType: 'private_members_club',   businessRiskTier: 'prestige', benchmark: 12_000_000, image: '/items/biz-private-members-club.png' },
  { name: 'Aurore Vineyard Estate',     businessType: 'vineyard_estate',        businessRiskTier: 'prestige', benchmark: 7_500_000,  image: '/items/biz-vineyard-estate.png' },
  { name: 'Azure Yacht Charter Brand',  businessType: 'yacht_charter_brand',    businessRiskTier: 'prestige', benchmark: 10_000_000, image: '/items/biz-yacht-charter-brand.png' },
  { name: 'Gavel & Co. Auction House',  businessType: 'boutique_auction_house', businessRiskTier: 'prestige', benchmark: 5_000_000,  image: '/items/biz-boutique-auction-house.png' },
  { name: 'Meridian Global Media House',businessType: 'global_media_house',     businessRiskTier: 'prestige', benchmark: 20_000_000, image: '/items/biz-global-media-house.png' },
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
        horsepower:     car.hp,
        topSpeed:       car.topSpeed,
        zeroToHundred:  car.z100,
        isApproved:     true,
        itemStatus:     'active',
      },
    })
    itemIds[car.name] = item.id
  }
  console.log(`  ✓ ${CARS.length} cars seeded`)

  // ── Business items ────────────────────────────────────────────────────────────
  console.log('Seeding businesses...')
  for (const biz of BUSINESSES) {
    const existing = await prisma.item.findFirst({ where: { name: biz.name } })
    if (existing) continue
    const minimumBid = Math.round(biz.benchmark * 0.10)
    await prisma.item.create({
      data: {
        name:            biz.name,
        category:        'businesses',
        rarityTier:      'Common',
        imageUrl:        biz.image ?? undefined,
        totalSupply:     3,
        benchmarkPrice:  biz.benchmark,
        minimumBid,
        businessType:    biz.businessType,
        businessRiskTier:biz.businessRiskTier,
        isApproved:      true,
        itemStatus:      'active',
      },
    })
  }
  console.log(`  ✓ ${BUSINESSES.length} businesses seeded`)

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
