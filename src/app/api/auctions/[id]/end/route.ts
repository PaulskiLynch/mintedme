import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { settleAuction } from '@/lib/auction'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const auction = await prisma.auction.findUnique({
    where: { id },
    select: { status: true, sellerId: true, endsAt: true },
  })
  if (!auction)                    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  if (auction.status === 'settled') return NextResponse.json({ ok: true, result: 'already_settled' })

  const isExpired = auction.endsAt < new Date()
  const isSeller  = auction.sellerId === session.user.id
  const isAdmin   = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
    .then(u => u?.isAdmin ?? false)

  if (!isExpired && !isSeller && !isAdmin) {
    return NextResponse.json({ error: 'Auction has not ended yet' }, { status: 400 })
  }

  try {
    const result = await settleAuction(id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
