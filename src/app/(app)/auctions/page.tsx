import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { businessNetIncome, businessYieldNet } from '@/lib/business'

export const dynamic = 'force-dynamic'

const RARITY_COLOUR: Record<string, string> = {
  Common:    '#888',
  Premium:   '#6db87a',
  Rare:      '#4ab8d8',
  Exotic:    '#b07fef',
  Legendary: '#e0a030',
  Mythic:    '#e05a5a',
  Custom:    '#d0d0d0',
  Banger:    '#ff6b35',
}

function fmt(n: number | string | null) {
  if (!n) return null
  return '$' + Number(n).toLocaleString()
}

export default async function AuctionsPage() {
  const [auctions, settled] = await Promise.all([
    prisma.auction.findMany({
      where:   { status: 'active' },
      orderBy: { endsAt: 'asc' },
      include: {
        edition: { include: { item: { select: { name: true, imageUrl: true, rarityTier: true, businessRiskTier: true } } } },
        _count:  { select: { bids: true } },
      },
    }),
    prisma.auction.findMany({
      where:   { status: 'settled' },
      orderBy: { endsAt: 'desc' },
      take: 10,
      include: {
        edition:       { include: { item: { select: { name: true, imageUrl: true, rarityTier: true, businessRiskTier: true } } } },
        currentWinner: { select: { username: true } },
        _count:        { select: { bids: true } },
      },
    }),
  ])

  return (
    <div>
      <div className="page-title">Auctions</div>
      <div className="page-sub">Open bidding — highest bid wins at close · 3-day auctions</div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 14 }}>
          LIVE NOW {auctions.length > 0 && `· ${auctions.length}`}
        </div>

        {auctions.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
            No active auctions — check back soon.
          </div>
        ) : (
          <div className="items-grid">
            {auctions.map(a => {
              const colour      = RARITY_COLOUR[a.edition.item.rarityTier] ?? 'var(--muted)'
              const currentBid  = a.currentBid ? Number(a.currentBid) : null
              const benchmark   = Number(a.benchmarkPrice)
              const pct         = currentBid ? Math.round(((currentBid - benchmark) / benchmark) * 100) : null
              return (
                <Link key={a.id} href={`/auction/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div className="item-card" style={{ borderColor: colour + '77', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 10 }}>
                      LIVE
                    </div>
                    <div className="item-card-img">
                      {a.edition.item.imageUrl
                        ? <img src={a.edition.item.imageUrl} alt={a.edition.item.name} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>
                      }
                    </div>
                    <div className="item-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div className="item-card-name">{a.edition.item.name}</div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: colour, flexShrink: 0, marginLeft: 6 }}>{a.rarityTier.toUpperCase()}</span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 1 }}>TRUE VALUE</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--white)', marginBottom: 4 }}>{fmt(benchmark)}</div>

                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 1 }}>CURRENT BID</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', marginBottom: 2 }}>
                        {currentBid ? fmt(currentBid) : <span style={{ color: 'var(--muted)', fontWeight: 400 }}>No bids yet</span>}
                      </div>

                      {pct !== null && (
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4,
                          color: pct <= -20 ? 'var(--green)' : pct >= 20 ? 'var(--red)' : 'var(--muted)' }}>
                          {pct < 0 ? `${Math.abs(pct)}% below value` : pct > 0 ? `${pct}% above value` : 'at value'}
                        </div>
                      )}

                      {a.edition.item.businessRiskTier && (() => {
                        const net   = businessNetIncome(a.edition.item.businessRiskTier, benchmark)
                        const yield_ = (businessYieldNet(a.edition.item.businessRiskTier) * 100).toFixed(1)
                        return (
                          <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '5px 8px', marginBottom: 4 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                              +${net.toLocaleString()}/mo net · {yield_}% yield
                            </div>
                          </div>
                        )
                      })()}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                        <span>{a._count.bids} bid{a._count.bids !== 1 ? 's' : ''}</span>
                        <span>Ends {formatDistanceToNow(a.endsAt, { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {settled.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 14 }}>RECENTLY SETTLED</div>
          <div className="items-grid">
            {settled.map(a => {
              const colour    = RARITY_COLOUR[a.edition.item.rarityTier] ?? 'var(--muted)'
              const benchmark = Number(a.benchmarkPrice)
              const winning   = a.winningBid ? Number(a.winningBid) : null
              const pct       = winning ? Math.round(((winning - benchmark) / benchmark) * 100) : null
              return (
                <Link key={a.id} href={`/auction/${a.id}`} style={{ textDecoration: 'none', opacity: 0.8 }}>
                  <div className="item-card" style={{ borderColor: colour + '44' }}>
                    <div className="item-card-img">
                      {a.edition.item.imageUrl
                        ? <img src={a.edition.item.imageUrl} alt={a.edition.item.name} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>
                      }
                    </div>
                    <div className="item-card-body">
                      <div className="item-card-name">{a.edition.item.name}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', marginBottom: 2 }}>
                        {winning ? fmt(winning) : '—'}
                      </div>
                      {pct !== null && (
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4,
                          color: pct <= -20 ? 'var(--green)' : pct >= 20 ? 'var(--red)' : 'var(--muted)' }}>
                          {pct <= -20 ? `Steal — ${Math.abs(pct)}% below value`
                            : pct >= 20 ? `Overpaid — ${pct}% above value`
                            : pct < 0 ? `${Math.abs(pct)}% below value`
                            : `${pct}% above value`}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {a.currentWinner ? `Won by @${a.currentWinner.username}` : 'No winner'} · {a._count.bids} bid{a._count.bids !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
