import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { maxEditions } from '@/lib/supply'
import { snapshotRanks } from '@/lib/ranks'
import { availableBalance } from '@/lib/balance'
import { JOB_BY_CODE, benefitMatchesItem, commissionMatchesTransaction, calcCommission, type ItemForJob } from '@/lib/jobs'

const commissionJobCodes = Object.values(JOB_BY_CODE)
  .filter(j => j.commissionRate > 0)
  .map(j => j.code)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Accept either editionId (specific secondary sale) or itemId (primary — find/mint edition)
  const body = await req.json()
  const buyerId = session.user.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      let editionId: string = body.editionId

      // Primary purchase path: find or mint an available edition for this item
      if (!editionId && body.itemId) {
        const item = await tx.item.findUnique({ where: { id: body.itemId } })
        if (!item) throw new Error('Item not found')
        if (!item.isApproved) throw new Error('Item not available')

        // Find an existing unowned edition
        const available = await tx.itemEdition.findFirst({
          where: { itemId: body.itemId, currentOwnerId: null, isFrozen: false },
          orderBy: { editionNumber: 'asc' },
        })

        if (available) {
          editionId = available.id
        } else {
          // Check if user count allows a new edition
          const [userCount, mintedCount] = await Promise.all([
            tx.user.count(),
            tx.itemEdition.count({ where: { itemId: body.itemId } }),
          ])
          const allowed = Math.min(item.totalSupply, maxEditions(item.rarityTier, userCount))
          if (mintedCount >= allowed) throw new Error(`Supply locked — available when more users join (currently ${mintedCount}/${allowed})`)

          const newEdition = await tx.itemEdition.create({
            data: { itemId: body.itemId, editionNumber: mintedCount + 1 },
          })
          editionId = newEdition.id
        }
      }

      if (!editionId) throw new Error('No edition specified')

      const edition = await tx.itemEdition.findUnique({
        where: { id: editionId },
        include: { item: true },
      })
      if (!edition)         throw new Error('Edition not found')
      if (edition.isFrozen) throw new Error('Item is frozen')
      if (edition.currentOwnerId === buyerId) throw new Error('You already own this item')
      if (edition.isInAuction) throw new Error('Item is in auction')

      const isPrimarySale = !edition.currentOwnerId
      if (!isPrimarySale && (!edition.isListed || !edition.listedPrice)) throw new Error('Item is not listed for sale')

      let price: number
      if (isPrimarySale) {
        const suggestion = await tx.creatorSubmission.findFirst({
          where: { creatorId: buyerId, linkedItemId: edition.item.id, status: 'approved', discountUsed: false },
        })
        if (suggestion) {
          price = Math.round(Number(edition.item.benchmarkPrice) * 0.5)
          await tx.creatorSubmission.update({ where: { id: suggestion.id }, data: { discountUsed: true } })
        } else {
          price = Number(edition.item.benchmarkPrice)
        }
      } else {
        price = Number(edition.listedPrice!)
      }

      // Construct item descriptor used for job benefit / commission matching
      const itemForJob: ItemForJob = {
        category:         '',
        aircraftType:     (edition.item as any).aircraftType     ?? null,
        yachtType:        (edition.item as any).yachtType        ?? null,
        propertyTier:     (edition.item as any).propertyTier     ?? null,
        businessRiskTier: (edition.item as any).businessRiskTier ?? null,
      }

      // Apply buyer's job purchase_discount (does not stack with suggestion discount)
      const buyerJob = await tx.jobHolding.findUnique({ where: { userId: buyerId } })
      if (buyerJob) {
        const buyerJobDef = JOB_BY_CODE[buyerJob.jobCode]
        if (buyerJobDef?.benefitType === 'purchase_discount' &&
            benefitMatchesItem(buyerJobDef.benefitTarget, itemForJob)) {
          price = Math.round(price * (1 - buyerJobDef.benefitValue))
        }
      }

      const buyer = await tx.user.findUnique({ where: { id: buyerId } })
      if (!buyer) throw new Error('Buyer not found')
      if (availableBalance(buyer) < price) throw new Error('Insufficient available balance')

      const sellerId  = edition.currentOwnerId ?? null
      const creatorId = edition.item.creatorId ?? null
      const creatorPct = creatorId && (isPrimarySale || creatorId !== sellerId) ? (isPrimarySale ? 0.8 : 0.2) : 0
      const creatorCut = Math.floor(price * creatorPct)
      const sellerGets = sellerId ? price - creatorCut : 0

      // Snapshot current ranks for buyer (and seller if any) before net worth changes
      await snapshotRanks(tx as typeof prisma, [buyerId, ...(sellerId ? [sellerId] : [])])

      await tx.user.update({ where: { id: buyerId }, data: { balance: { decrement: price } } })
      if (sellerId) await tx.user.update({ where: { id: sellerId }, data: { balance: { increment: sellerGets } } })
      if (creatorId && creatorCut > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { balance: { increment: creatorCut } } })
        await tx.transaction.create({ data: { toUserId: creatorId, editionId, amount: creatorCut, type: 'creator_earning', description: `Creator earning: ${edition.item.name}` } })
      }

      await tx.itemEdition.update({
        where: { id: editionId },
        data: { currentOwnerId: buyerId, lastSalePrice: price, lastSaleDate: new Date(), isListed: false, listedPrice: null, lastUpkeepAt: new Date(), lastIncomeAt: new Date() },
      })
      await tx.offer.updateMany({ where: { editionId, status: 'pending' }, data: { status: 'expired' } })

      const txn = await tx.transaction.create({
        data: {
          fromUserId: buyerId,
          toUserId:   sellerId ?? buyerId,
          editionId,
          amount:     price,
          type:       isPrimarySale ? 'primary_purchase' : 'purchase',
          description: `Bought ${edition.item.name} #${edition.editionNumber}`,
        },
      })

      await tx.ownership.updateMany({ where: { editionId, endedAt: null }, data: { endedAt: new Date() } })
      await tx.ownership.create({ data: { editionId, ownerId: buyerId, purchasePrice: price, transferType: 'buy' } })
      await tx.priceHistory.create({ data: { editionId, price, transactionType: 'sale' } })
      await tx.feedEvent.create({ data: { eventType: 'buy', userId: buyerId, targetUserId: sellerId ?? buyerId, editionId, amount: price } })

      if (sellerId) {
        await tx.notification.create({ data: { userId: sellerId, type: 'item_sold', message: `Your ${edition.item.name} sold for $${price.toLocaleString()}`, actionUrl: `/item/${editionId}` } })
      }

      // Pay commissions to eligible job holders — secondary market only
      if (!isPrimarySale && commissionJobCodes.length > 0) {
        const commHolders = await tx.jobHolding.findMany({
          where: { jobCode: { in: commissionJobCodes } },
          select: { userId: true, jobCode: true, monthlySalary: true },
        })
        for (const holder of commHolders) {
          if (holder.userId === buyerId || holder.userId === sellerId) continue
          const jd = JOB_BY_CODE[holder.jobCode]
          if (!jd || !commissionMatchesTransaction(jd.commissionScope, 'buy', itemForJob)) continue
          const commission = calcCommission(jd.commissionRate, price, holder.monthlySalary)
          if (commission <= 0) continue
          await tx.user.update({ where: { id: holder.userId }, data: { balance: { increment: commission } } })
          await tx.transaction.create({
            data: { toUserId: holder.userId, editionId, amount: commission, type: 'commission',
              description: `Commission: ${edition.item.name}` },
          })
        }
      }

      return { ok: true, txnId: txn.id, editionId }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Purchase failed' }, { status: 400 })
  }
}
