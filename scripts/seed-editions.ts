import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const items = await prisma.item.findMany({
    where: { isApproved: true, itemStatus: 'active' },
    select: { id: true, name: true },
  })

  let created = 0
  for (const item of items) {
    const hasEdition = await prisma.itemEdition.findFirst({ where: { itemId: item.id } })
    if (hasEdition) continue

    await prisma.itemEdition.create({
      data: { itemId: item.id, editionNumber: 1 },
    })
    console.log(`  + edition #1 for ${item.name}`)
    created++
  }

  console.log(`\nCreated ${created} unowned editions.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
