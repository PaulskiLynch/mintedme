import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { bidIncrement } from '@/lib/auction'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const auction = await prisma.auction.findUnique({
    where: { id },
    select: {
      status:            true,
      minimumBid:        true,
      benchmarkPrice:    true,
      currentBid:        true,          // shown publicly
      rarityTier:        true,
      endsAt:            true,
      extensionCount:    true,
      winningBid:        true,
      luckyUndervalueWin: true,
      isSystemAuction:   true,
      currentWinner:     { select: { username: true } },  // hidden until settled
      _count:            { select: { bids: true } },
    },
  })
  if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isSettled   = auction.status === 'settled'
  const currentBid  = auction.currentBid ? Number(auction.currentBid) : null
  const minRequired = currentBid !== null
    ? currentBid + bidIncrement(currentBid)
    : Number(auction.minimumBid)

  const myBid = session?.user?.id
    ? await prisma.bid.findUnique({
        where: { auctionId_userId: { auctionId: id, userId: session.user.id } },
        select: { amount: true, status: true },
      })
    : null

  return NextResponse.json({
    status:            auction.status,
    minimumBid:        auction.minimumBid.toString(),
    benchmarkPrice:    auction.benchmarkPrice.toString(),
    currentBid:        currentBid?.toString() ?? null,   // public — no bidder revealed
    minRequired:       minRequired,
    rarityTier:        auction.rarityTier,
    endsAt:            auction.endsAt.toISOString(),
    extensionCount:    auction.extensionCount,
    bidCount:          auction._count.bids,
    isSystemAuction:   auction.isSystemAuction,
    // Reveal winner + verdict only after settlement
    winnerName:        isSettled ? (auction.currentWinner?.username ?? null) : null,
    winningBid:        isSettled ? (auction.winningBid?.toString() ?? null) : null,
    luckyUndervalueWin: isSettled ? auction.luckyUndervalueWin : null,
    myBid:             myBid ? { amount: myBid.amount.toString(), status: myBid.status } : null,
  })
}
