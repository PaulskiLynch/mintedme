import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true, mintValue: true, netWorth: true },
  })
  if (!user) redirect('/login')

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      edition: { include: { item: { select: { name: true } } } },
      fromUser: { select: { username: true } },
      toUser:   { select: { username: true } },
    },
  })

  return (
    <div>
      <div className="page-title">Wallet</div>

      <div className="stats-row" style={{ marginBottom: 32 }}>
        <div className="stat-box">
          <div className="stat-label">Balance</div>
          <div className="stat-value">${Number(user.balance).toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Mint Value</div>
          <div className="stat-value">${Number(user.mintValue).toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">${Number(user.netWorth).toLocaleString()}</div>
        </div>
      </div>

      <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 14 }}>Transaction History</h3>
      {transactions.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>No transactions yet.</div>
      ) : (
        <div>
          {transactions.map((t: typeof transactions[0]) => {
            const isIncoming = t.toUserId === session.user.id
            const sign = isIncoming ? '+' : '-'
            const colour = isIncoming ? 'var(--green)' : 'var(--red)'
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14 }}>{t.description ?? t.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {t.createdAt.toLocaleDateString()} &middot; {t.type}
                    {t.edition && <> &middot; <Link href={`/item/${t.edition.id}`} style={{ color: 'var(--muted)', fontWeight: 700 }}>{t.edition.item.name}</Link></>}
                  </div>
                </div>
                <span style={{ fontWeight: 900, color: colour, fontSize: 16 }}>
                  {sign}${Number(t.amount).toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
