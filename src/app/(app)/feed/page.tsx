import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import FeedClient from './FeedClient'
import { CHALLENGES, type ChallengeData } from '@/lib/challenges'

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
    recentEventCategories, ownedEditions, auctionWinCount,
    completedChallenges, endedOwnerships,
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
    prisma.user.findMany({
      select: { id: true, balance: true },
      orderBy: { balance: 'desc' },
    }),
    prisma.user.count({
      where: { lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    }),
    prisma.feedEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) }, isVisible: true, editionId: { not: null } },
      include: { edition: { include: { item: { select: { category: true } } } } },
      take: 200,
    }),
    // All owned editions with category
    prisma.itemEdition.findMany({
      where: { currentOwnerId: session.user.id, isFrozen: false },
      include: { item: { select: { category: true } } },
    }),
    // Auction wins
    prisma.ownership.count({
      where: { ownerId: session.user.id, transferType: 'auction_win' },
    }),
    // Already claimed challenges
    prisma.userChallenge.findMany({
      where: { userId: session.user.id },
      select: { code: true },
    }),
    // Ended ownerships for flip detection
    prisma.ownership.findMany({
      where: { ownerId: session.user.id, endedAt: { not: null } },
      select: { editionId: true, purchasePrice: true, endedAt: true },
    }),
  ])

  if (!userFull) redirect('/login')

  // ── Challenge data ────────────────────────────────────────────────────────
  const cats = ownedEditions.map((e: { item: { category: string } }) => e.item.category)
  const carCount      = cats.filter((c: string) => c === 'cars').length
  const bizCount      = cats.filter((c: string) => c === 'businesses').length
  const propCount     = cats.filter((c: string) => c === 'properties').length
  const aircraftCount = cats.filter((c: string) => c === 'aircraft').length
  const categoryCount = new Set(cats).size

  // Flip for profit: find an ended ownership where the next buyer paid more
  let hasFlippedForProfit = false
  if (endedOwnerships.length > 0) {
    const editionIds = endedOwnerships.map((o: { editionId: string }) => o.editionId)
    const nextOwnerships = await prisma.ownership.findMany({
      where: { editionId: { in: editionIds }, ownerId: { not: session.user.id } },
      select: { editionId: true, purchasePrice: true, purchaseDate: true },
    })
    for (const sold of endedOwnerships) {
      if (!sold.purchasePrice) continue
      const next = nextOwnerships
        .filter((n: { editionId: string; purchaseDate: Date }) => n.editionId === sold.editionId && n.purchaseDate >= sold.endedAt!)
        .sort((a: { purchaseDate: Date }, b: { purchaseDate: Date }) => a.purchaseDate.getTime() - b.purchaseDate.getTime())[0]
      if (next?.purchasePrice && Number(next.purchasePrice) > Number(sold.purchasePrice)) {
        hasFlippedForProfit = true
        break
      }
    }
  }

  const challengeData: ChallengeData = {
    carCount, bizCount, propCount, aircraftCount,
    hasWonAuction: auctionWinCount > 0,
    cashBalance: Number(userFull.balance),
    hasFlippedForProfit,
    categoryCount,
  }

  // ── Auto-award newly completed challenges ─────────────────────────────────
  const claimedCodes = new Set(completedChallenges.map((c: { code: string }) => c.code))
  const newlyCompleted = CHALLENGES.filter(c => c.met(challengeData) && !claimedCodes.has(c.code))

  for (const ch of newlyCompleted) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.userChallenge.create({
          data: { userId: session.user.id, code: ch.code, reward: ch.reward },
        })
        await tx.user.update({
          where: { id: session.user.id },
          data: { balance: { increment: ch.reward } },
        })
        await tx.transaction.create({
          data: {
            toUserId:    session.user.id,
            amount:      ch.reward,
            type:        'admin_adjustment',
            description: `Challenge reward: ${ch.label}`,
          },
        })
        await tx.notification.create({
          data: {
            userId:    session.user.id,
            type:      'challenge_complete',
            message:   `${ch.icon} Challenge complete: "${ch.label}" — $${ch.reward.toLocaleString()} added to your balance!`,
            actionUrl: '/feed',
          },
        })
      })
      claimedCodes.add(ch.code)
    } catch {
      // unique constraint = already claimed in a race, ignore
    }
  }

  // ── Rank ──────────────────────────────────────────────────────────────────
  const myRank       = allUsers.findIndex((u: { id: string }) => u.id === session.user.id) + 1
  const totalPlayers = allUsers.length

  const topPlayer = allUsers[0]?.id !== session.user.id
    ? await prisma.user.findUnique({ where: { id: allUsers[0]?.id }, select: { username: true } })
    : userFull

  const catCounts: Record<string, number> = {}
  for (const e of recentEventCategories) {
    const cat = e.edition?.item.category
    if (cat) catCounts[cat] = (catCounts[cat] ?? 0) + 1
  }
  const hotCategory = Object.entries(catCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

  // ── Serialise ─────────────────────────────────────────────────────────────
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

  // Pass challenges with completion state to client
  const challengesForClient = CHALLENGES.map(ch => ({
    code:     ch.code,
    label:    ch.label,
    icon:     ch.icon,
    desc:     ch.desc,
    reward:   ch.reward,
    done:     ch.met(challengeData),
    claimed:  claimedCodes.has(ch.code),
    progress: ch.progress?.(challengeData) ?? null,
  }))

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
      challenges={challengesForClient}
    />
  )
}
