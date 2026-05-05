import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: feedEventId } = await params
  const comments = await prisma.feedComment.findMany({
    where: { feedEventId },
    include: { user: { select: { username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })
  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: feedEventId } = await params
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const comment = await prisma.feedComment.create({
    data: { feedEventId, userId: session.user.id, message: message.trim().slice(0, 500) },
    include: { user: { select: { username: true, avatarUrl: true } } },
  })
  return NextResponse.json({ ok: true, comment })
}
