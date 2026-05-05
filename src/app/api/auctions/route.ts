import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { editionId, minimumBid, durationHours } = await req.json()
  if (!editionId || !minimumBid || minimumBid <= 0) return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  const hours = [1, 6, 12, 24, 48, 72].includes(Number(durationHours)) ? Number(durationHours) : 24

  try {
    const result = await prisma.$transaction(async (tx) => {
      const edition = await tx.itemEdition.findUnique({
        where: { id: editionId },
        include: { item: { select: { benchmarkPrice: true, rarityTier: true, minimumBid: true } } },
      })
      if (!edition) throw new Error('Edition not found')
      if (edition.currentOwnerId !== session.user.id) throw new Error('Not your item')
      if (edition.isInAuction) throw new Error('Already in auction')
      if (edition.isFrozen) throw new Error('Item is frozen')

      const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000)
      const auction = await tx.auction.create({
        data: {
          editionId,
          sellerId:       session.user.id,
          minimumBid:     Math.max(Number(minimumBid), Number(edition.item.minimumBid)),
          benchmarkPrice: Number(edition.item.benchmarkPrice),
          rarityTier:     edition.item.rarityTier,
          endsAt,
        },
      })

      await tx.itemEdition.update({
        where: { id: editionId },
        data: { isInAuction: true, isListed: false, listedPrice: null },
      })

      return { ok: true, auctionId: auction.id }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
