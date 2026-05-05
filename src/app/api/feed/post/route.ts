import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 })

  const event = await prisma.feedEvent.create({
    data: {
      eventType: 'post',
      userId:    session.user.id,
      metadata:  { text: text.trim().slice(0, 400) },
      isVisible: true,
    },
    include: {
      user: { select: { username: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({
    ok: true,
    event: {
      id:           event.id,
      eventType:    event.eventType,
      amount:       null,
      createdAt:    event.createdAt.toISOString(),
      likeCount:    0,
      commentCount: 0,
      metadata:     event.metadata as Record<string, unknown>,
      user:         event.user,
      targetUser:   null,
      edition:      null,
    },
  })
}
