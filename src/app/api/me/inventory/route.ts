import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const editions = await prisma.itemEdition.findMany({
    where: { currentOwnerId: session.user.id, isFrozen: false, isInAuction: false },
    include: { item: { select: { name: true, imageUrl: true, referencePrice: true } } },
    orderBy: { lastSalePrice: 'desc' },
  })

  return NextResponse.json({
    items: editions.map((e: typeof editions[0]) => ({
      editionId:    e.id,
      itemName:     e.item.name,
      imageUrl:     e.item.imageUrl,
      isListed:     e.isListed,
      listedPrice:  e.listedPrice?.toString() ?? null,
      lastSalePrice: e.lastSalePrice?.toString() ?? null,
      referencePrice: e.item.referencePrice?.toString() ?? null,
    })),
  })
}
