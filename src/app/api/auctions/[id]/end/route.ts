import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

// ISO week number helper
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${week}`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id },
        include: { edition: { include: { item: true } } },
      })
      if (!auction)                          throw new Error('Auction not found')
      if (auction.status === 'settled')      throw new Error('Already settled')
      if (auction.status === 'ended')        throw new Error('Already ended — awaiting settlement')

      const isExpired = auction.endsAt < new Date()
      const isSeller  = auction.sellerId === session.user.id
      const isAdmin   = (await tx.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } }))?.isAdmin ?? false

      if (!isExpired && !isSeller && !isAdmin) throw new Error('Auction has not ended yet')

      // Get all active bids, highest first
      const bids = await tx.bid.findMany({
        where:   { auctionId: id, status: 'active', amount: { gte: auction.minimumBid } },
        orderBy: { amount: 'desc' },
        include: { user: { select: { id: true, balance: true, lockedBalance: true, isFrozen: true } } },
      })

      if (bids.length === 0) {
        // No valid bids — mark ended, release any locked funds
        await tx.auction.update({ where: { id }, data: { status: 'settled' } })
        await tx.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } })
        await tx.bid.updateMany({ where: { auctionId: id }, data: { status: 'lost' } })
        return { ok: true, result: 'no_bids' }
      }

      const isLegendaryOrMythic = ['Legendary', 'Mythic'].includes(auction.rarityTier)
      const week = isoWeek(new Date())

      let winner = null
      for (const bid of bids) {
        if (bid.user.isFrozen) continue

        if (isLegendaryOrMythic) {
          // Check win cap: 1 Legendary/Mythic win per ISO week
          const weeklyWin = await tx.auction.findFirst({
            where: {
              currentWinnerId: bid.userId,
              status:          'settled',
              rarityTier:      { in: ['Legendary', 'Mythic'] },
              endsAt:          {
                gte: new Date(`${week.replace('W', '')}-Mon`), // approximate
              },
            },
          })
          // Simpler: check transactions this ISO week
          const weekStart = new Date()
          weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1) // Monday
          weekStart.setUTCHours(0, 0, 0, 0)

          const alreadyWon = await tx.auction.count({
            where: {
              currentWinnerId: bid.userId,
              status:          'settled',
              rarityTier:      { in: ['Legendary', 'Mythic'] },
              endsAt:          { gte: weekStart },
            },
          })
          if (alreadyWon >= 1) continue
        }

        winner = bid
        break
      }

      if (!winner) {
        // All top bidders hit the weekly cap — no winner
        await tx.auction.update({ where: { id }, data: { status: 'settled' } })
        await tx.itemEdition.update({ where: { id: auction.editionId }, data: { isInAuction: false } })
        for (const bid of bids) {
          await tx.bid.update({ where: { id: bid.id }, data: { status: 'lost' } })
          await tx.user.update({ where: { id: bid.userId }, data: { lockedBalance: { decrement: Number(bid.amount) } } })
        }
        return { ok: true, result: 'no_eligible_winner' }
      }

      const price      = Number(winner.amount)
      const sellerId   = auction.sellerId
      const winnerId   = winner.userId
      const benchmark  = Number(auction.benchmarkPrice)
      const isLucky    = price < benchmark

      // Charge winner
      await tx.user.update({
        where: { id: winnerId },
        data: {
          balance:       { decrement: price },
          lockedBalance: { decrement: price },
        },
      })

      // Pay seller (5% platform fee)
      const platformFee = Math.floor(price * 0.05)
      const sellerGets  = price - platformFee
      await tx.user.update({ where: { id: sellerId }, data: { balance: { increment: sellerGets } } })

      // Transfer edition
      await tx.itemEdition.update({
        where: { id: auction.editionId },
        data:  { currentOwnerId: winnerId, lastSalePrice: price, lastSaleDate: new Date(), isInAuction: false, isListed: false },
      })

      // Settle auction
      await tx.auction.update({
        where: { id },
        data:  { status: 'settled', currentWinnerId: winnerId, currentBid: price, winningBid: price, luckyUndervalueWin: isLucky },
      })

      // Mark bids
      await tx.bid.update({ where: { id: winner.id }, data: { status: 'won' } })
      for (const bid of bids.filter(b => b.id !== winner!.id)) {
        await tx.bid.update({ where: { id: bid.id }, data: { status: 'lost' } })
        await tx.user.update({ where: { id: bid.userId }, data: { lockedBalance: { decrement: Number(bid.amount) } } })
      }

      // Records
      await tx.ownership.updateMany({ where: { editionId: auction.editionId, endedAt: null }, data: { endedAt: new Date() } })
      await tx.ownership.create({ data: { editionId: auction.editionId, ownerId: winnerId, purchasePrice: price, transferType: 'auction_win' } })
      await tx.priceHistory.create({ data: { editionId: auction.editionId, price, transactionType: 'auction' } })
      await tx.transaction.create({
        data: { fromUserId: winnerId, toUserId: sellerId, editionId: auction.editionId, amount: price, type: 'auction_win', description: `Won auction: ${auction.edition.item.name}` },
      })
      await tx.feedEvent.create({
        data: {
          eventType: 'auction_end', userId: winnerId, editionId: auction.editionId, amount: price,
          metadata: { luckyUndervalueWin: isLucky, rarityTier: auction.rarityTier },
        },
      })

      await tx.notification.create({
        data: { userId: winnerId, type: 'auction_won', message: `You won the ${auction.edition.item.name} for $${price.toLocaleString()}${isLucky ? ' — lucky undervalue win!' : ''}`, actionUrl: `/item/${auction.editionId}` },
      })
      await tx.notification.create({
        data: { userId: sellerId, type: 'item_sold', message: `Your ${auction.edition.item.name} sold for $${price.toLocaleString()}`, actionUrl: `/item/${auction.editionId}` },
      })

      return { ok: true, result: 'sold', winnerId, price, sellerGets, platformFee, luckyUndervalueWin: isLucky }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}
