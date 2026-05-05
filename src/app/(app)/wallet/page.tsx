import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = {
  purchase:       'Purchase',
  sale:           'Sale',
  auction_sale:   'Auction sale',
  auction_win:    'Auction win',
  creator_earning:'Creator royalty',
  ownership_cost: 'Ownership cost',
  starting_bonus: 'Starting bonus',
  fee:            'Fee',
  offer_accept:   'Offer accepted',
}

export default async function WalletPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      balance: true,
      ownedEditions: {
        select: {
          lastSalePrice: true,
          item: { select: { referencePrice: true } },
        },
      },
    },
  })
  if (!user) redirect('/login')

  const mintValue = user.ownedEditions.reduce(
    (sum: number, e: typeof user.ownedEditions[0]) =>
      sum + Number(e.lastSalePrice ?? e.item.referencePrice ?? 0),
    0
  )
  const netWorth = Number(user.balance) + mintValue

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      edition: { include: { item: { select: { name: true, imageUrl: true } } } },
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
          <div className="stat-value">${mintValue.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">${netWorth.toLocaleString()}</div>
        </div>
      </div>

      <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 14 }}>Transaction History</h3>
      {transactions.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>No transactions yet.</div>
      ) : (
        <div>
          {transactions.map((t: typeof transactions[0]) => {
            const isIncoming = t.toUserId === session.user.id
            const sign   = isIncoming ? '+' : '−'
            const colour = isIncoming ? 'var(--green)' : 'var(--red)'
            const label  = TYPE_LABEL[t.type] ?? t.type
            const row = (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                {/* Thumbnail */}
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden' }}>
                  {t.edition?.item.imageUrl
                    ? <img src={t.edition.item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }}>—</div>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.edition?.item.name ?? (t.description ?? label)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {label} · {new Date(t.createdAt).toLocaleDateString()}
                    {isIncoming && t.fromUser && <> · from @{t.fromUser.username}</>}
                    {!isIncoming && t.toUser   && <> · to @{t.toUser.username}</>}
                  </div>
                </div>

                <span style={{ fontWeight: 900, color: colour, fontSize: 16, flexShrink: 0 }}>
                  {sign}${Number(t.amount).toLocaleString()}
                </span>
              </div>
            )

            return t.edition ? (
              <Link key={t.id} href={`/item/${t.edition.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                {row}
              </Link>
            ) : (
              <div key={t.id}>{row}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
