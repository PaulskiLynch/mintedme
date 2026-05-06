import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

const DURATION_MS = 3 * 24 * 60 * 60 * 1000  // always 3 days

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { editionId, startingBid } = await req.json()
  if (!editionId) return NextResponse.json({ error: 'editionId required' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const edition = await tx.itemEdition.findUnique({
        where: { id: editionId },
        include: { item: { select: { benchmarkPrice: true, rarityTier: true, minimumBid: true, name: true, id: true } } },
      })
      if (!edition)                                   throw new Error('Edition not found')
      if (edition.currentOwnerId !== session.user.id) throw new Error('Not your item')
      if (edition.isInAuction)                        throw new Error('Already in auction')
      if (edition.isFrozen)                           throw new Error('Item is frozen')

      const benchmark  = Number(edition.item.benchmarkPrice)
      const defaultBid = Math.round(benchmark * 0.10)
      const minBid     = Math.max(defaultBid, Number(edition.item.minimumBid))
      const resolvedStartingBid = startingBid && Number(startingBid) > 0
        ? Math.max(Number(startingBid), 1)
        : minBid

      const now    = new Date()
      const endsAt = new Date(now.getTime() + DURATION_MS)

      const auction = await tx.auction.create({
        data: {
          editionId,
          sellerId:       session.user.id,
          minimumBid:     resolvedStartingBid,
          benchmarkPrice: benchmark,
          rarityTier:     edition.item.rarityTier,
          status:         'active',
          startsAt:       now,
          endsAt,
        },
      })

      await tx.itemEdition.update({
        where: { id: editionId },
        data: { isInAuction: true, isListed: false, listedPrice: null },
      })

      // Notify wishlist followers
      const wishlisters = await tx.wishlist.findMany({
        where: { itemId: edition.item.id, userId: { not: session.user.id } },
        select: { userId: true },
      })
      if (wishlisters.length > 0) {
        await tx.notification.createMany({
          data: wishlisters.map(w => ({
            userId:          w.userId,
            type:            'wishlist_auction',
            message:         `${edition.item.name} is now in auction — place your bid!`,
            relatedEntityId: auction.id,
            actionUrl:       `/auction/${auction.id}`,
          })),
        })
      }

      return { ok: true, auctionId: auction.id }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
