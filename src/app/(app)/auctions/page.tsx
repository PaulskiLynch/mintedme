import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

const RARITY_COLOUR: Record<string, string> = {
  Common:    '#888',
  Rare:      '#4ab8d8',
  Exotic:    '#b07fef',
  Legendary: '#e0a030',
  Mythic:    '#e05a5a',
}

export default async function AuctionsPage() {
  const [auctions, settled] = await Promise.all([
    prisma.auction.findMany({
      where:   { status: 'active' },
      orderBy: { endsAt: 'asc' },
      include: {
        edition: { include: { item: { select: { name: true, imageUrl: true, rarityTier: true } } } },
        _count:  { select: { bids: true } },
      },
    }),
    prisma.auction.findMany({
      where:   { status: 'settled' },
      orderBy: { endsAt: 'desc' },
      take: 10,
      include: {
        edition:      { include: { item: { select: { name: true, imageUrl: true, rarityTier: true } } } },
        currentWinner:{ select: { username: true } },
        _count:       { select: { bids: true } },
      },
    }),
  ])

  return (
    <div>
      <div className="page-title">Auctions</div>
      <div className="page-sub">Sealed bids — highest bid wins at close</div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 14 }}>
          LIVE NOW {auctions.length > 0 && `· ${auctions.length}`}
        </div>

        {auctions.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
            No active auctions right now.
          </div>
        ) : (
          <div className="items-grid">
            {auctions.map(a => {
              const colour = RARITY_COLOUR[a.edition.item.rarityTier] ?? 'var(--muted)'
              return (
                <Link key={a.id} href={`/auction/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div className="item-card" style={{ borderColor: colour + '55', position: 'relative' }}>
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
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                        Min ${Number(a.minimumBid).toLocaleString()}
                        <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {a._count.bids} bid{a._count.bids !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        Ends {formatDistanceToNow(a.endsAt, { addSuffix: true })}
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
              const colour = RARITY_COLOUR[a.edition.item.rarityTier] ?? 'var(--muted)'
              return (
                <Link key={a.id} href={`/auction/${a.id}`} style={{ textDecoration: 'none', opacity: 0.75 }}>
                  <div className="item-card" style={{ borderColor: colour + '44' }}>
                    <div className="item-card-img">
                      {a.edition.item.imageUrl
                        ? <img src={a.edition.item.imageUrl} alt={a.edition.item.name} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>
                      }
                    </div>
                    <div className="item-card-body">
                      <div className="item-card-name">{a.edition.item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                        {a.winningBid ? '$' + Number(a.winningBid).toLocaleString() : '—'}
                        {a.luckyUndervalueWin && <span style={{ marginLeft: 6, color: 'var(--green)', fontSize: 10 }}>UNDERVALUE WIN</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
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
