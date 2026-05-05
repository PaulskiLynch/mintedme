import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: feedEventId } = await params

  const existing = await prisma.feedLike.findUnique({
    where: { userId_feedEventId: { userId: session.user.id, feedEventId } },
  })

  if (existing) {
    await prisma.feedLike.delete({ where: { userId_feedEventId: { userId: session.user.id, feedEventId } } })
    const count = await prisma.feedLike.count({ where: { feedEventId } })
    return NextResponse.json({ liked: false, count })
  } else {
    await prisma.feedLike.create({ data: { userId: session.user.id, feedEventId } })
    const count = await prisma.feedLike.count({ where: { feedEventId } })
    return NextResponse.json({ liked: true, count })
  }
}
