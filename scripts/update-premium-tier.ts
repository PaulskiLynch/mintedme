import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const result = await prisma.item.updateMany({
    where: {
      benchmarkPrice: { gte: 65000, lt: 100000 },
      rarityTier: 'Common',
    },
    data: { rarityTier: 'Premium', totalSupply: 8 },
  })
  console.log(`Updated ${result.count} items to Premium tier`)

  const premiumItems = await prisma.item.findMany({
    where: { rarityTier: 'Premium' },
    select: { name: true, benchmarkPrice: true },
    orderBy: { benchmarkPrice: 'asc' },
  })
  premiumItems.forEach(i => console.log(`  ${i.name}: $${Number(i.benchmarkPrice).toLocaleString()}`))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
