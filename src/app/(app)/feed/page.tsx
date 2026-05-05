import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import FeedClient from './FeedClient'

export const dynamic = 'force-dynamic'

function onlineStatus(lastSeen: Date | null): 'online' | 'idle' | 'offline' {
  if (!lastSeen) return 'offline'
  const mins = (Date.now() - lastSeen.getTime()) / 60000
  if (mins < 5)  return 'online'
  if (mins < 30) return 'idle'
  return 'offline'
}

export default async function FeedPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [
    events, userFull, watchedItems, activeBidAuctions, liveAuctions,
    followingUsers, myReactions, allUsers, onlineCount,
    recentEventCategories, challengeEditions, hasWonAuction,
  ] = await Promise.all([
    prisma.feedEvent.findMany({
      where: { isVisible: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        user:       { select: { username: true, avatarUrl: true } },
        targetUser: { select: { username: true, avatarUrl: true } },
        edition:    { include: { item: { select: { name: true, imageUrl: true, category: true, benchmarkPrice: true, minimumBid: true } } } },
        _count:     { select: { likes: true, comments: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        username: true, tagline: true, avatarUrl: true, balance: true, interests: true,
        _count: { select: { followers: true, following: true } },
      },
    }),
    prisma.watchedItem.findMany({
      where: { userId: session.user.id },
      include: {
        edition: {
          include: {
            item: { select: { name: true, imageUrl: true } },
            auctions: { where: { status: 'active' }, select: { id: true, minimumBid: true, endsAt: true }, take: 1 },
          },
        },
      },
    }),
    prisma.auction.findMany({
      where: { status: 'active', bids: { some: { userId: session.user.id } } },
      include: {
        bids: { where: { userId: session.user.id }, orderBy: { amount: 'desc' }, take: 1 },
        edition: { include: { item: { select: { name: true, imageUrl: true } } } },
      },
    }),
    prisma.auction.findMany({
      where: { status: 'active' },
      orderBy: { endsAt: 'asc' },
      take: 3,
      include: { edition: { include: { item: { select: { name: true, imageUrl: true } } } } },
    }),
    prisma.follow.findMany({
      where: { followerId: session.user.id },
      include: { following: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } } },
    }),
    prisma.feedLike.findMany({
      where: { userId: session.user.id },
      select: { feedEventId: true, type: true },
    }),
    // All users sorted by balance for rank calculation
    prisma.user.findMany({
      select: { id: true, balance: true },
      orderBy: { balance: 'desc' },
    }),
    // Online player count (active last 5 min)
    prisma.user.count({
      where: { lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    }),
    // Recent feed events for hot-category calc
    prisma.feedEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) }, isVisible: true, editionId: { not: null } },
      include: { edition: { include: { item: { select: { category: true } } } } },
      take: 200,
    }),
    // Challenge: owned editions by category
    prisma.itemEdition.findMany({
      where: { currentOwnerId: session.user.id },
      include: { item: { select: { category: true } } },
    }),
    // Challenge: has won an auction?
    prisma.ownership.count({
      where: { ownerId: session.user.id, transferType: 'auction_win' },
    }),
  ])

  if (!userFull) redirect('/login')

  // ── Rank ──────────────────────────────────────────────────────────────────
  const myRank       = allUsers.findIndex((u: { id: string }) => u.id === session.user.id) + 1
  const totalPlayers = allUsers.length

  // ── Class stats ───────────────────────────────────────────────────────────
  const topPlayer = allUsers[0]?.id !== session.user.id
    ? await prisma.user.findUnique({ where: { id: allUsers[0]?.id }, select: { username: true } })
    : userFull

  const catCounts: Record<string, number> = {}
  for (const e of recentEventCategories) {
    const cat = e.edition?.item.category
    if (cat) catCounts[cat] = (catCounts[cat] ?? 0) + 1
  }
  const hotCategory = Object.entries(catCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

  // ── Challenge progress ────────────────────────────────────────────────────
  const carCount    = challengeEditions.filter((e: { item: { category: string } }) => e.item.category === 'cars').length
  const hasBusiness = challengeEditions.some((e: { item: { category: string } }) => e.item.category === 'businesses')
  const cashOk      = Number(userFull.balance) >= 500_000

  // ── Serialise events ──────────────────────────────────────────────────────
  const serialisedEvents = events.map((e: typeof events[0]) => ({
    id:           e.id,
    eventType:    e.eventType,
    amount:       e.amount?.toString() ?? null,
    createdAt:    e.createdAt.toISOString(),
    likeCount:    e._count.likes,
    commentCount: e._count.comments,
    metadata:     e.metadata as Record<string, unknown> | null,
    user:         e.user,
    targetUser:   e.targetUser,
    edition:      e.edition ? {
      id:   e.edition.id,
      item: {
        name:           e.edition.item.name,
        imageUrl:       e.edition.item.imageUrl,
        category:       e.edition.item.category,
        benchmarkPrice: e.edition.item.benchmarkPrice.toString(),
        minimumBid:     e.edition.item.minimumBid.toString(),
      },
    } : null,
  }))

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

  const reactionsByEventId: Record<string, string> = {}
  for (const r of myReactions) reactionsByEventId[r.feedEventId] = r.type

  return (
    <FeedClient
      userId={session.user.id}
      userProfile={{
        username:       userFull.username,
        tagline:        userFull.tagline,
        avatarUrl:      userFull.avatarUrl,
        balance:        userFull.balance.toString(),
        followersCount: userFull._count.followers,
        followingCount: userFull._count.following,
      }}
      initialEvents={serialisedEvents}
      initialWatching={watching}
      initialBids={bids}
      initialAuctions={auctions}
      initialFriends={friends}
      initialInterests={(userFull.interests as string[] | null) ?? []}
      reactionsByEventId={reactionsByEventId}
      myRank={myRank}
      totalPlayers={totalPlayers}
      classStats={{ onlineCount, topPlayerUsername: topPlayer?.username ?? null, hotCategory }}
      challengeProgress={{ carCount, hasWonAuction: hasWonAuction > 0, hasBusiness, cashOk }}
    />
  )
}
