import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { bidIncrement } from '@/lib/auction'

const SNIPE_WINDOW    = 5 * 60 * 1000  // 5 minutes
const SNIPE_EXTENSION = 5 * 60 * 1000  // extend by 5 minutes
const MAX_EXTENSIONS  = 6              // max 30 minutes total extension

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { amount: amountRaw } = await req.json()
  const amount = Number(amountRaw)
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id },
        select: {
          status: true, sellerId: true, minimumBid: true, currentBid: true,
          currentWinnerId: true, endsAt: true, extensionCount: true,
        },
      })
      if (!auction)                             throw new Error('Auction not found')
      if (auction.status !== 'active')          throw new Error('Auction is not active')
      if (auction.endsAt < new Date())          throw new Error('Auction has ended')
      if (auction.sellerId === session.user.id) throw new Error('You cannot bid on your own auction')

      // Minimum: beat current bid by at least one increment, or meet floor if no bids yet
      const currentBid = auction.currentBid ? Number(auction.currentBid) : null
      const minRequired = currentBid !== null
        ? currentBid + bidIncrement(currentBid)
        : Number(auction.minimumBid)

      if (amount < minRequired) {
        throw new Error(`Minimum bid is $${minRequired.toLocaleString()}`)
      }

      const user = await tx.user.findUnique({ where: { id: session.user.id } })
      if (!user) throw new Error('User not found')

      const existingBid = await tx.bid.findUnique({
        where: { auctionId_userId: { auctionId: id, userId: session.user.id } },
      })
      const alreadyLocked = existingBid ? Number(existingBid.amount) : 0
      const available     = Number(user.balance) - Number(user.lockedBalance) + alreadyLocked
      if (amount > available) throw new Error('Insufficient available balance')

      // Upsert bid — one bid record per user per auction, updatable
      if (existingBid) {
        const delta = amount - alreadyLocked
        await tx.bid.update({ where: { id: existingBid.id }, data: { amount, status: 'active' } })
        await tx.user.update({ where: { id: session.user.id }, data: { lockedBalance: { increment: delta } } })
        await tx.transaction.create({
          data: { fromUserId: session.user.id, amount: delta, type: 'auction_bid_increase',
            description: `Bid increased to $${amount.toLocaleString()} on auction ${id}` },
        })
      } else {
        await tx.bid.create({ data: { auctionId: id, userId: session.user.id, amount, status: 'active' } })
        await tx.user.update({ where: { id: session.user.id }, data: { lockedBalance: { increment: amount } } })
        await tx.transaction.create({
          data: { fromUserId: session.user.id, amount, type: 'auction_bid_lock',
            description: `Bid locked: $${amount.toLocaleString()} on auction ${id}` },
        })
      }

      // Update live current bid + winner
      const auctionData: Parameters<typeof tx.auction.update>[0]['data'] = {
        currentBid: amount,
        currentWinnerId: session.user.id,
      }

      // Anti-snipe: extend if bid lands in final 5 minutes
      let extended = false
      const timeLeft = auction.endsAt.getTime() - Date.now()
      if (timeLeft < SNIPE_WINDOW && auction.extensionCount < MAX_EXTENSIONS) {
        auctionData.endsAt = new Date(auction.endsAt.getTime() + SNIPE_EXTENSION)
        auctionData.extensionCount = { increment: 1 }
        extended = true
      }

      await tx.auction.update({ where: { id }, data: auctionData })

      return {
        ok: true,
        result: existingBid ? 'updated' : 'placed',
        extended,
        newEndsAt: extended
          ? new Date(auction.endsAt.getTime() + SNIPE_EXTENSION).toISOString()
          : null,
      }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Bid failed' }, { status: 400 })
  }
}
