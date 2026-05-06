import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { minimumBid, startsAt, endsAt } = await req.json()

  try {
    const before = await prisma.auction.findUnique({
      where: { id }, select: { minimumBid: true, startsAt: true, endsAt: true },
    })

    await prisma.auction.update({
      where: { id },
      data: {
        minimumBid: minimumBid ? Number(minimumBid) : undefined,
        startsAt:   startsAt   ? new Date(startsAt) : undefined,
        endsAt:     endsAt     ? new Date(endsAt)   : undefined,
      },
    })

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_auction_edit',
      targetType:  'auction',
      targetId:    id,
      before:      before ? { minimumBid: before.minimumBid.toString(), startsAt: before.startsAt?.toISOString(), endsAt: before.endsAt.toISOString() } : null,
      after:       { minimumBid, startsAt, endsAt },
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
  const { action, reason } = await req.json()

  if (action === 'activate') {
    const auction = await prisma.auction.findUnique({ where: { id } })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.auction.update({
      where: { id },
      data: { status: 'active', startsAt: auction.startsAt ?? new Date() },
    })
    await logAdminAction({ adminUserId: session.user.id!, action: 'admin_auction_activate', targetType: 'auction', targetId: id, before: { status: auction.status }, after: { status: 'active' } })
    return NextResponse.json({ ok: true })
  }

  if (action === 'cancel') {
    if (!reason?.trim()) return NextResponse.json({ error: 'Reason required to cancel an auction' }, { status: 400 })

    const auction = await prisma.auction.findUnique({
      where:   { id },
      include: { bids: { where: { status: 'active' } }, edition: { include: { item: { select: { name: true } } } } },
    })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_auction_cancel',
      targetType:  'auction',
      targetId:    id,
      before:      { status: auction.status, bidCount: auction.bids.length },
      after:       { status: 'cancelled' },
      reason,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'reverse') {
    if (!reason?.trim()) return NextResponse.json({ error: 'Reason required to reverse an auction' }, { status: 400 })

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

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_auction_reverse',
      targetType:  'auction',
      targetId:    id,
      before:      { status: 'settled', winningBid: winAmount?.toString(), winnerId: winBid?.userId },
      after:       { status: 'reversed' },
      reason,
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
