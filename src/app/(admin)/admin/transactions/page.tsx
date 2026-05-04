import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const TYPE_COLOURS: Record<string, string> = {
  purchase:         'var(--gold)',
  sale:             'var(--green)',
  primary_purchase: '#6c8ebf',
  creator_earning:  'var(--green)',
  auction_sale:     'var(--gold)',
  offer_accept:     'var(--gold)',
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>
}) {
  const { page, type } = await searchParams
  const pageNum = Math.max(1, Number(page ?? 1))
  const take    = 50
  const skip    = (pageNum - 1) * take

  const where = type ? { type } : {}

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        fromUser: { select: { username: true } },
        toUser:   { select: { username: true } },
        edition:  { include: { item: { select: { name: true, category: true } } } },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  const pages = Math.ceil(total / take)
  const types = ['purchase', 'sale', 'primary_purchase', 'creator_earning', 'auction_sale']

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Transactions</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>{total.toLocaleString()} total</div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <a href="/admin/transactions" style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: !type ? 'var(--gold)' : 'transparent', color: !type ? '#000' : 'var(--muted)', textDecoration: 'none' }}>All</a>
        {types.map(t => (
          <a key={t} href={`/admin/transactions?type=${t}`}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: type === t ? 'var(--gold)' : 'transparent', color: type === t ? '#000' : 'var(--muted)', textDecoration: 'none' }}>
            {t.replace(/_/g, ' ')}
          </a>
        ))}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Type', 'From', 'To', 'Item', 'Amount', 'Description', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t: typeof transactions[0]) => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, color: TYPE_COLOURS[t.type] ?? 'var(--muted)', fontWeight: 700 }}>
                    {t.type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>@{t.fromUser?.username ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>@{t.toUser?.username ?? '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 12 }}>{t.edition?.item.name ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--gold)', fontWeight: 700 }}>${Number(t.amount).toLocaleString()}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12, maxWidth: 200 }}>{t.description ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>{t.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
          {pageNum > 1 && (
            <a href={`/admin/transactions?page=${pageNum - 1}${type ? `&type=${type}` : ''}`}
              style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--white)' }}>← Prev</a>
          )}
          <span style={{ padding: '6px 16px', fontSize: 13, color: 'var(--muted)' }}>Page {pageNum} of {pages}</span>
          {pageNum < pages && (
            <a href={`/admin/transactions?page=${pageNum + 1}${type ? `&type=${type}` : ''}`}
              style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--white)' }}>Next →</a>
          )}
        </div>
      )}
    </div>
  )
}
