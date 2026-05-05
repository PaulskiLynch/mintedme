import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const demoUsernames = ['velocityvince', 'luxelinda', 'cryptokai']
  const demoUsers = await prisma.user.findMany({
    where: { username: { in: demoUsernames } },
    select: { id: true, username: true },
  })
  const demoIds = demoUsers.map(u => u.id)

  // Clear ownership records
  const deleted = await prisma.ownership.deleteMany({
    where: { ownerId: { in: demoIds } },
  })

  // Clear currentOwnerId + sale data from editions
  const updated = await prisma.itemEdition.updateMany({
    where: { currentOwnerId: { in: demoIds } },
    data: { currentOwnerId: null, lastSalePrice: null, lastSaleDate: null },
  })

  console.log(`Cleared ${updated.count} edition(s) and ${deleted.count} ownership record(s)`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
