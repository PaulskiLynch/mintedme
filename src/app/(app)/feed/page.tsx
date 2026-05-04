import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

type FeedEventRow = Awaited<ReturnType<typeof prisma.feedEvent.findMany>>[0] & {
  user: { username: string; avatarUrl: string | null } | null
  targetUser: { username: string } | null
  edition: { id: string; item: { name: string; imageUrl: string | null; category: string } } | null
}

function feedCopy(e: FeedEventRow): string {
  const itemName = e.edition?.item.name ?? 'an item'
  const amt = e.amount ? '$' + Number(e.amount).toLocaleString() : ''
  switch (e.eventType) {
    case 'buy':         return `bought ${itemName} for ${amt}`
    case 'sell':        return `sold ${itemName} to @${e.targetUser?.username} for ${amt}`
    case 'offer':       return `made an offer of ${amt} on @${e.targetUser?.username}'s ${itemName}`
    case 'accept':      return `accepted ${amt} for ${itemName}`
    case 'create_item': return `created a new item: ${itemName}`
    default:            return e.eventType
  }
}

export default async function FeedPage() {
  const events = await prisma.feedEvent.findMany({
    where: { isVisible: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user:       { select: { username: true, avatarUrl: true } },
      targetUser: { select: { username: true } },
      edition:    { include: { item: { select: { name: true, imageUrl: true, category: true } } } },
    },
  })

  return (
    <div>
      <div className="page-title">Feed</div>
      <div className="page-sub">What&apos;s happening in the Mint economy</div>

      {events.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          No activity yet. Be the first to buy something.
        </div>
      ) : (
        <div>
          {(events as FeedEventRow[]).map(e => {
            const copy = feedCopy(e)
            const initials = e.user?.username?.[0]?.toUpperCase() ?? '?'
            return (
              <div key={e.id} className="feed-event">
                <Link href={e.user ? `/mint/${e.user.username}` : '#'}>
                  <div className="feed-avatar">
                    {e.user?.avatarUrl ? <img src={e.user.avatarUrl} alt="" /> : initials}
                  </div>
                </Link>
                <div style={{ flex: 1 }}>
                  <div className="feed-text">
                    {e.user ? (
                      <Link href={`/mint/${e.user.username}`} style={{ fontWeight: 700 }}>@{e.user.username}</Link>
                    ) : 'Someone'}{' '}
                    {copy}
                  </div>
                  <div className="feed-time">{formatDistanceToNow(e.createdAt, { addSuffix: true })}</div>
                </div>
                {e.edition?.item.imageUrl && (
                  <Link href={e.edition ? `/item/${e.edition.id}` : '#'}>
                    <img className="feed-thumb" src={e.edition.item.imageUrl} alt="" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
