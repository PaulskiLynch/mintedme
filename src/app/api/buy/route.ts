import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { editionId } = await req.json()
  const buyerId = session.user.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      const edition = await tx.itemEdition.findUnique({
        where: { id: editionId },
        include: { item: true },
      })
      if (!edition)         throw new Error('Edition not found')
      if (!edition.isListed || !edition.listedPrice) throw new Error('Item is not listed for sale')
      if (edition.isFrozen) throw new Error('Item is frozen')
      if (edition.currentOwnerId === buyerId) throw new Error('You already own this item')
      if (edition.isInAuction) throw new Error('Item is in auction')

      const buyer = await tx.user.findUnique({ where: { id: buyerId } })
      if (!buyer) throw new Error('Buyer not found')

      const price = Number(edition.listedPrice)
      if (Number(buyer.balance) < price) throw new Error('Insufficient balance')

      const sellerId  = edition.currentOwnerId!
      const creatorId = edition.item.creatorId
      const creatorPct = creatorId && creatorId !== sellerId ? 0.2 : 0

      const creatorCut = Math.floor(price * creatorPct)
      const sellerGets = price - creatorCut

      // Deduct buyer
      await tx.user.update({ where: { id: buyerId }, data: { balance: { decrement: price } } })
      // Pay seller
      await tx.user.update({ where: { id: sellerId }, data: { balance: { increment: sellerGets } } })
      // Pay creator royalty
      if (creatorId && creatorCut > 0) {
        await tx.user.update({ where: { id: creatorId }, data: { balance: { increment: creatorCut } } })
        await tx.transaction.create({ data: { toUserId: creatorId, editionId, amount: creatorCut, type: 'creator_earning', description: `Creator royalty: ${edition.item.name}` } })
      }

      // Transfer item
      await tx.itemEdition.update({
        where: { id: editionId },
        data: {
          currentOwnerId: buyerId,
          lastSalePrice:  price,
          lastSaleDate:   new Date(),
          isListed:       false,
          listedPrice:    null,
        },
      })

      // Close any pending offers (refund reserved)
      await tx.offer.updateMany({ where: { editionId, status: 'pending' }, data: { status: 'expired' } })

      // Transactions
      const txn = await tx.transaction.create({ data: { fromUserId: buyerId, toUserId: sellerId, editionId, amount: price, type: 'purchase', description: `Bought ${edition.item.name} #${edition.editionNumber}` } })
      await tx.transaction.create({ data: { fromUserId: buyerId, toUserId: sellerId, editionId, amount: sellerGets, type: 'sale', description: `Sold ${edition.item.name} #${edition.editionNumber}` } })

      // Ownership record
      await tx.ownership.updateMany({ where: { editionId, endedAt: null }, data: { endedAt: new Date() } })
      await tx.ownership.create({ data: { editionId, ownerId: buyerId, purchasePrice: price, transferType: 'buy' } })

      // Price history
      await tx.priceHistory.create({ data: { editionId, price, transactionType: 'sale' } })

      // Feed event
      await tx.feedEvent.create({
        data: { eventType: 'buy', userId: buyerId, targetUserId: sellerId, editionId, amount: price },
      })

      // Notify seller
      await tx.notification.create({
        data: { userId: sellerId, type: 'item_sold', message: `Your ${edition.item.name} sold for $${price.toLocaleString()}`, relatedEntityId: editionId, actionUrl: `/item/${editionId}` },
      })

      return { ok: true, txnId: txn.id }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Purchase failed' }, { status: 400 })
  }
}
