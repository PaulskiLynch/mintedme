import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const username = process.argv[2]
  if (!username) { console.error('Usage: npx tsx scripts/make-admin.ts <username>'); process.exit(1) }

  const user = await prisma.user.update({
    where: { username: username.toLowerCase() },
    data:  { isAdmin: true },
    select: { username: true, email: true, isAdmin: true },
  })
  console.log('Admin granted:', user)
}

main().catch(console.error).finally(() => prisma.$disconnect())
