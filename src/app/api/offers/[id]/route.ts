import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { availableBalance } from '@/lib/balance'

// Accept or decline an offer
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action, counterAmount } = await req.json() // action: accept | decline | counter

  try {
    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { edition: { include: { item: true } } },
      })
      if (!offer)                throw new Error('Offer not found')
      if (offer.status !== 'pending') throw new Error('Offer is no longer pending')
      if (offer.expiresAt < new Date()) throw new Error('Offer has expired')
      if (offer.edition.currentOwnerId !== session.user.id) throw new Error('Not your item')

      if (action === 'accept') {
        const sellerId = session.user.id
        const buyerId  = offer.buyerId
        const price    = Number(offer.amount)

        const buyer = await tx.user.findUnique({ where: { id: buyerId } })
        if (!buyer) throw new Error('Buyer not found')
        if (availableBalance(buyer) < price) throw new Error('Buyer has insufficient available balance')

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
        await tx.offer.updateMany({ where: { editionId: offer.editionId, status: 'pending', id: { not: id } }, data: { status: 'expired' } })

        await tx.ownership.updateMany({ where: { editionId: offer.editionId, endedAt: null }, data: { endedAt: new Date() } })
        await tx.ownership.create({ data: { editionId: offer.editionId, ownerId: buyerId, purchasePrice: price, transferType: 'offer_accept' } })
        await tx.priceHistory.create({ data: { editionId: offer.editionId, price, transactionType: 'sale' } })
        await tx.transaction.create({ data: { fromUserId: buyerId, toUserId: sellerId, editionId: offer.editionId, offerId: id, amount: price, type: 'purchase' } })
        await tx.feedEvent.create({ data: { eventType: 'accept', userId: sellerId, targetUserId: buyerId, editionId: offer.editionId, amount: price } })
        await tx.notification.create({ data: { userId: buyerId, type: 'offer_accepted', message: `Your offer on ${offer.edition.item.name} was accepted!`, actionUrl: `/item/${offer.editionId}` } })

      } else if (action === 'decline') {
        await tx.offer.update({ where: { id }, data: { status: 'declined' } })
        await tx.notification.create({ data: { userId: offer.buyerId, type: 'offer_declined', message: `Your offer on ${offer.edition.item.name} was declined.`, actionUrl: `/item/${offer.editionId}` } })

      } else if (action === 'counter' && counterAmount) {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
        const counter = await tx.offer.create({
          data: { editionId: offer.editionId, buyerId: offer.buyerId, amount: counterAmount, expiresAt, isFundsReserved: false, counterOfferId: id },
        })
        await tx.offer.update({ where: { id }, data: { status: 'countered' } })
        await tx.notification.create({ data: { userId: offer.buyerId, type: 'offer_countered', message: `Counter offer of $${Number(counterAmount).toLocaleString()} on ${offer.edition.item.name}`, actionUrl: `/inbox` } })
        return { ok: true, counterId: counter.id }
      }

      return { ok: true }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Action failed' }, { status: 400 })
  }
}
