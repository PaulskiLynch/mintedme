import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId: followingId } = await params
  if (followingId === session.user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId } },
  })

  if (existing) {
    await prisma.follow.delete({ where: { followerId_followingId: { followerId: session.user.id, followingId } } })
    return NextResponse.json({ following: false })
  } else {
    await prisma.follow.create({ data: { followerId: session.user.id, followingId } })
    return NextResponse.json({ following: true })
  }
}
