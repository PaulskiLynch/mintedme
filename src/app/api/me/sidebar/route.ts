import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

function onlineStatus(lastSeen: Date | null): 'online' | 'idle' | 'offline' {
  if (!lastSeen) return 'offline'
  const mins = (Date.now() - lastSeen.getTime()) / 60000
  if (mins < 5)  return 'online'
  if (mins < 30) return 'idle'
  return 'offline'
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [watchedItems, activeBidAuctions, liveAuctions, followingUsers] = await Promise.all([
    prisma.watchedItem.findMany({
      where: { userId: session.user.id },
      include: {
        edition: {
          include: {
            item:     { select: { name: true, imageUrl: true } },
            auctions: { where: { status: 'active' }, select: { id: true, minimumBid: true, endsAt: true }, take: 1 },
          },
        },
      },
    }),
    prisma.auction.findMany({
      where: { status: 'active', bids: { some: { userId: session.user.id } } },
      include: {
        bids:    { where: { userId: session.user.id }, orderBy: { amount: 'desc' }, take: 1 },
        edition: { include: { item: { select: { name: true, imageUrl: true } } } },
      },
    }),
    prisma.auction.findMany({
      where:   { status: 'active' },
      orderBy: { endsAt: 'asc' },
      take:    3,
      include: { edition: { include: { item: { select: { name: true, imageUrl: true } } } } },
    }),
    prisma.follow.findMany({
      where:   { followerId: session.user.id },
      include: { following: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } } },
    }),
  ])

  const watching = watchedItems.map((w: typeof watchedItems[0]) => {
    const auction = w.edition.auctions[0] ?? null
    return {
      editionId:    w.editionId,
      itemName:     w.edition.item.name,
      imageUrl:     w.edition.item.imageUrl,
      currentPrice: (auction ? Number(auction.minimumBid) : 0).toString(),
      endsAt:       auction?.endsAt.toISOString() ?? null,
      auctionId:    auction?.id ?? null,
    }
  })

  const bids = activeBidAuctions.map((a: typeof activeBidAuctions[0]) => ({
    auctionId:  a.id,
    editionId:  a.editionId,
    itemName:   a.edition.item.name,
    imageUrl:   a.edition.item.imageUrl,
    myBid:      a.bids[0]?.amount.toString() ?? '0',
    minimumBid: a.minimumBid.toString(),
    isLeading:  false,
    endsAt:     a.endsAt.toISOString(),
  }))

  const auctions = liveAuctions.map((a: typeof liveAuctions[0]) => ({
    id:         a.id,
    editionId:  a.editionId,
    itemName:   a.edition.item.name,
    imageUrl:   a.edition.item.imageUrl,
    minimumBid: a.minimumBid.toString(),
    endsAt:     a.endsAt.toISOString(),
  }))

  const friends = followingUsers.map((f: typeof followingUsers[0]) => ({
    id:        f.following.id,
    username:  f.following.username,
    avatarUrl: f.following.avatarUrl,
    status:    onlineStatus(f.following.lastSeenAt),
  }))

  return NextResponse.json({ watching, bids, auctions, friends })
}
