import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { minimumBid, startsAt, endsAt } = await req.json()

  try {
    await prisma.auction.update({
      where: { id },
      data: {
        minimumBid: minimumBid ? Number(minimumBid) : undefined,
        startsAt:   startsAt   ? new Date(startsAt) : undefined,
        endsAt:     endsAt     ? new Date(endsAt)   : undefined,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json()

  if (action === 'activate') {
    const auction = await prisma.auction.findUnique({ where: { id } })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.auction.update({
      where: { id },
      data: {
        status:   'active',
        startsAt: auction.startsAt ?? new Date(),
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'cancel') {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { bids: { where: { status: 'active' } } },
    })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.$transaction([
      // Refund each active bid
      ...auction.bids.map(bid =>
        prisma.user.update({
          where: { id: bid.userId },
          data:  { balance: { increment: bid.amount } },
        })
      ),
      // Mark bids as refunded
      prisma.bid.updateMany({
        where: { auctionId: id, status: 'active' },
        data:  { status: 'refunded' },
      }),
      // Release edition from auction
      prisma.itemEdition.update({
        where: { id: auction.editionId },
        data:  { isInAuction: false },
      }),
      // End the auction
      prisma.auction.update({
        where: { id },
        data:  { status: 'ended' },
      }),
    ])
    return NextResponse.json({ ok: true })
  }

  if (action === 'reverse') {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        bids:    { where: { status: 'won' } },
        edition: true,
      },
    })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (auction.status !== 'settled') {
      return NextResponse.json({ error: 'Only settled auctions can be reversed' }, { status: 400 })
    }

    const winBid    = auction.bids[0]
    const winAmount = auction.winningBid ?? winBid?.amount

    // Build ops array — typed as Prisma interactive transactions don't support dynamic push,
    // so we collect conditionally then spread into $transaction.
    const editionOp = prisma.itemEdition.update({
      where: { id: auction.editionId },
      data:  { currentOwnerId: auction.sellerId ?? null, isInAuction: false, isListed: false },
    })
    const auctionOp = prisma.auction.update({
      where: { id },
      data:  { status: 'ended', winningBid: null, currentWinnerId: null },
    })

    const winnerRefundOps = winBid && winAmount ? [
      prisma.user.update({ where: { id: winBid.userId }, data: { balance: { increment: winAmount } } }),
      prisma.bid.update({ where: { id: winBid.id }, data: { status: 'refunded' } }),
      prisma.transaction.create({
        data: { toUserId: winBid.userId, amount: winAmount, type: 'admin_adjustment',
          description: `Admin reversal: auction ${id} refunded to winner` },
      }),
    ] : []

    const sellerClawbackOps = !auction.isSystemAuction && auction.sellerId && winAmount ? [
      prisma.user.update({ where: { id: auction.sellerId }, data: { balance: { decrement: winAmount } } }),
      prisma.transaction.create({
        data: { fromUserId: auction.sellerId, amount: winAmount, type: 'admin_adjustment',
          description: `Admin reversal: auction ${id} proceeds clawed back` },
      }),
    ] : []

    await prisma.$transaction([editionOp, auctionOp, ...winnerRefundOps, ...sellerClawbackOps])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
