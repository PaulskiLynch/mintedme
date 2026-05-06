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
      data: { status: 'active', startsAt: auction.startsAt ?? new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'cancel') {
    const auction = await prisma.auction.findUnique({
      where:   { id },
      include: { bids: { where: { status: 'active' } }, edition: { include: { item: { select: { name: true } } } } },
    })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Release each active bid: decrement lock + create ledger record
    const releaseOps = auction.bids.flatMap(bid => [
      prisma.user.update({
        where: { id: bid.userId },
        data:  { lockedBalance: { decrement: bid.amount } },
      }),
      prisma.transaction.create({
        data: { toUserId: bid.userId, amount: bid.amount, type: 'auction_cancel_release',
          description: `Auction cancelled by admin: ${auction.edition.item.name} — bid released` },
      }),
    ])

    await prisma.$transaction([
      ...releaseOps,
      prisma.bid.updateMany({ where: { auctionId: id, status: 'active' }, data: { status: 'refunded' } }),
      prisma.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } }),
      prisma.auction.update({ where: { id }, data: { status: 'cancelled' } }),
    ])
    return NextResponse.json({ ok: true })
  }

  if (action === 'reverse') {
    const auction = await prisma.auction.findUnique({
      where:   { id },
      include: { bids: { where: { status: 'won' } }, edition: { include: { item: { select: { name: true } } } } },
    })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (auction.status !== 'settled') {
      return NextResponse.json({ error: 'Only settled auctions can be reversed' }, { status: 400 })
    }

    const winBid    = auction.bids[0]
    const winAmount = auction.winningBid ?? winBid?.amount

    const editionOp = prisma.itemEdition.update({
      where: { id: auction.editionId },
      data:  { currentOwnerId: auction.sellerId ?? null, isInAuction: false, isListed: false },
    })
    const auctionOp = prisma.auction.update({
      where: { id },
      data:  { status: 'reversed', winningBid: null, currentWinnerId: null },
    })
    // Ownership: close current (winner's) ownership record, re-open seller's
    const ownershipCloseOp = prisma.ownership.updateMany({
      where: { editionId: auction.editionId, endedAt: null },
      data:  { endedAt: new Date() },
    })

    const winnerRefundOps = winBid && winAmount ? [
      prisma.user.update({ where: { id: winBid.userId }, data: { balance: { increment: winAmount } } }),
      prisma.bid.update({ where: { id: winBid.id }, data: { status: 'refunded' } }),
      prisma.transaction.create({
        data: { toUserId: winBid.userId, amount: winAmount, type: 'reversal',
          description: `Admin reversal: ${auction.edition.item.name} — winner refunded` },
      }),
    ] : []

    const sellerClawbackOps = !auction.isSystemAuction && auction.sellerId && winAmount ? [
      prisma.user.update({ where: { id: auction.sellerId }, data: { balance: { decrement: winAmount } } }),
      prisma.transaction.create({
        data: { fromUserId: auction.sellerId, amount: winAmount, type: 'reversal',
          description: `Admin reversal: ${auction.edition.item.name} — proceeds clawed back` },
      }),
    ] : []

    await prisma.$transaction([editionOp, auctionOp, ownershipCloseOp, ...winnerRefundOps, ...sellerClawbackOps])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
