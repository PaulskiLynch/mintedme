import { prisma } from './db'
export { bidIncrement } from './bidIncrement'

const STEAL_THRESHOLD    = 0.80   // price < 80% of benchmark
const OVERPAID_THRESHOLD = 1.20   // price > 120% of benchmark
export const PLATFORM_FEE_RATE = 0.05  // 5% commission on user-initiated auction sales

export async function settleAuction(auctionId: string) {
  // Claim the auction atomically — prevents double-settlement if cron runs overlap
  const claim = await prisma.auction.updateMany({
    where: { id: auctionId, status: 'active' },
    data:  { status: 'settling' },
  })

  if (claim.count === 0) {
    const current = await prisma.auction.findUnique({ where: { id: auctionId }, select: { status: true } })
    if (current?.status === 'settled') return { result: 'already_settled' as const }
    if (current?.status === 'settling') return { result: 'already_processing' as const }
    return { result: 'already_settled' as const }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: { edition: { include: { item: { select: { name: true } } } } },
      })
      if (!auction) throw new Error('Auction not found')

      const releaseBid = async (bidId: string, userId: string, amount: number) => {
        await tx.bid.update({ where: { id: bidId }, data: { status: 'lost' } })
        await tx.user.update({ where: { id: userId }, data: { lockedBalance: { decrement: amount } } })
        await tx.transaction.create({
          data: { toUserId: userId, amount, type: 'auction_bid_release',
            description: `Bid released: auction ${auctionId} — ${auction.edition.item.name}` },
        })
      }

      // No bids — release any stale locks and close cleanly
      if (!auction.currentWinnerId || !auction.currentBid) {
        await tx.auction.update({ where: { id: auctionId }, data: { status: 'ended_no_sale' } })
        await tx.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } })
        const allBids = await tx.bid.findMany({ where: { auctionId, status: 'active' } })
        for (const b of allBids) await releaseBid(b.id, b.userId, Number(b.amount))
        return { result: 'no_bids' as const }
      }

      const winnerId   = auction.currentWinnerId
      const price      = Number(auction.currentBid)
      const benchmark  = Number(auction.benchmarkPrice)
      const pctVsTrue  = Math.round(((price - benchmark) / benchmark) * 100)
      const isSteal    = price < benchmark * STEAL_THRESHOLD
      const isOverpaid = price > benchmark * OVERPAID_THRESHOLD

      // Verify winner — if frozen, fail cleanly
      const winner = await tx.user.findUnique({ where: { id: winnerId } })
      if (!winner || winner.isFrozen) {
        await tx.auction.update({ where: { id: auctionId }, data: { status: 'failed' } })
        await tx.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } })
        const allBids = await tx.bid.findMany({ where: { auctionId, status: 'active' } })
        for (const b of allBids) await releaseBid(b.id, b.userId, Number(b.amount))
        return { result: 'no_eligible_winner' as const }
      }

      // Deduct from winner: balance decreases, lock released simultaneously
      await tx.user.update({
        where: { id: winnerId },
        data: { balance: { decrement: price }, lockedBalance: { decrement: price } },
      })
      await tx.bid.updateMany({ where: { auctionId, userId: winnerId }, data: { status: 'won' } })
      await tx.transaction.create({
        data: { fromUserId: winnerId, editionId: auction.editionId, amount: price,
          type: 'auction_settlement_debit',
          description: `Auction won: ${auction.edition.item.name} — $${price.toLocaleString()}` },
      })

      // Pay seller / clear debt / burn (system auction)
      if (auction.liquidationUserId) {
        const debtor      = await tx.user.findUnique({ where: { id: auction.liquidationUserId }, select: { debtAmount: true } })
        const debt        = Number(debtor?.debtAmount ?? 0)
        const debtCleared = Math.min(price, debt)
        const remainder   = price - debtCleared
        await tx.user.update({
          where: { id: auction.liquidationUserId },
          data: {
            ...(debtCleared > 0 ? { debtAmount: { decrement: debtCleared } } : {}),
            ...(remainder   > 0 ? { balance:    { increment: remainder   } } : {}),
          },
        })
        if (remainder > 0 || debtCleared > 0) {
          await tx.transaction.create({
            data: { toUserId: auction.liquidationUserId, editionId: auction.editionId,
              amount: price, type: 'auction_settlement_credit',
              description: `Liquidation sale: ${auction.edition.item.name} — $${debtCleared.toLocaleString()} debt cleared${remainder > 0 ? `, $${remainder.toLocaleString()} returned` : ''}` },
          })
        }
        await tx.notification.create({
          data: {
            userId:    auction.liquidationUserId,
            type:      'liquidation_settled',
            message:   `Your ${auction.edition.item.name} sold for $${price.toLocaleString()} — $${debtCleared.toLocaleString()} cleared your upkeep debt${remainder > 0 ? `, $${remainder.toLocaleString()} returned to your balance` : ''}.`,
            actionUrl: '/wallet',
          },
        })
      } else if (auction.sellerId && !auction.isSystemAuction) {
        const fee      = Math.round(price * PLATFORM_FEE_RATE)
        const proceeds = price - fee
        await tx.user.update({ where: { id: auction.sellerId }, data: { balance: { increment: proceeds } } })
        await tx.transaction.create({
          data: { toUserId: auction.sellerId, editionId: auction.editionId, amount: proceeds,
            type: 'auction_settlement_credit',
            description: `Auction sale (5% fee deducted): ${auction.edition.item.name}` },
        })
      }

      // Release all losing bid locks with ledger records
      const losingBids = await tx.bid.findMany({
        where: { auctionId, userId: { not: winnerId }, status: 'active' },
      })
      for (const b of losingBids) await releaseBid(b.id, b.userId, Number(b.amount))

      // Transfer edition
      await tx.itemEdition.update({
        where: { id: auction.editionId },
        data: { currentOwnerId: winnerId, lastSalePrice: price, lastSaleDate: new Date(),
          isInAuction: false, isListed: false, lastUpkeepAt: new Date(), lastIncomeAt: new Date() },
      })

      await tx.auction.update({
        where: { id: auctionId },
        data: { status: 'settled', winningBid: price, luckyUndervalueWin: isSteal },
      })

      await tx.ownership.updateMany({ where: { editionId: auction.editionId, endedAt: null }, data: { endedAt: new Date() } })
      await tx.ownership.create({ data: { editionId: auction.editionId, ownerId: winnerId, purchasePrice: price, transferType: 'auction_win' } })
      await tx.priceHistory.create({ data: { editionId: auction.editionId, price, transactionType: 'auction' } })

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
      if (auction.sellerId && !auction.isSystemAuction) {
        const proceeds = Math.round(price * (1 - PLATFORM_FEE_RATE))
        const fee      = price - proceeds
        await tx.notification.create({
          data: {
            userId:    auction.sellerId,
            type:      'item_sold',
            message:   `Your ${auction.edition.item.name} sold for $${price.toLocaleString()} — you received $${proceeds.toLocaleString()} after $${fee.toLocaleString()} platform fee.`,
            actionUrl: '/wallet',
          },
        })
      }

      return { result: 'sold' as const, winnerId, price, isSteal, isOverpaid, pctVsTrue }
    })
  } catch (err) {
    // Settlement transaction failed — mark as failed so it can be investigated
    await prisma.auction.update({ where: { id: auctionId }, data: { status: 'failed' } }).catch(() => null)
    throw err
  }
}
