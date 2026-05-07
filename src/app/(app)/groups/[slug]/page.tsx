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

  // Fetch recent feed events from group members
  const memberIds = group.members.map(m => m.userId)
  const events = isMember
    ? await prisma.feedEvent.findMany({
        where: { isVisible: true, userId: { in: memberIds } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user:       { select: { username: true, avatarUrl: true } },
          targetUser: { select: { username: true, avatarUrl: true } },
          edition: {
            include: {
              item: { select: { name: true, imageUrl: true, category: true, benchmarkPrice: true, minimumBid: true } },
            },
          },
          _count: { select: { likes: true, comments: true } },
        },
      })
    : []

  // Build leaderboard: members sorted by balance desc
  const leaderboard = group.members
    .map(m => ({
      userId:   m.userId,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      balance:  m.user.balance.toString(),
      role:     m.role,
      joinedAt: m.joinedAt.toISOString(),
    }))
    .sort((a, b) => Number(b.balance) - Number(a.balance))

  const serialisedEvents = events.map(e => ({
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

  return (
    <GroupClient
      slug={group.slug}
      name={group.name}
      description={group.description}
      joinType={group.joinType}
      inviteCode={myMembership?.role === 'owner' ? group.inviteCode : null}
      maxMembers={group.maxMembers}
      memberCount={group.members.length}
      isMember={isMember}
      myRole={myMembership?.role ?? null}
      userId={session.user.id}
      leaderboard={leaderboard}
      initialEvents={serialisedEvents}
    />
  )
}
