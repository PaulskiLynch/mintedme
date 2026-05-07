import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const TYPE_COLOURS: Record<string, string> = {
  purchase:                    'var(--gold)',
  sale:                        'var(--green)',
  primary_purchase:            '#6c8ebf',
  creator_earning:             'var(--green)',
  offer_accept:                'var(--gold)',
  auction_bid_lock:            '#a78bfa',
  auction_bid_increase:        '#a78bfa',
  auction_bid_release:         'var(--muted)',
  auction_settlement_debit:    'var(--red)',
  auction_settlement_credit:   'var(--green)',
  auction_cancel_release:      'var(--muted)',
  upkeep:                      'var(--red)',
  upkeep_debt:                 'var(--red)',
  business_income:             'var(--green)',
  salary:                      'var(--green)',
  admin_adjustment:            '#f59e0b',
  reversal:                    '#f59e0b',
  challenge_reward:            'var(--green)',
  starting_bonus:              'var(--green)',
  liquidation_refund:          'var(--muted)',
}

const TYPE_GROUPS: Record<string, string[]> = {
  'Market':    ['purchase', 'sale', 'primary_purchase', 'creator_earning', 'offer_accept'],
  'Auctions':  ['auction_bid_lock', 'auction_bid_increase', 'auction_bid_release', 'auction_settlement_debit', 'auction_settlement_credit', 'auction_cancel_release'],
  'Economy':   ['upkeep', 'upkeep_debt', 'business_income', 'salary', 'challenge_reward', 'starting_bonus'],
  'Admin':     ['admin_adjustment', 'reversal', 'liquidation_refund'],
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; q?: string }>
}) {
  const { page, type, q } = await searchParams
  const pageNum = Math.max(1, Number(page ?? 1))
  const take    = 50
  const skip    = (pageNum - 1) * take

  const where: Parameters<typeof prisma.transaction.findMany>[0]['where'] = {
    ...(type ? { type } : {}),
    ...(q ? {
      OR: [
        { fromUser: { username: { contains: q, mode: 'insensitive' } } },
        { toUser:   { username: { contains: q, mode: 'insensitive' } } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  }

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

  const sel: React.CSSProperties = {
    padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--white)', fontSize: 12,
  }
  const inp: React.CSSProperties = { ...sel, minWidth: 200 }

  const qs = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (params.type) p.set('type', params.type)
    if (params.q)    p.set('q',    params.q)
    if (params.page) p.set('page', params.page)
    const s = p.toString()
    return `/admin/transactions${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Transactions</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>{total.toLocaleString()} matching</div>

      {/* Filters */}
      <form method="GET" action="/admin/transactions" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input name="q" defaultValue={q ?? ''} placeholder="Search user or description…" style={inp} />

        <select name="type" defaultValue={type ?? ''} style={sel}>
          <option value="">All types</option>
          {Object.entries(TYPE_GROUPS).map(([group, types]) => (
            <optgroup key={group} label={group}>
              {types.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <button type="submit" style={{ padding: '7px 16px', background: 'var(--gold)', color: '#000', fontWeight: 700, fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer' }}>
          Filter
        </button>
        {(type || q) && (
          <a href="/admin/transactions" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>Clear</a>
        )}
      </form>

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
            {transactions.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No transactions found.</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, color: TYPE_COLOURS[t.type] ?? 'var(--muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {t.type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>{t.fromUser ? `@${t.fromUser.username}` : '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>{t.toUser   ? `@${t.toUser.username}`   : '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 12 }}>{t.edition?.item.name ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>${Number(t.amount).toLocaleString()}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12, maxWidth: 200 }}>{t.description ?? '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {t.createdAt.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
          {pageNum > 1 && (
            <a href={qs({ type, q, page: String(pageNum - 1) })}
              style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--white)' }}>← Prev</a>
          )}
          <span style={{ padding: '6px 16px', fontSize: 13, color: 'var(--muted)' }}>Page {pageNum} of {pages}</span>
          {pageNum < pages && (
            <a href={qs({ type, q, page: String(pageNum + 1) })}
              style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--white)' }}>Next →</a>
          )}
        </div>
      )}
    </div>
  )
}
