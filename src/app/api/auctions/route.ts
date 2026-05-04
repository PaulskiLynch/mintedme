import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { editionId, startingBid, durationHours } = await req.json()
  if (!editionId || !startingBid || startingBid <= 0) return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  const hours = [1, 6, 12, 24, 48, 72].includes(Number(durationHours)) ? Number(durationHours) : 24

  try {
    const result = await prisma.$transaction(async (tx) => {
      const edition = await tx.itemEdition.findUnique({ where: { id: editionId } })
      if (!edition) throw new Error('Edition not found')
      if (edition.currentOwnerId !== session.user.id) throw new Error('Not your item')
      if (edition.isInAuction) throw new Error('Already in auction')
      if (edition.isFrozen) throw new Error('Item is frozen')

      const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000)
      const auction = await tx.auction.create({
        data: { editionId, sellerId: session.user.id, startingBid, endsAt },
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
