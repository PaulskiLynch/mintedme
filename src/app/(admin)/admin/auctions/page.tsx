import { prisma } from '@/lib/db'
import AdminAuctionsClient from './AdminAuctionsClient'

export const dynamic = 'force-dynamic'

export default async function AdminAuctionsPage() {
  const auctions = await prisma.auction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      edition: {
        include: {
          item: { select: { name: true, imageUrl: true } },
        },
      },
      seller:        { select: { username: true } },
      currentWinner: { select: { username: true } },
      _count:        { select: { bids: true } },
    },
  })

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Auctions</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        {auctions.length} total · {auctions.filter(a => a.status === 'active').length} active
      </div>
      <AdminAuctionsClient auctions={auctions.map(a => ({
        id:                    a.id,
        status:                a.status,
        itemName:              a.edition.item.name,
        itemImageUrl:          a.edition.item.imageUrl ?? null,
        editionNumber:         a.edition.editionNumber,
        editionId:             a.editionId,
        sellerUsername:        a.seller?.username ?? null,
        currentWinnerUsername: a.currentWinner?.username ?? null,
        currentBid:            a.currentBid?.toString()   ?? null,
        winningBid:            a.winningBid?.toString()   ?? null,
        minimumBid:            a.minimumBid.toString(),
        benchmarkPrice:        a.benchmarkPrice.toString(),
        bidCount:              a._count.bids,
        startsAt:              a.startsAt?.toISOString()  ?? null,
        endsAt:                a.endsAt.toISOString(),
        isSystemAuction:       a.isSystemAuction,
        createdAt:             a.createdAt.toISOString(),
      }))} />
    </div>
  )
}
