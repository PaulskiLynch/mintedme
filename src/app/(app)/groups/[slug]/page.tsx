import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import GroupClient from './GroupClient'

export const dynamic = 'force-dynamic'

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, balance: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })
  if (!group) notFound()

  const myMembership = group.members.find(m => m.userId === session.user.id) ?? null
  const isMember = !!myMembership
  const isOwner  = myMembership?.role === 'owner'

  // Fetch last week's balance snapshot for weekly % change
  // We derive it from ownership / transaction history — approximate from balance 7 days ago
  // For simplicity in v1: fetch each member's net worth as their current balance (leaderboard by balance)
  // Weekly change = current balance vs balance 7 days ago (from transactions)
  const memberIds = group.members.map(m => m.userId)

  // Get net spend in last 7 days (purchases - sales) per member to estimate weekly change
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const recentOwnerships = isMember
    ? await prisma.ownership.findMany({
        where: {
          ownerId: { in: memberIds },
          purchaseDate: { gte: weekAgo },
        },
        select: { ownerId: true, purchasePrice: true },
      })
    : []

  // Build leaderboard — sort by balance desc
  const leaderboard = group.members
    .map(m => {
      const spent   = recentOwnerships.filter(o => o.ownerId === m.userId).reduce((s, o) => s + Number(o.purchasePrice ?? 0), 0)
      const bal     = Number(m.user.balance)
      const weekAgoEst = bal + spent          // rough: if they spent X, they had X more last week
      const weeklyPct  = weekAgoEst > 0 ? ((bal - weekAgoEst) / weekAgoEst) * 100 : 0
      return {
        userId:     m.userId,
        username:   m.user.username,
        avatarUrl:  m.user.avatarUrl,
        balance:    bal.toString(),
        role:       m.role,
        joinedAt:   m.joinedAt.toISOString(),
        weeklyPct:  Math.round(weeklyPct * 10) / 10,
      }
    })
    .sort((a, b) => Number(b.balance) - Number(a.balance))

  // Group stats
  const totalNetWorth = group.members.reduce((s, m) => s + Number(m.user.balance), 0)
  const avgBalance    = group.members.length > 0 ? totalNetWorth / group.members.length : 0

  // Initial messages (newest first)
  const messages = isMember
    ? await prisma.groupMessage.findMany({
        where: { groupId: group.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { username: true, avatarUrl: true } } },
      })
    : []

  const serialisedMessages = messages.map(m => ({
    id:        m.id,
    content:   m.content,
    createdAt: m.createdAt.toISOString(),
    user:      m.user,
  }))

  return (
    <GroupClient
      slug={group.slug}
      name={group.name}
      description={group.description}
      avatarUrl={group.avatarUrl}
      joinType={group.joinType}
      inviteCode={isOwner ? group.inviteCode : null}
      maxMembers={group.maxMembers}
      memberCount={group.members.length}
      isMember={isMember}
      isOwner={isOwner}
      userId={session.user.id}
      myUsername={myMembership?.user.username ?? leaderboard.find(m => m.userId === session.user.id)?.username ?? ''}
      myAvatarUrl={myMembership?.user.avatarUrl ?? null}
      leaderboard={leaderboard}
      stats={{ totalNetWorth, avgBalance }}
      initialMessages={serialisedMessages}
    />
  )
}
