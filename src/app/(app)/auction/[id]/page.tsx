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
        edition: { include: { item: { select: { name: true, imageUrl: true, rarityTier: true } } } },
        seller:  { select: { id: true, username: true } },
        currentWinner: { select: { username: true } },
        _count:  { select: { bids: true } },
      },
    }),
    prisma.auctionMessage.findMany({
      where:   { auctionId: id },
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
  ])

  if (!auction) notFound()

  const [userData, myBid, watcherCount] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { balance: true, lockedBalance: true, username: true } })
      : null,
    session?.user?.id
      ? prisma.bid.findUnique({ where: { auctionId_userId: { auctionId: id, userId: session.user.id } }, select: { amount: true, status: true } })
      : null,
    prisma.wishlist.count({ where: { itemId: auction.edition.itemId } }),
  ])

  const isSeller   = session?.user?.id === auction.sellerId
  const isSettled  = auction.status === 'settled'
  const available  = userData ? Number(userData.balance) - Number(userData.lockedBalance) : 0

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/auctions" style={{ color: 'var(--muted)', fontSize: 13 }}>← Auctions</Link>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ marginBottom: 4 }}>
          {isSettled ? 'Settled Auction' : 'Live Auction'}
        </div>
        <div className="page-sub">{auction.edition.item.name} · Edition #{auction.edition.editionNumber}</div>
      </div>
      <AuctionClient
        auctionId={id}
        itemName={auction.edition.item.name}
        editionNum={auction.edition.editionNumber}
        imageUrl={auction.edition.item.imageUrl}
        editionId={auction.editionId}
        rarityTier={auction.rarityTier}
        status={auction.status}
        minimumBid={auction.minimumBid.toString()}
        benchmarkPrice={auction.benchmarkPrice.toString()}
        currentBid={auction.currentBid?.toString() ?? null}
        endsAt={auction.endsAt.toISOString()}
        extensionCount={auction.extensionCount}
        sellerId={auction.sellerId}
        isSystemAuction={auction.isSystemAuction}
        bidCount={auction._count.bids}
        watcherCount={watcherCount}
        lastSalePrice={auction.edition.lastSalePrice?.toString() ?? null}
        winnerName={isSettled ? (auction.currentWinner?.username ?? null) : null}
        winningBid={isSettled ? (auction.winningBid?.toString() ?? null) : null}
        luckyUndervalueWin={isSettled ? auction.luckyUndervalueWin : false}
        myBid={myBid ? { amount: myBid.amount.toString(), status: myBid.status } : null}
        userId={session?.user?.id ?? null}
        availableBalance={available.toString()}
        userUsername={userData?.username ?? null}
        isSeller={isSeller}
        initialMessages={initialMessages.map((m: typeof initialMessages[0]) => ({
          id: m.id, message: m.message, createdAt: m.createdAt.toISOString(), user: m.user,
        }))}
      />
    </div>
  )
}
