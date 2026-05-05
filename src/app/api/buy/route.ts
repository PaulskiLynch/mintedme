import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { maxEditions } from '@/lib/supply'

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
      const price = isPrimarySale ? Number(edition.item.minimumBid) : Number(edition.listedPrice)

      const buyer = await tx.user.findUnique({ where: { id: buyerId } })
      if (!buyer) throw new Error('Buyer not found')
      if (Number(buyer.balance) < price) throw new Error('Insufficient balance')

      const sellerId  = edition.currentOwnerId ?? null
      const creatorId = edition.item.creatorId ?? null
      const creatorPct = creatorId && (isPrimarySale || creatorId !== sellerId) ? (isPrimarySale ? 0.8 : 0.2) : 0
      const creatorCut = Math.floor(price * creatorPct)
      const sellerGets = sellerId ? price - creatorCut : 0

      await tx.user.update({ where: { id: buyerId }, data: { balance: { decrement: price } } })
      if (sellerId) await tx.user.update({ where: { id: sellerId }, data: { balance: { increment: sellerGets } } })
      if (creatorId && creatorCut > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { balance: { increment: creatorCut } } })
        await tx.transaction.create({ data: { toUserId: creatorId, editionId, amount: creatorCut, type: 'creator_earning', description: `Creator earning: ${edition.item.name}` } })
      }

      await tx.itemEdition.update({
        where: { id: editionId },
        data: { currentOwnerId: buyerId, lastSalePrice: price, lastSaleDate: new Date(), isListed: false, listedPrice: null },
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

      return { ok: true, txnId: txn.id, editionId }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Purchase failed' }, { status: 400 })
  }
}
