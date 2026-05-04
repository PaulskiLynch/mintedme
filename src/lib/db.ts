import { PrismaClient } from '@/generated/prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'
import type { HTTPQueryOptions } from '@neondatabase/serverless'

const createClient = () => {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {} as HTTPQueryOptions<boolean, boolean>)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
