import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import bcrypt from 'bcryptjs'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

const DAY = 24 * 60 * 60 * 1000
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000)

async function main() {
  console.log('Seeding fictional players…')

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = [
    { username: 'velocityvince', tagline: 'Cars are freedom. Speed is wealth.', balance: 940_000, password: 'password123' },
    { username: 'luxelinda',     tagline: 'Only the finest. Always tasteful.',  balance: 903_000, password: 'password123' },
    { username: 'cryptokai',     tagline: 'Build income. Stack assets.',        balance: 700_000, password: 'password123' },
  ]

  const created: Record<string, string> = {}
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } })
    if (existing) {
      console.log(`  ↳ @${u.username} already exists, skipping`)
      created[u.username] = existing.id
      continue
    }
    const hash = await bcrypt.hash(u.password, 10)
    const user = await prisma.user.create({
      data: {
        email:        `${u.username}@demo.millibux.com`,
        username:     u.username,
        passwordHash: hash,
        tagline:      u.tagline,
        balance:      u.balance,
        isEstablished: true,
      },
    })
    created[u.username] = user.id
    console.log(`  ✓ @${u.username} created`)
  }

  const vince = created['velocityvince']
  const linda = created['luxelinda']
  const kai   = created['cryptokai']

  // ── Items ─────────────────────────────────────────────────────────────────
  const itemDefs = [
    { key: 'roadster',  name: 'Silver Arrow Roadster',  category: 'cars',        class: 'grail',   referencePrice: 32_000,  totalSupply: 5,  imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&fit=crop' },
    { key: 'porsche',   name: 'Vintage Porsche 959',    category: 'cars',        class: 'elite',   referencePrice: 28_000,  totalSupply: 10, imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&fit=crop' },
    { key: 'patek',     name: 'Patek Philippe Royal',   category: 'watches',     class: 'grail',   referencePrice: 85_000,  totalSupply: 3,  imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&fit=crop' },
    { key: 'canvas',    name: 'Midnight Canvas',        category: 'art',         class: 'elite',   referencePrice: 12_000,  totalSupply: 10, imageUrl: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=400&fit=crop' },
    { key: 'cafe',      name: 'Midnight Café Chain',    category: 'businesses',  class: 'elite',   referencePrice: 120_000, totalSupply: 5,  imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&fit=crop' },
    { key: 'yacht',     name: 'Pacific Blue Yacht',     category: 'yachts',      class: 'grail',   referencePrice: 180_000, totalSupply: 3,  imageUrl: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400&fit=crop' },
  ]

  const itemIds: Record<string, string> = {}
  for (const def of itemDefs) {
    const existing = await prisma.item.findFirst({ where: { name: def.name } })
    if (existing) {
      itemIds[def.key] = existing.id
      continue
    }
    const item = await prisma.item.create({
      data: { name: def.name, category: def.category, class: def.class, referencePrice: def.referencePrice, totalSupply: def.totalSupply, imageUrl: def.imageUrl, isApproved: true },
    })
    itemIds[def.key] = item.id
  }
  console.log('  ✓ Items ready')

  // ── Editions ──────────────────────────────────────────────────────────────
  const editionDefs = [
    { key: 'roadster',  itemKey: 'roadster', owner: vince, price: 32_000 },
    { key: 'porsche',   itemKey: 'porsche',  owner: vince, price: 28_000 },
    { key: 'patek',     itemKey: 'patek',    owner: linda, price: 85_000 },
    { key: 'canvas',    itemKey: 'canvas',   owner: linda, price: 12_000 },
    { key: 'cafe',      itemKey: 'cafe',     owner: kai,   price: 120_000 },
    { key: 'yacht',     itemKey: 'yacht',    owner: kai,   price: 180_000 },
  ]

  const editionIds: Record<string, string> = {}
  for (const [i, def] of editionDefs.entries()) {
    const existing = await prisma.itemEdition.findFirst({ where: { itemId: itemIds[def.itemKey], editionNumber: 1 } })
    if (existing) {
      editionIds[def.key] = existing.id
      continue
    }
    const ed = await prisma.itemEdition.create({
      data: {
        itemId:         itemIds[def.itemKey],
        editionNumber:  1,
        currentOwnerId: def.owner,
        lastSalePrice:  def.price,
        lastSaleDate:   ago(3 - i),
      },
    })
    editionIds[def.key] = ed.id
  }
  console.log('  ✓ Editions ready')

  // ── Feed events ───────────────────────────────────────────────────────────
  const evDefs = [
    // Purchases
    { key: 'e_cafe',      userId: kai,   editionKey: 'cafe',    eventType: 'buy', amount: 120_000, createdAt: ago(3, 2) },
    { key: 'e_patek',     userId: linda, editionKey: 'patek',   eventType: 'buy', amount: 85_000,  createdAt: ago(3, 1) },
    { key: 'e_roadster',  userId: vince, editionKey: 'roadster',eventType: 'buy', amount: 32_000,  createdAt: ago(2, 4) },
    { key: 'e_yacht',     userId: kai,   editionKey: 'yacht',   eventType: 'buy', amount: 180_000, createdAt: ago(2, 1) },
    { key: 'e_canvas',    userId: linda, editionKey: 'canvas',  eventType: 'buy', amount: 12_000,  createdAt: ago(1, 5) },
    { key: 'e_porsche',   userId: vince, editionKey: 'porsche', eventType: 'buy', amount: 28_000,  createdAt: ago(1, 2) },
    // Achievements
    {
      key: 'e_car_collector', userId: vince, editionKey: null, eventType: 'achievement', amount: null, createdAt: ago(1, 1),
      metadata: { icon: '🏆', title: '@velocityvince became a Car Collector', description: 'Owns 2+ cars in their Mint.', rankBefore: 12, rankAfter: 8 },
    },
    {
      key: 'e_income', userId: kai, editionKey: null, eventType: 'achievement', amount: null, createdAt: ago(0, 18),
      metadata: { icon: '📈', title: "cryptokai's Midnight Café Chain generated $4,200 income", description: 'Business assets earn passive income.', rankBefore: 9, rankAfter: 7 },
    },
    {
      key: 'e_networth', userId: linda, editionKey: null, eventType: 'achievement', amount: null, createdAt: ago(0, 10),
      metadata: { icon: '💰', title: '@luxelinda crossed the $500k net worth milestone', description: 'Balance + Mint value exceeds $500,000.', rankBefore: 11, rankAfter: 6 },
    },
    // Market event (no user)
    {
      key: 'e_mansion_drop', userId: null, editionKey: null, eventType: 'market_event', amount: null, createdAt: ago(0, 6),
      metadata: { icon: '⚠️', title: 'Mansion market dropped 6% this month', description: 'High-end property overvalued. Sellers adjusting asks.', category: 'mansions' },
    },
  ]

  const eventIds: Record<string, string> = {}
  for (const ev of evDefs) {
    const existing = await prisma.feedEvent.findFirst({ where: { userId: ev.userId ?? undefined, eventType: ev.eventType, editionId: ev.editionKey ? editionIds[ev.editionKey] : undefined } })
    if (existing) {
      eventIds[ev.key] = existing.id
      continue
    }
    const created = await prisma.feedEvent.create({
      data: {
        userId:    ev.userId ?? undefined,
        editionId: ev.editionKey ? editionIds[ev.editionKey] : undefined,
        eventType: ev.eventType,
        amount:    ev.amount ?? undefined,
        metadata:  (ev as { metadata?: object }).metadata ?? undefined,
        isVisible: true,
        createdAt: ev.createdAt,
      },
    })
    eventIds[ev.key] = created.id
  }
  console.log('  ✓ Feed events ready')

  // ── Comments ──────────────────────────────────────────────────────────────
  const commentDefs = [
    { feedKey: 'e_roadster', userId: linda, message: 'Nice pick! That roadster is going to appreciate.', createdAt: ago(2, 3) },
    { feedKey: 'e_roadster', userId: kai,   message: 'Future classic for sure. Hold it tight.',          createdAt: ago(2, 2) },
    { feedKey: 'e_patek',    userId: vince, message: 'Future classic. Good buy.',                        createdAt: ago(3) },
    { feedKey: 'e_patek',    userId: kai,   message: 'Overpaid? That\'s what they always say 😅',        createdAt: ago(2, 23) },
    { feedKey: 'e_yacht',    userId: linda, message: 'Risky. Yachts cost a fortune to maintain.',        createdAt: ago(2) },
    { feedKey: 'e_yacht',    userId: vince, message: 'Flip it before summer ends!',                      createdAt: ago(1, 22) },
    { feedKey: 'e_cafe',     userId: linda, message: 'Smart. Businesses generate income. Hold it!',      createdAt: ago(3) },
    { feedKey: 'e_canvas',   userId: kai,   message: 'Good buy? Art is the real long game.',             createdAt: ago(1, 4) },
  ]

  for (const c of commentDefs) {
    const evId = eventIds[c.feedKey]
    if (!evId) continue
    const existing = await prisma.feedComment.findFirst({ where: { feedEventId: evId, userId: c.userId, message: c.message } })
    if (existing) continue
    await prisma.feedComment.create({
      data: { feedEventId: evId, userId: c.userId, message: c.message, createdAt: c.createdAt },
    })
  }
  console.log('  ✓ Comments ready')

  // ── Reactions ─────────────────────────────────────────────────────────────
  const reactionDefs = [
    { feedKey: 'e_roadster', userId: linda, type: 'smart' },
    { feedKey: 'e_roadster', userId: kai,   type: 'flex' },
    { feedKey: 'e_patek',    userId: vince, type: 'smart' },
    { feedKey: 'e_patek',    userId: kai,   type: 'flex' },
    { feedKey: 'e_yacht',    userId: linda, type: 'risky' },
    { feedKey: 'e_yacht',    userId: vince, type: 'watch' },
    { feedKey: 'e_cafe',     userId: linda, type: 'smart' },
    { feedKey: 'e_cafe',     userId: vince, type: 'smart' },
    { feedKey: 'e_canvas',   userId: vince, type: 'watch' },
    { feedKey: 'e_canvas',   userId: kai,   type: 'smart' },
    { feedKey: 'e_car_collector', userId: linda, type: 'flex' },
    { feedKey: 'e_car_collector', userId: kai,   type: 'flex' },
  ]

  for (const r of reactionDefs) {
    const evId = eventIds[r.feedKey]
    if (!evId) continue
    await prisma.feedLike.upsert({
      where:  { userId_feedEventId: { userId: r.userId, feedEventId: evId } },
      update: { type: r.type },
      create: { userId: r.userId, feedEventId: evId, type: r.type },
    })
  }
  console.log('  ✓ Reactions ready')

  console.log('\nSeed complete.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
