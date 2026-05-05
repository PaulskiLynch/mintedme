import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const messages = await prisma.auctionMessage.findMany({
    where: { auctionId: id },
    include: { user: { select: { username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { message } = await req.json()
  if (!message || typeof message !== 'string' || !message.trim())
    return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const auction = await prisma.auction.findUnique({ where: { id }, select: { status: true } })
  if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })

  const msg = await prisma.auctionMessage.create({
    data: { auctionId: id, userId: session.user.id, message: message.trim().slice(0, 500) },
    include: { user: { select: { username: true, avatarUrl: true } } },
  })

  return NextResponse.json({ ok: true, message: msg })
}
