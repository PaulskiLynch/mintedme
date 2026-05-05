import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: feedEventId } = await params
  const body = await req.json().catch(() => ({}))
  const type: string = body.type ?? 'like'

  const existing = await prisma.feedLike.findUnique({
    where: { userId_feedEventId: { userId: session.user.id, feedEventId } },
  })

  if (existing) {
    if (existing.type === type) {
      // Same reaction → unreact
      await prisma.feedLike.delete({ where: { userId_feedEventId: { userId: session.user.id, feedEventId } } })
      const count = await prisma.feedLike.count({ where: { feedEventId } })
      return NextResponse.json({ reacted: false, type: null, count })
    } else {
      // Different reaction → switch
      await prisma.feedLike.update({ where: { userId_feedEventId: { userId: session.user.id, feedEventId } }, data: { type } })
      const count = await prisma.feedLike.count({ where: { feedEventId } })
      return NextResponse.json({ reacted: true, type, count })
    }
  } else {
    await prisma.feedLike.create({ data: { userId: session.user.id, feedEventId, type } })
    const count = await prisma.feedLike.count({ where: { feedEventId } })
    return NextResponse.json({ reacted: true, type, count })
  }
}
