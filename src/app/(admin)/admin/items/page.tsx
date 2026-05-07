import { prisma } from '@/lib/db'
import AdminItemsClient from './AdminItemsClient'

export const dynamic = 'force-dynamic'

export default async function AdminItemsPage() {
  const items = await prisma.item.findMany({
    orderBy: [{ isApproved: 'asc' }, { createdAt: 'desc' }],
    include: {
      creator:  { select: { username: true } },
      _count:   { select: { editions: true } },
      editions: {
        select: { currentOwnerId: true, isInAuction: true, isFrozen: true },
      },
    },
    take: 500,
  })

  const categories = [...new Set(items.map((i: typeof items[0]) => i.category))].sort() as string[]

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 24 }}>Items</div>
      <AdminItemsClient
        items={items.map((i: typeof items[0]) => ({
          id:             i.id,
          name:           i.name,
          category:       i.category,
          rarityTier:     i.rarityTier,
          imageUrl:       i.imageUrl,
          isApproved:     i.isApproved,
          isFrozen:       i.isFrozen,
          isOfficial:     i.isOfficial,
          benchmarkPrice: i.benchmarkPrice.toString(),
          minimumBid:     i.minimumBid.toString(),
          totalSupply:    i.totalSupply,
          editionCount:   i._count.editions,
          unownedCount:   i.editions.filter(e => !e.currentOwnerId && !e.isInAuction && !e.isFrozen).length,
          inAuctionCount: i.editions.filter(e => e.isInAuction).length,
          creatorName:    i.creator?.username ?? null,
          createdAt:      i.createdAt.toISOString(),
        }))}
        categories={categories}
      />
    </div>
  )
}
