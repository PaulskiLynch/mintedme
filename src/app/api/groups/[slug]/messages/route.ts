import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

// GET /api/groups/[slug]/messages  — fetch chat messages
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const group = await prisma.group.findUnique({ where: { slug } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Must be a member to read chat
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const messages = await prisma.groupMessage.findMany({
    where: { groupId: group.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { username: true, avatarUrl: true } } },
  })

  return NextResponse.json(messages.map(m => ({
    id:        m.id,
    content:   m.content,
    createdAt: m.createdAt.toISOString(),
    user:      m.user,
  })))
}

// POST /api/groups/[slug]/messages  — send a message
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (content.trim().length > 1000) return NextResponse.json({ error: 'Too long' }, { status: 400 })

  const group = await prisma.group.findUnique({ where: { slug } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const message = await prisma.groupMessage.create({
    data: { groupId: group.id, userId: session.user.id, content: content.trim() },
    include: { user: { select: { username: true, avatarUrl: true } } },
  })

  return NextResponse.json({
    id:        message.id,
    content:   message.content,
    createdAt: message.createdAt.toISOString(),
    user:      message.user,
  })
}
