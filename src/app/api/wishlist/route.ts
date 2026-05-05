import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })

  const existing = await prisma.wishlist.findUnique({
    where: { userId_itemId: { userId: session.user.id, itemId } },
  })

  if (existing) {
    await prisma.wishlist.delete({ where: { userId_itemId: { userId: session.user.id, itemId } } })
    return NextResponse.json({ wishlisted: false })
  } else {
    await prisma.wishlist.create({ data: { userId: session.user.id, itemId } })
    return NextResponse.json({ wishlisted: true })
  }
}
