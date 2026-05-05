import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

// Public info only — sealed bids never expose amounts or winner until settled
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const auction = await prisma.auction.findUnique({
    where: { id },
    select: {
      status:        true,
      minimumBid:    true,
      rarityTier:    true,
      endsAt:        true,
      winningBid:    true,
      luckyUndervalueWin: true,
      currentWinner: { select: { username: true } },
      _count:        { select: { bids: true } },
    },
  })
  if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isSettled = auction.status === 'settled'

  // Has current user placed a bid?
  const myBid = session?.user?.id
    ? await prisma.bid.findUnique({
        where: { auctionId_userId: { auctionId: id, userId: session.user.id } },
        select: { amount: true, status: true },
      })
    : null

  return NextResponse.json({
    status:             auction.status,
    minimumBid:         auction.minimumBid.toString(),
    rarityTier:         auction.rarityTier,
    endsAt:             auction.endsAt.toISOString(),
    bidCount:           auction._count.bids,
    // Only reveal winner + amounts after settlement
    winnerName:         isSettled ? (auction.currentWinner?.username ?? null) : null,
    winningBid:         isSettled ? (auction.winningBid?.toString() ?? null) : null,
    luckyUndervalueWin: isSettled ? auction.luckyUndervalueWin : null,
    // Show user their own bid amount (so they can update it)
    myBid:              myBid ? { amount: myBid.amount.toString(), status: myBid.status } : null,
  })
}
