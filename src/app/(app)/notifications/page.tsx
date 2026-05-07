import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import NotificationsClient from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Fetch first so we capture unread state before marking
  const notifications = await prisma.notification.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take:    100,
    select:  { id: true, type: true, message: true, isRead: true, actionUrl: true, createdAt: true },
  })

  // Mark all as read now that we've captured the state
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data:  { isRead: true },
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-sub">
            {unreadCount > 0
              ? `${unreadCount} new · ${notifications.length} total`
              : `${notifications.length} total`}
          </div>
        </div>
      </div>

      <NotificationsClient
        initial={notifications.map(n => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
          actionUrl: n.actionUrl ?? null,
        }))}
      />
    </div>
  )
}
