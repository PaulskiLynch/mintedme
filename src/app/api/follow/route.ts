import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await req.json()
  if (!targetUserId || targetUserId === session.user.id)
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })

  await prisma.follow.upsert({
    where:  { followerId_followingId: { followerId: session.user.id, followingId: targetUserId } },
    create: { followerId: session.user.id, followingId: targetUserId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await req.json()

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: targetUserId },
  })

  return NextResponse.json({ ok: true })
}
