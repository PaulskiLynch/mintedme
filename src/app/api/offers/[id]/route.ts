import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { availableBalance } from '@/lib/balance'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action, counterAmount, message } = await req.json()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { edition: { include: { item: true } } },
      })
      if (!offer)                     throw new Error('Offer not found')
      if (offer.status !== 'pending') throw new Error('Offer is no longer pending')
      if (offer.expiresAt < new Date()) throw new Error('Offer has expired')

      // Who can act on this offer?
      // - Seller can always act on pending offers on their items
      // - Buyer can act on counter offers (counterOfferId !== null) — responding to seller's counter
      const isSellerActing = offer.edition.currentOwnerId === session.user.id
      const isBuyerActing  = !!offer.counterOfferId && offer.buyerId === session.user.id

      if (!isSellerActing && !isBuyerActing) throw new Error('Not authorized')

      // ── Accept ─────────────────────────────────────────────────────────────────
      if (action === 'accept') {
        const sellerId = offer.edition.currentOwnerId!
        const buyerId  = offer.buyerId
        const price    = Number(offer.amount)

        const buyer = await tx.user.findUnique({ where: { id: buyerId } })
        if (!buyer) throw new Error('Buyer not found')

        // Check available balance (total minus bid locks minus other pending offer reservations)
        const otherOffers = await tx.offer.aggregate({
          where: { buyerId, status: 'pending', id: { not: id } },
          _sum: { amount: true },
        })
        const reserved   = Number(otherOffers._sum.amount ?? 0)
        const buyerAvail = availableBalance(buyer) - reserved
        if (buyerAvail < price) throw new Error('Buyer has insufficient available balance')

        const creatorId  = offer.edition.item.creatorId
        const creatorPct = creatorId && creatorId !== sellerId ? 0.2 : 0
        const creatorCut = Math.floor(price * creatorPct)
        const sellerGets = price - creatorCut

        await tx.user.update({ where: { id: buyerId  }, data: { balance: { decrement: price      } } })
        await tx.user.update({ where: { id: sellerId }, data: { balance: { increment: sellerGets } } })
        if (creatorId && creatorCut > 0) {
          await tx.user.update({ where: { id: creatorId }, data: { balance: { increment: creatorCut } } })
          await tx.transaction.create({ data: { toUserId: creatorId, editionId: offer.editionId, amount: creatorCut, type: 'creator_earning' } })
        }

        await tx.itemEdition.update({
          where: { id: offer.editionId },
          data: { currentOwnerId: buyerId, lastSalePrice: price, lastSaleDate: new Date(), isListed: false, listedPrice: null, highestOffer: null },
        })
        await tx.offer.update({ where: { id }, data: { status: 'accepted' } })
        await tx.offer.updateMany({
          where: { editionId: offer.editionId, status: 'pending', id: { not: id } },
          data: { status: 'expired' },
        })
        await tx.ownership.updateMany({ where: { editionId: offer.editionId, endedAt: null }, data: { endedAt: new Date() } })
        await tx.ownership.create({ data: { editionId: offer.editionId, ownerId: buyerId, purchasePrice: price, transferType: 'offer_accept' } })
        await tx.priceHistory.create({ data: { editionId: offer.editionId, price, transactionType: 'sale' } })
        await tx.transaction.create({
          data: { fromUserId: buyerId, toUserId: sellerId, editionId: offer.editionId, offerId: id, amount: price, type: 'purchase' },
        })
        await tx.feedEvent.create({ data: { eventType: 'accept', userId: sellerId, targetUserId: buyerId, editionId: offer.editionId, amount: price } })

        // Notify the other party
        const notifyUserId = isBuyerActing ? sellerId : buyerId
        const notifyMsg    = isBuyerActing
          ? `Your counter on ${offer.edition.item.name} was accepted — sold for $${price.toLocaleString()}!`
          : `Your offer on ${offer.edition.item.name} was accepted!`
        await tx.notification.create({
          data: { userId: notifyUserId, type: 'offer_accepted', message: notifyMsg, actionUrl: `/item/${offer.editionId}` },
        })
      }

      // ── Decline ────────────────────────────────────────────────────────────────
      else if (action === 'decline') {
        await tx.offer.update({ where: { id }, data: { status: 'declined' } })

        const notifyUserId = isBuyerActing ? offer.edition.currentOwnerId! : offer.buyerId
        const notifyMsg    = isBuyerActing
          ? `Your counter offer on ${offer.edition.item.name} was declined.`
          : `Your offer on ${offer.edition.item.name} was declined.`
        await tx.notification.create({
          data: { userId: notifyUserId, type: 'offer_declined', message: notifyMsg, actionUrl: '/inbox' },
        })
      }

      // ── Counter (seller only) ──────────────────────────────────────────────────
      else if (action === 'counter' && counterAmount) {
        if (!isSellerActing) throw new Error('Only the seller can send a counter offer')

        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
        const counter = await tx.offer.create({
          data: {
            editionId:      offer.editionId,
            buyerId:        offer.buyerId,
            amount:         counterAmount,
            message:        message || null,
            expiresAt,
            isFundsReserved: false,
            counterOfferId: id,
          },
        })
        await tx.offer.update({ where: { id }, data: { status: 'countered' } })
        await tx.notification.create({
          data: {
            userId:    offer.buyerId,
            type:      'offer_countered',
            message:   `Counter offer of $${Number(counterAmount).toLocaleString()} on ${offer.edition.item.name}`,
            actionUrl: '/inbox',
          },
        })
        return { ok: true, counterId: counter.id }
      }

      else {
        throw new Error('Invalid action')
      }

      return { ok: true }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Action failed' }, { status: 400 })
  }
}
