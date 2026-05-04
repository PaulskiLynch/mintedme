import { prisma } from '@/lib/db'
import AdminItemsClient from './AdminItemsClient'

export const dynamic = 'force-dynamic'

export default async function AdminItemsPage() {
  const items = await prisma.item.findMany({
    orderBy: [{ isApproved: 'asc' }, { createdAt: 'desc' }],
    include: {
      creator:  { select: { username: true } },
      _count:   { select: { editions: true } },
    },
    take: 100,
  })

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 24 }}>Items</div>
      <AdminItemsClient items={items.map((i: typeof items[0]) => ({
        id:           i.id,
        name:         i.name,
        category:     i.category,
        class:        i.class,
        imageUrl:     i.imageUrl,
        isApproved:   i.isApproved,
        isFrozen:     i.isFrozen,
        isOfficial:   i.isOfficial,
        referencePrice: i.referencePrice?.toString() ?? null,
        totalSupply:  i.totalSupply,
        editionCount: i._count.editions,
        creatorName:  i.creator?.username ?? null,
        createdAt:    i.createdAt.toISOString(),
      }))} />
    </div>
  )
}
