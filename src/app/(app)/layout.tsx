import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true, balance: true } }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ])
  if (!user) redirect('/login')

  return (
    <div className="app-shell">
      <Sidebar username={user.username} balance={user.balance.toString()} isAdmin={session.user.isAdmin ?? false} unreadCount={unread} />
      <main className="main-content">{children}</main>
    </div>
  )
}
