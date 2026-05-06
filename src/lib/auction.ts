import { prisma } from './db'
export { bidIncrement } from './bidIncrement'

const STEAL_THRESHOLD    = 0.80   // price < 80% of benchmark
const OVERPAID_THRESHOLD = 1.20   // price > 120% of benchmark

export async function settleAuction(auctionId: string) {
  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { edition: { include: { item: { select: { name: true } } } } },
    })
    if (!auction) throw new Error('Auction not found')
    if (auction.status === 'settled') return { result: 'already_settled' as const }

    // No bids — close and release any locked funds
    if (!auction.currentWinnerId || !auction.currentBid) {
      await tx.auction.update({ where: { id: auctionId }, data: { status: 'settled' } })
      await tx.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } })
      const allBids = await tx.bid.findMany({ where: { auctionId, status: 'active' } })
      for (const b of allBids) {
        await tx.bid.update({ where: { id: b.id }, data: { status: 'lost' } })
        await tx.user.update({ where: { id: b.userId }, data: { lockedBalance: { decrement: Number(b.amount) } } })
      }
      return { result: 'no_bids' as const }
    }

    const winnerId   = auction.currentWinnerId
    const price      = Number(auction.currentBid)
    const benchmark  = Number(auction.benchmarkPrice)
    const pctVsTrue  = Math.round(((price - benchmark) / benchmark) * 100)
    const isSteal    = price < benchmark * STEAL_THRESHOLD
    const isOverpaid = price > benchmark * OVERPAID_THRESHOLD

    // Verify winner exists and isn't frozen
    const winner = await tx.user.findUnique({ where: { id: winnerId } })
    if (!winner || winner.isFrozen) {
      await tx.auction.update({ where: { id: auctionId }, data: { status: 'settled' } })
      await tx.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } })
      const allBids = await tx.bid.findMany({ where: { auctionId, status: 'active' } })
      for (const b of allBids) {
        await tx.bid.update({ where: { id: b.id }, data: { status: 'lost' } })
        await tx.user.update({ where: { id: b.userId }, data: { lockedBalance: { decrement: Number(b.amount) } } })
      }
      return { result: 'no_eligible_winner' as const }
    }

    // Deduct from winner (balance paid + locked funds released)
    await tx.user.update({
      where: { id: winnerId },
      data: { balance: { decrement: price }, lockedBalance: { decrement: price } },
    })
    await tx.bid.updateMany({ where: { auctionId, userId: winnerId }, data: { status: 'won' } })

    // Pay seller — user-owned auctions only; system auctions burn the funds
    if (auction.sellerId && !auction.isSystemAuction) {
      await tx.user.update({ where: { id: auction.sellerId }, data: { balance: { increment: price } } })
    }

    // Unlock all losing bids
    const losingBids = await tx.bid.findMany({
      where: { auctionId, userId: { not: winnerId }, status: 'active' },
    })
    for (const b of losingBids) {
      await tx.bid.update({ where: { id: b.id }, data: { status: 'lost' } })
      await tx.user.update({ where: { id: b.userId }, data: { lockedBalance: { decrement: Number(b.amount) } } })
    }

    // Transfer edition — reset upkeep clock on new ownership
    await tx.itemEdition.update({
      where: { id: auction.editionId },
      data: { currentOwnerId: winnerId, lastSalePrice: price, lastSaleDate: new Date(), isInAuction: false, isListed: false, lastUpkeepAt: new Date(), lastIncomeAt: new Date() },
    })

    await tx.auction.update({
      where: { id: auctionId },
      data: { status: 'settled', winningBid: price, luckyUndervalueWin: isSteal },
    })

    await tx.ownership.updateMany({ where: { editionId: auction.editionId, endedAt: null }, data: { endedAt: new Date() } })
    await tx.ownership.create({ data: { editionId: auction.editionId, ownerId: winnerId, purchasePrice: price, transferType: 'auction_win' } })
    await tx.priceHistory.create({ data: { editionId: auction.editionId, price, transactionType: 'auction' } })
    await tx.transaction.create({
      data: {
        fromUserId:  winnerId,
        toUserId:    auction.sellerId ?? null,
        editionId:   auction.editionId,
        amount:      price,
        type:        'auction_win',
        description: `Won auction: ${auction.edition.item.name}`,
      },
    })

    await tx.feedEvent.create({
      data: {
        eventType: 'auction_end',
        userId:    winnerId,
        editionId: auction.editionId,
        amount:    price,
        metadata: { isSteal, isOverpaid, pctVsTrue, rarityTier: auction.rarityTier, itemName: auction.edition.item.name },
      },
    })

    await tx.notification.create({
      data: {
        userId:    winnerId,
        type:      'auction_won',
        message:   `You won ${auction.edition.item.name} for $${price.toLocaleString()}${isSteal ? ' — Steal!' : isOverpaid ? ' — you overpaid!' : ''}`,
        actionUrl: `/item/${auction.editionId}`,
      },
    })
    if (auction.sellerId) {
      await tx.notification.create({
        data: {
          userId:    auction.sellerId,
          type:      'item_sold',
          message:   `Your ${auction.edition.item.name} sold for $${price.toLocaleString()} in auction`,
          actionUrl: `/item/${auction.editionId}`,
        },
      })
    }

    return { result: 'sold' as const, winnerId, price, isSteal, isOverpaid, pctVsTrue }
  })
}
