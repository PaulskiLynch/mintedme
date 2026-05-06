import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

const BIZ_IMAGES: Record<string, string> = {
  cafe_chain:             '/items/biz-cafe-chain.png',
  boutique_gym:           '/items/biz-boutique-gym.png',
  car_wash_network:       '/items/biz-car-wash-network.png',
  storage_unit_portfolio: '/items/biz-storage-unit-portfolio.png',
  vending_machine_route:  '/items/biz-vending-machine-route.png',
  food_truck_fleet:       '/items/biz-food-truck-fleet.png',
  luxury_barber_lounge:   '/items/biz-luxury-barber-lounge.png',
  sneaker_resale_store:   '/items/biz-sneaker-resale-store.png',
  boutique_hotel:         '/items/biz-boutique-hotel.png',
  rooftop_restaurant:     '/items/biz-rooftop-restaurant.png',
  nightclub_venue:        '/items/biz-nightclub-venue.png',
  private_security_firm:  '/items/biz-private-security-firm.png',
  digital_media_studio:   '/items/biz-digital-media-studio.png',
  event_production_co:    '/items/biz-event-production-co.png',
  luxury_rental_agency:   '/items/biz-luxury-rental-agency.png',
  supercar_rental_club:   '/items/biz-supercar-rental-club.png',
  music_label:            '/items/biz-music-label.png',
  indie_film_studio:      '/items/biz-indie-film-studio.png',
  fashion_label:          '/items/biz-fashion-label.png',
  tech_startup:           '/items/biz-tech-startup.png',
  esports_team:           '/items/biz-esports-team.png',
  crypto_trading_desk:    '/items/biz-crypto-trading-desk.png',
  talent_mgmt_agency:     '/items/biz-talent-mgmt-agency.png',
  art_gallery:            '/items/biz-art-gallery.png',
  luxury_watch_boutique:  '/items/biz-luxury-watch-boutique.png',
  private_members_club:   '/items/biz-private-members-club.png',
  vineyard_estate:        '/items/biz-vineyard-estate.png',
  yacht_charter_brand:    '/items/biz-yacht-charter-brand.png',
  boutique_auction_house: '/items/biz-boutique-auction-house.png',
  global_media_house:     '/items/biz-global-media-house.png',
}

async function main() {
  const businesses = await prisma.item.findMany({
    where: { businessType: { not: null } },
    select: { id: true, name: true, businessType: true },
  })

  let updated = 0
  for (const item of businesses) {
    const imageUrl = item.businessType ? BIZ_IMAGES[item.businessType] : null
    if (!imageUrl) { console.log(`  ⚠ no image mapping for ${item.name}`); continue }
    await prisma.item.update({ where: { id: item.id }, data: { imageUrl } })
    console.log(`  ✓ ${item.name} → ${imageUrl}`)
    updated++
  }
  console.log(`\nUpdated ${updated} businesses.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
