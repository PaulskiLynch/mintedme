import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  // Find all editions bought at the wrong price (lastSalePrice < benchmarkPrice * 0.5)
  const wrongPurchases = await prisma.itemEdition.findMany({
    where: { currentOwnerId: { not: null } },
    include: {
      item: { select: { name: true, benchmarkPrice: true } },
      currentOwner: { select: { id: true, username: true, balance: true } },
    },
  })

  const toRefund = wrongPurchases.filter(e =>
    e.lastSalePrice && Number(e.lastSalePrice) < Number(e.item.benchmarkPrice) * 0.5
  )

  if (toRefund.length === 0) { console.log('No wrong purchases found.'); return }

  for (const e of toRefund) {
    const paid = Number(e.lastSalePrice)
    console.log(`Refunding @${e.currentOwner!.username} $${paid.toLocaleString()} for ${e.item.name}`)

    await prisma.$transaction([
      // Refund balance
      prisma.user.update({ where: { id: e.currentOwnerId! }, data: { balance: { increment: paid } } }),
      // Return to MilliBux (no owner)
      prisma.itemEdition.update({ where: { id: e.id }, data: { currentOwnerId: null, lastSalePrice: null, lastSaleDate: null } }),
      // Close ownership record
      prisma.ownership.updateMany({ where: { editionId: e.id, endedAt: null }, data: { endedAt: new Date() } }),
    ])
    console.log(`  ✓ Done`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
