import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { amount } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({ where: { id }, include: { edition: { include: { item: true } } } })
      if (!auction) throw new Error('Auction not found')
      if (auction.status !== 'active') throw new Error('Auction is not active')
      if (auction.endsAt < new Date()) throw new Error('Auction has ended')
      if (auction.sellerId === session.user.id) throw new Error('You cannot bid on your own auction')

      const minBid = Number(auction.currentBid ?? auction.startingBid)
      if (amount <= minBid) throw new Error(`Bid must be greater than $${minBid.toLocaleString()}`)

      const user = await tx.user.findUnique({ where: { id: session.user.id } })
      if (!user) throw new Error('User not found')
      if (Number(user.balance) < amount) throw new Error('Insufficient balance')

      const prevWinnerId = auction.currentWinnerId
      const prevWinnerDifferent = prevWinnerId && prevWinnerId !== session.user.id

      // Mark previous winning bid as not winning
      await tx.bid.updateMany({ where: { auctionId: id, isWinning: true }, data: { isWinning: false } })

      const bid = await tx.bid.create({
        data: { auctionId: id, userId: session.user.id, amount, isWinning: true },
      })

      await tx.auction.update({
        where: { id },
        data: { currentBid: amount, currentWinnerId: session.user.id },
      })

      // Notify the outbid user
      if (prevWinnerDifferent) {
        await tx.notification.create({
          data: {
            userId: prevWinnerId,
            type: 'outbid',
            message: `You were outbid on ${auction.edition.item.name}. New bid: $${amount.toLocaleString()}`,
            actionUrl: `/auction/${id}`,
          },
        })
      }

      return { ok: true, bidId: bid.id }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Bid failed' }, { status: 400 })
  }
}
