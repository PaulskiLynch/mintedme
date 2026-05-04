import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const [userCount, itemCount, editionCount, txnCount, pendingItems, frozenUsers] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.itemEdition.count(),
    prisma.transaction.count(),
    prisma.item.count({ where: { isApproved: false } }),
    prisma.user.count({ where: { isFrozen: true } }),
  ])

  const recentTxns = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      fromUser: { select: { username: true } },
      toUser:   { select: { username: true } },
      edition:  { include: { item: { select: { name: true } } } },
    },
  })

  const stats = [
    { label: 'Total Users',       value: userCount },
    { label: 'Total Items',       value: itemCount },
    { label: 'Total Editions',    value: editionCount },
    { label: 'Transactions',      value: txnCount },
    { label: 'Pending Approval',  value: pendingItems,  alert: pendingItems > 0 },
    { label: 'Frozen Users',      value: frozenUsers,   alert: frozenUsers > 0 },
  ]

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 24 }}>Overview</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: `1px solid ${s.alert ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: s.alert ? 'var(--red)' : 'var(--muted)', marginBottom: 6 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.alert ? 'var(--red)' : 'var(--white)' }}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 16 }}>Recent Transactions</div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Type', 'From', 'To', 'Item', 'Amount', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentTxns.map((t: typeof recentTxns[0]) => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px' }}><span style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{t.type}</span></td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>@{t.fromUser?.username ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>@{t.toUser?.username ?? '—'}</td>
                <td style={{ padding: '10px 16px' }}>{t.edition?.item.name ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--gold)', fontWeight: 700 }}>${Number(t.amount).toLocaleString()}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{t.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
