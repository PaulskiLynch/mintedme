import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { availableBalance } from '@/lib/balance'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { editionId, amount, message } = await req.json()
  const buyerId = session.user.id

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const edition = await tx.itemEdition.findUnique({ where: { id: editionId }, include: { item: true } })
      if (!edition)         throw new Error('Edition not found')
      if (edition.isFrozen) throw new Error('Item is frozen')
      if (edition.currentOwnerId === buyerId) throw new Error('You own this item')

      const buyer = await tx.user.findUnique({ where: { id: buyerId } })
      if (!buyer) throw new Error('Not found')

      // Available = total minus bid locks minus funds reserved in other pending offers
      const activeOffers = await tx.offer.aggregate({ where: { buyerId, status: 'pending' }, _sum: { amount: true } })
      const reservedOffers = Number(activeOffers._sum.amount ?? 0)
      const available      = availableBalance(buyer) - reservedOffers
      if (available < amount) throw new Error(`Insufficient available balance. You have $${available.toLocaleString()} spendable after bid holds and pending offers.`)

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const offer = await tx.offer.create({
        data: { editionId, buyerId, amount, message, expiresAt, isFundsReserved: true },
      })

      // Update edition highest offer
      const highest = Math.max(amount, Number(edition.highestOffer ?? 0))
      await tx.itemEdition.update({ where: { id: editionId }, data: { highestOffer: highest } })

      // Notify owner
      if (edition.currentOwnerId) {
        await tx.notification.create({
          data: {
            userId: edition.currentOwnerId,
            type: 'offer_received',
            message: `New offer of $${amount.toLocaleString()} on your ${edition.item.name}`,
            relatedEntityId: offer.id,
            actionUrl: `/inbox`,
          },
        })
        await tx.feedEvent.create({
          data: { eventType: 'offer', userId: buyerId, targetUserId: edition.currentOwnerId, editionId, amount },
        })
      }

      return { ok: true, offerId: offer.id }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Offer failed' }, { status: 400 })
  }
}
