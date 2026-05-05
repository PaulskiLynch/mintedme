import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { bidIncrement } from '@/lib/auction'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { amount: amountRaw, maxBid: maxBidRaw } = await req.json()

  const amount   = Number(amountRaw)
  const maxBid   = maxBidRaw != null ? Number(maxBidRaw) : null

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id },
        include: { edition: { include: { item: true } } },
      })
      if (!auction)                           throw new Error('Auction not found')
      if (auction.status !== 'active')        throw new Error('Auction is not active')
      if (auction.endsAt < new Date())        throw new Error('Auction has ended')
      if (auction.sellerId === session.user.id) throw new Error('You cannot bid on your own auction')

      const curBid   = Number(auction.currentBid ?? auction.startingBid)
      const step     = bidIncrement(curBid)
      const minBid   = curBid + step

      if (amount < minBid)
        throw new Error(`Minimum bid is $${minBid.toLocaleString()} (current $${curBid.toLocaleString()} + $${step.toLocaleString()} increment)`)

      const user = await tx.user.findUnique({ where: { id: session.user.id } })
      if (!user) throw new Error('User not found')
      if (Number(user.balance) < amount) throw new Error('Insufficient balance')

      // Validate and store this user's max bid if provided
      if (maxBid !== null) {
        if (maxBid < amount) throw new Error('Max bid cannot be less than your bid amount')
        await tx.maxBid.upsert({
          where: { auctionId_userId: { auctionId: id, userId: session.user.id } },
          create: { auctionId: id, userId: session.user.id, maxAmount: maxBid },
          update: { maxAmount: maxBid },
        })
      }

      const prevWinnerId = auction.currentWinnerId
      const isDifferent  = prevWinnerId && prevWinnerId !== session.user.id

      // Check if previous winner has a proxy max bid
      const winnerProxy = isDifferent
        ? await tx.maxBid.findUnique({ where: { auctionId_userId: { auctionId: id, userId: prevWinnerId! } } })
        : null

      if (winnerProxy && Number(winnerProxy.maxAmount) >= amount) {
        // Previous winner's proxy beats this bid — auto counter
        const proxyMax   = Number(winnerProxy.maxAmount)
        const proxyStep  = bidIncrement(amount)
        const proxyAmt   = Math.min(proxyMax, amount + proxyStep)

        // Record losing bid
        await tx.bid.updateMany({ where: { auctionId: id, isWinning: true }, data: { isWinning: false } })
        await tx.bid.create({ data: { auctionId: id, userId: session.user.id, amount, isWinning: false } })
        // Record auto proxy counter-bid
        await tx.bid.create({ data: { auctionId: id, userId: prevWinnerId!, amount: proxyAmt, isWinning: true } })
        await tx.auction.update({ where: { id }, data: { currentBid: proxyAmt, currentWinnerId: prevWinnerId } })

        // Notify new bidder they were auto-outbid
        await tx.notification.create({
          data: {
            userId: session.user.id, type: 'outbid',
            message: `Your bid of $${amount.toLocaleString()} on ${auction.edition.item.name} was automatically beaten by a proxy bid ($${proxyAmt.toLocaleString()})`,
            actionUrl: `/auction/${id}`,
          },
        })

        return { ok: true, result: 'outbid_by_proxy', proxyBid: proxyAmt }
      }

      // New bidder wins
      await tx.bid.updateMany({ where: { auctionId: id, isWinning: true }, data: { isWinning: false } })
      const bid = await tx.bid.create({ data: { auctionId: id, userId: session.user.id, amount, isWinning: true } })
      await tx.auction.update({ where: { id }, data: { currentBid: amount, currentWinnerId: session.user.id } })

      if (isDifferent && prevWinnerId) {
        await tx.notification.create({
          data: {
            userId: prevWinnerId, type: 'outbid',
            message: `You were outbid on ${auction.edition.item.name}. New bid: $${amount.toLocaleString()}`,
            actionUrl: `/auction/${id}`,
          },
        })
      }

      return { ok: true, result: 'winning', bidId: bid.id }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Bid failed' }, { status: 400 })
  }
}
