import { prisma } from '@/lib/db'
import AdminUsersClient from './AdminUsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, username: true, email: true, isAdmin: true, isFrozen: true,
      isEstablished: true, balance: true, createdAt: true,
      _count: { select: { ownedEditions: true, transactionsFrom: true } },
    },
    take: 200,
  })

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 24 }}>Users</div>
      <AdminUsersClient users={users.map((u: typeof users[0]) => ({
        id:           u.id,
        username:     u.username,
        email:        u.email,
        isAdmin:      u.isAdmin,
        isFrozen:     u.isFrozen,
        isEstablished: u.isEstablished,
        balance:      u.balance.toString(),
        editionCount: u._count.ownedEditions,
        txnCount:     u._count.transactionsFrom,
        createdAt:    u.createdAt.toISOString(),
      }))} />
    </div>
  )
}
