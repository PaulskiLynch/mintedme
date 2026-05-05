import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auction = await prisma.auction.findUnique({
    where: { id },
    select: {
      status: true,
      currentBid: true,
      currentWinnerId: true,
      currentWinner: { select: { username: true } },
      bids: {
        include: { user: { select: { username: true } } },
        orderBy: { amount: 'desc' },
        take: 20,
      },
    },
  })
  if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    status:       auction.status,
    currentBid:   auction.currentBid?.toString() ?? null,
    winnerName:   auction.currentWinner?.username ?? null,
    bids: auction.bids.map((b: typeof auction.bids[0]) => ({
      id: b.id, amount: b.amount.toString(), createdAt: b.createdAt.toISOString(), user: b.user,
    })),
  })
}
