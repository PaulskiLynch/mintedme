import Link from 'next/link'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import MarketplaceClient from './MarketplaceClient'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['All', 'Cars', 'Yachts', 'Watches', 'Art', 'Fashion', 'Jets', 'Mansions', 'Collectibles', 'Businesses']

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>
}) {
  const session = await auth()
  const { category, sort, q } = await searchParams

  const where = {
    isApproved: true,
    isFrozen:   false,
    ...(category && category !== 'All' ? { category: category.toLowerCase() } : {}),
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  const orderBy = sort === 'price_asc'    ? [{ referencePrice: 'asc'  as const }]
               : sort === 'price_desc'   ? [{ referencePrice: 'desc' as const }]
               : sort === 'newest'       ? [{ createdAt: 'desc' as const }]
               :                          [{ createdAt: 'desc' as const }]

  const items = await prisma.item.findMany({
    where,
    orderBy,
    include: {
      editions: {
        where: { isFrozen: false },
        select: { id: true, editionNumber: true, currentOwnerId: true, isListed: true, listedPrice: true, isInAuction: true, lastSalePrice: true },
        orderBy: { editionNumber: 'asc' },
        take: 50,
      },
    },
    take: 100,
  })

  return (
    <MarketplaceClient
      items={items.map((i: typeof items[0]) => ({
        ...i,
        referencePrice:   i.referencePrice?.toString()   ?? null,
        minPriceBand:     i.minPriceBand?.toString()     ?? null,
        maxPriceBand:     i.maxPriceBand?.toString()     ?? null,
        ownershipCostPct: i.ownershipCostPct?.toString() ?? null,
        editions: i.editions.map((e: typeof i.editions[0]) => ({
          ...e,
          listedPrice:   e.listedPrice?.toString()   ?? null,
          lastSalePrice: e.lastSalePrice?.toString() ?? null,
        })),
      }))}
      categories={CATEGORIES}
      currentCategory={category ?? 'All'}
      currentSort={sort ?? 'newest'}
      query={q ?? ''}
      userId={session?.user?.id ?? null}
    />
  )
}
