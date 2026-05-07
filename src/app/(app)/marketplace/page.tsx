import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { scarcityThreshold } from '@/lib/supply'
import MarketplaceClient from './MarketplaceClient'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  cars:       'Cars',
  aircraft:   'Aircraft',
  businesses: 'Businesses',
  properties: 'Properties',
  yachts:     'Yachts',
}

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
    itemStatus: 'active',
    ...(category && category !== 'All' ? { category: category.toLowerCase() } : {}),
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  const orderBy = sort === 'price_asc'  ? [{ minimumBid: 'asc'  as const }]
               : sort === 'price_desc' ? [{ minimumBid: 'desc' as const }]
               :                        [{ createdAt:   'desc' as const }]

  // Build category list dynamically from DB
  const rawCats = await prisma.item.findMany({
    where:    { isApproved: true, isFrozen: false, itemStatus: 'active' },
    select:   { category: true },
    distinct: ['category'],
    orderBy:  { category: 'asc' },
  })
  const categories = ['All', ...rawCats.map((r: { category: string }) =>
    CATEGORY_LABELS[r.category] ?? (r.category.charAt(0).toUpperCase() + r.category.slice(1))
  )]

  const threshold  = scarcityThreshold()
  const userCount  = threshold > 0 ? await prisma.user.count() : 0
  const scarcityOn = threshold > 0 && userCount < threshold

  const items = await prisma.item.findMany({
    where,
    orderBy,
    include: {
      editions: {
        where:   { isFrozen: false },
        select:  { id: true, editionNumber: true, currentOwnerId: true, isListed: true, listedPrice: true, isInAuction: true, lastSalePrice: true, lastSaleDate: true },
        orderBy: { editionNumber: 'asc' },
        take: 50,
      },
      _count: { select: { wishlistedBy: true } },
    },
    take: 500,
  })

  return (
    <MarketplaceClient
      items={items.map((i: typeof items[0]) => ({
        ...i,
        minimumBid:      i.minimumBid.toString(),
        benchmarkPrice:  i.benchmarkPrice.toString(),
        businessRiskTier:i.businessRiskTier ?? null,
        propertyTier:   i.propertyTier    ?? null,
        horsepower:     i.horsepower    ?? null,
        topSpeed:       i.topSpeed      ?? null,
        zeroToHundred:  i.zeroToHundred?.toString() ?? null,
        watcherCount:   i._count.wishlistedBy,
        editions: i.editions.map((e: typeof i.editions[0]) => ({
          ...e,
          listedPrice:   e.listedPrice?.toString()   ?? null,
          lastSalePrice: e.lastSalePrice?.toString() ?? null,
          lastSaleDate:  e.lastSaleDate?.toISOString() ?? null,
        })),
      }))}
      categories={categories}
      currentCategory={category ?? 'All'}
      currentSort={sort ?? 'newest'}
      query={q ?? ''}
      userId={session?.user?.id ?? null}
      scarcityOn={scarcityOn}
      membersNeeded={scarcityOn ? threshold - userCount : 0}
    />
  )
}
