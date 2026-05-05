import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

const TYPE_ICON: Record<string, string> = {
  offer_accepted:  '✅',
  offer_declined:  '❌',
  offer_countered: '↩️',
  offer_received:  '💌',
  auction_won:     '🏆',
  outbid:          '⚠️',
  auction_ended:   '⏱',
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })

  // Mark all read after fetching (so we can still render unread state)
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-sub">Your recent alerts</div>
        </div>
        {notifications.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{notifications.length} total</span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          Nothing yet. Make a move.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                background: 'var(--bg2)',
                border: `1px solid ${n.isRead ? 'var(--border)' : 'var(--gold-dim)'}`,
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICON[n.type] ?? '🔔'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: n.isRead ? 400 : 600 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </div>
              {!n.isRead && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
              )}
              {n.actionUrl && (
                <Link href={n.actionUrl} className="btn btn-gold btn-sm" style={{ flexShrink: 0 }}>
                  View →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
