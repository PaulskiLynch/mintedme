import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id },
        include: { edition: { include: { item: true } } },
      })
      if (!auction) throw new Error('Auction not found')
      if (auction.status !== 'active') throw new Error('Auction already ended')

      const isExpired = auction.endsAt < new Date()
      const isSeller  = auction.sellerId === session.user.id
      if (!isExpired && !isSeller) throw new Error('Auction has not ended yet')

      if (!auction.currentWinnerId || !auction.currentBid) {
        // No bids — just cancel and restore
        await tx.auction.update({ where: { id }, data: { status: 'cancelled' } })
        await tx.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } })
        return { ok: true, result: 'no_bids' }
      }

      const winnerId = auction.currentWinnerId
      const sellerId = auction.sellerId
      const price    = Number(auction.currentBid)

      const winner = await tx.user.findUnique({ where: { id: winnerId } })
      if (!winner) throw new Error('Winner not found')
      if (Number(winner.balance) < price) throw new Error('Winner has insufficient balance')

      const creatorId  = auction.edition.item.creatorId
      const creatorPct = creatorId && creatorId !== sellerId ? 0.2 : 0
      const creatorCut = Math.floor(price * creatorPct)
      const sellerGets = price - creatorCut

      await tx.user.update({ where: { id: winnerId }, data: { balance: { decrement: price } } })
      await tx.user.update({ where: { id: sellerId }, data: { balance: { increment: sellerGets } } })
      if (creatorId && creatorCut > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { balance: { increment: creatorCut } } })
        await tx.transaction.create({ data: { toUserId: creatorId, editionId: auction.editionId, amount: creatorCut, type: 'creator_earning' } })
      }

      await tx.itemEdition.update({
        where: { id: auction.editionId },
        data: { currentOwnerId: winnerId, lastSalePrice: price, lastSaleDate: new Date(), isInAuction: false, isListed: false, listedPrice: null },
      })
      await tx.auction.update({ where: { id }, data: { status: 'ended' } })

      await tx.ownership.updateMany({ where: { editionId: auction.editionId, endedAt: null }, data: { endedAt: new Date() } })
      await tx.ownership.create({ data: { editionId: auction.editionId, ownerId: winnerId, purchasePrice: price, transferType: 'auction' } })
      await tx.priceHistory.create({ data: { editionId: auction.editionId, price, transactionType: 'auction' } })
      await tx.transaction.create({ data: { fromUserId: winnerId, toUserId: sellerId, editionId: auction.editionId, amount: price, type: 'auction_sale', description: `Won auction: ${auction.edition.item.name}` } })
      await tx.feedEvent.create({ data: { eventType: 'buy', userId: winnerId, targetUserId: sellerId, editionId: auction.editionId, amount: price } })

      await tx.notification.create({
        data: { userId: winnerId, type: 'auction_won', message: `You won the auction for ${auction.edition.item.name}! $${price.toLocaleString()}`, actionUrl: `/item/${auction.editionId}` },
      })
      await tx.notification.create({
        data: { userId: sellerId, type: 'item_sold', message: `Your ${auction.edition.item.name} sold at auction for $${price.toLocaleString()}`, actionUrl: `/item/${auction.editionId}` },
      })

      return { ok: true, result: 'sold', winnerId, price }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
