import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import AuctionClient from './AuctionClient'

export const dynamic = 'force-dynamic'

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const [auction, initialMessages] = await Promise.all([
    prisma.auction.findUnique({
      where: { id },
      include: {
        edition: {
          include: {
            item: { select: { name: true, imageUrl: true, category: true, class: true } },
          },
        },
        seller:        { select: { id: true, username: true } },
        currentWinner: { select: { username: true } },
        bids: {
          include: { user: { select: { username: true } } },
          orderBy: { amount: 'desc' },
          take: 20,
        },
      },
    }),
    prisma.auctionMessage.findMany({
      where: { auctionId: id },
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
  ])

  if (!auction) notFound()

  const userData = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { balance: true, username: true } })
    : null

  const isSeller = session?.user?.id === auction.sellerId

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/auctions" style={{ color: 'var(--muted)', fontSize: 13 }}>← Auctions</Link>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ marginBottom: 4 }}>Live Auction</div>
        <div className="page-sub">{auction.edition.item.name} · Edition #{auction.edition.editionNumber}</div>
      </div>
      <AuctionClient
        auctionId={id}
        itemName={auction.edition.item.name}
        editionNum={auction.edition.editionNumber}
        imageUrl={auction.edition.item.imageUrl}
        editionId={auction.editionId}
        status={auction.status}
        startingBid={auction.startingBid.toString()}
        currentBid={auction.currentBid?.toString() ?? null}
        endsAt={auction.endsAt.toISOString()}
        sellerId={auction.sellerId}
        winnerName={auction.currentWinner?.username ?? null}
        bids={auction.bids.map((b: typeof auction.bids[0]) => ({
          id: b.id,
          amount: b.amount.toString(),
          createdAt: b.createdAt.toISOString(),
          user: b.user,
        }))}
        userId={session?.user?.id ?? null}
        userBalance={userData?.balance?.toString() ?? null}
        userUsername={userData?.username ?? null}
        isSeller={isSeller}
        initialMessages={initialMessages.map((m: typeof initialMessages[0]) => ({
          id: m.id,
          message: m.message,
          createdAt: m.createdAt.toISOString(),
          user: m.user,
        }))}
      />
    </div>
  )
}
