import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

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
        include: { edition: { include: { item: true } } },
      })
      if (!auction)                               throw new Error('Auction not found')
      if (auction.status !== 'active')            throw new Error('Auction is not active')
      if (auction.endsAt < new Date())            throw new Error('Auction has ended')
      if (auction.sellerId === session.user.id)   throw new Error('You cannot bid on your own auction')
      if (amount < Number(auction.minimumBid))    throw new Error(`Minimum bid is $${Number(auction.minimumBid).toLocaleString()}`)

      const user = await tx.user.findUnique({ where: { id: session.user.id } })
      if (!user) throw new Error('User not found')

      // Check available balance (balance minus anything already locked)
      const existingBid = await tx.bid.findUnique({
        where: { auctionId_userId: { auctionId: id, userId: session.user.id } },
      })
      const alreadyLocked = existingBid ? Number(existingBid.amount) : 0
      const available     = Number(user.balance) - Number(user.lockedBalance) + alreadyLocked

      if (amount > available) throw new Error('Insufficient available balance')

      if (existingBid) {
        // Update existing sealed bid — adjust locked balance delta
        const delta = amount - alreadyLocked
        await tx.bid.update({ where: { id: existingBid.id }, data: { amount, status: 'active' } })
        await tx.user.update({ where: { id: session.user.id }, data: { lockedBalance: { increment: delta } } })
        return { ok: true, result: 'updated' }
      }

      // New bid — lock funds
      await tx.bid.create({ data: { auctionId: id, userId: session.user.id, amount, status: 'active' } })
      await tx.user.update({ where: { id: session.user.id }, data: { lockedBalance: { increment: amount } } })
      return { ok: true, result: 'placed' }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Bid failed' }, { status: 400 })
  }
}
