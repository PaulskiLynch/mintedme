import { prisma } from './db'
import { JOB_BY_CODE, benefitMatchesItem, commissionMatchesTransaction, calcCommission, type ItemForJob } from './jobs'
export { bidIncrement } from './bidIncrement'

const commissionJobCodes = Object.values(JOB_BY_CODE)
  .filter(j => j.commissionRate > 0)
  .map(j => j.code)

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

      // Resolve item descriptor for commission / fee_reduction matching
      const auctionEditionItem = await tx.itemEdition.findUnique({
        where: { id: auction.editionId },
        select: { item: { select: { aircraftType: true, yachtType: true, propertyTier: true, businessRiskTier: true } } },
      })
      const itemForJob: ItemForJob = {
        category:         '',
        aircraftType:     auctionEditionItem?.item.aircraftType     ?? null,
        yachtType:        auctionEditionItem?.item.yachtType        ?? null,
        propertyTier:     auctionEditionItem?.item.propertyTier     ?? null,
        businessRiskTier: auctionEditionItem?.item.businessRiskTier ?? null,
      }

      // Pay seller / clear debt / burn (system auction)
      let sellerProceeds = 0
      let effectiveFeeRate = PLATFORM_FEE_RATE
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
        // Check seller's job for fee_reduction benefit on Auctions
        const sellerJob = await tx.jobHolding.findUnique({ where: { userId: auction.sellerId } })
        if (sellerJob) {
          const sellerJobDef = JOB_BY_CODE[sellerJob.jobCode]
          if (sellerJobDef?.benefitType === 'fee_reduction' && sellerJobDef.benefitTarget === 'Auctions') {
            effectiveFeeRate = Math.max(0, PLATFORM_FEE_RATE * (1 - sellerJobDef.benefitValue))
          }
        }
        const fee      = Math.round(price * effectiveFeeRate)
        sellerProceeds = price - fee
        await tx.user.update({ where: { id: auction.sellerId }, data: { balance: { increment: sellerProceeds } } })
        await tx.transaction.create({
          data: { toUserId: auction.sellerId, editionId: auction.editionId, amount: sellerProceeds,
            type: 'auction_settlement_credit',
            description: `Auction sale (${Math.round(effectiveFeeRate * 100)}% fee deducted): ${auction.edition.item.name}` },
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
        const fee = price - sellerProceeds
        await tx.notification.create({
          data: {
            userId:    auction.sellerId,
            type:      'item_sold',
            message:   `Your ${auction.edition.item.name} sold for $${price.toLocaleString()} — you received $${sellerProceeds.toLocaleString()} after $${fee.toLocaleString()} platform fee.`,
            actionUrl: '/wallet',
          },
        })
      }

      // Pay commissions to eligible job holders
      if (commissionJobCodes.length > 0) {
        const commHolders = await tx.jobHolding.findMany({
          where: { jobCode: { in: commissionJobCodes } },
          select: { userId: true, jobCode: true, monthlySalary: true },
        })
        for (const holder of commHolders) {
          if (holder.userId === winnerId || holder.userId === auction.sellerId) continue
          const jd = JOB_BY_CODE[holder.jobCode]
          if (!jd || !commissionMatchesTransaction(jd.commissionScope, 'auction', itemForJob)) continue
          const commission = calcCommission(jd.commissionRate, price, holder.monthlySalary)
          if (commission <= 0) continue
          await tx.user.update({ where: { id: holder.userId }, data: { balance: { increment: commission } } })
          await tx.transaction.create({
            data: { toUserId: holder.userId, editionId: auction.editionId, amount: commission, type: 'commission',
              description: `Commission: ${auction.edition.item.name}` },
          })
        }
      }

      return { result: 'sold' as const, winnerId, price, isSteal, isOverpaid, pctVsTrue }
    })
  } catch (err) {
    // Settlement transaction failed — mark as failed so it can be investigated
    await prisma.auction.update({ where: { id: auctionId }, data: { status: 'failed' } }).catch(() => null)
    throw err
  }
}
