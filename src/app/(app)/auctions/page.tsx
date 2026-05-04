import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AuctionsPage() {
  const auctions = await prisma.auction.findMany({
    where: { status: 'active' },
    orderBy: { endsAt: 'asc' },
    include: {
      edition: {
        include: {
          item: { select: { name: true, imageUrl: true, category: true, class: true } },
        },
      },
      seller:        { select: { username: true } },
      currentWinner: { select: { username: true } },
      _count:        { select: { bids: true } },
    },
  })

  const ended = await prisma.auction.findMany({
    where: { status: 'ended' },
    orderBy: { endsAt: 'desc' },
    take: 10,
    include: {
      edition: { include: { item: { select: { name: true, imageUrl: true, category: true, class: true } } } },
      currentWinner: { select: { username: true } },
      _count: { select: { bids: true } },
    },
  })

  return (
    <div>
      <div className="page-title">Auctions</div>
      <div className="page-sub">Live and recent auctions</div>

      {/* Live auctions */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 14 }}>
          LIVE NOW {auctions.length > 0 && `· ${auctions.length}`}
        </div>

        {auctions.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
            No active auctions. Own an item and start one from its page.
          </div>
        ) : (
          <div className="items-grid">
            {auctions.map(a => (
              <Link key={a.id} href={`/auction/${a.id}`} style={{ textDecoration: 'none' }}>
                <div className={`item-card tier-${a.edition.item.class}`} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 10, letterSpacing: '0.05em' }}>
                    LIVE
                  </div>
                  <div className="item-card-img">
                    {a.edition.item.imageUrl
                      ? <img src={a.edition.item.imageUrl} alt={a.edition.item.name} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>
                    }
                  </div>
                  <div className="item-card-body">
                    <div className="item-card-name">{a.edition.item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                      ${Number(a.currentBid ?? a.startingBid).toLocaleString()}
                      {a._count.bids > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {a._count.bids} bid{a._count.bids !== 1 ? 's' : ''}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Ends {formatDistanceToNow(a.endsAt, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recently ended */}
      {ended.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 14 }}>RECENTLY ENDED</div>
          <div className="items-grid">
            {ended.map(a => (
              <Link key={a.id} href={`/auction/${a.id}`} style={{ textDecoration: 'none', opacity: 0.7 }}>
                <div className={`item-card tier-${a.edition.item.class}`}>
                  <div className="item-card-img">
                    {a.edition.item.imageUrl
                      ? <img src={a.edition.item.imageUrl} alt={a.edition.item.name} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>
                    }
                  </div>
                  <div className="item-card-body">
                    <div className="item-card-name">{a.edition.item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                      ${Number(a.currentBid ?? a.startingBid).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {a.currentWinner ? `Won by @${a.currentWinner.username}` : 'No winner'} · {formatDistanceToNow(a.endsAt, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
