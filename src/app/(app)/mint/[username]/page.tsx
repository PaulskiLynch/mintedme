import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['cars', 'yachts', 'watches', 'art', 'fashion', 'jets', 'mansions', 'collectibles', 'businesses']

export default async function MintProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const session = await auth()

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      ownedEditions: {
        where: { isFrozen: false },
        include: { item: { select: { id: true, name: true, category: true, class: true, imageUrl: true } } },
        orderBy: { lastSalePrice: 'desc' },
      },
      _count: { select: { createdItems: true } },
    },
  })
  if (!user) notFound()

  const mintValue = user.ownedEditions.reduce((sum: number, e: typeof user.ownedEditions[0]) => sum + Number(e.lastSalePrice ?? 0), 0)
  const netWorth  = Number(user.balance) + mintValue
  const isOwn     = session?.user?.id === user.id

  const byCategory: Record<string, typeof user.ownedEditions> = {}
  for (const e of user.ownedEditions) {
    const cat = e.item.category
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(e)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'var(--gold)', flexShrink: 0 }}>
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : user.username[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>@{user.username}</h1>
          {user.tagline && <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 4 }}>{user.tagline}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {user.isEstablished && <span style={{ fontSize: 11, background: '#1e2a15', color: 'var(--green)', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>ESTABLISHED TRADER</span>}
            {user._count.createdItems > 0 && <span style={{ fontSize: 11, background: '#1e1a0a', color: 'var(--gold)', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>CREATOR</span>}
          </div>
        </div>
        {isOwn && (
          <div style={{ marginLeft: 'auto' }}>
            <Link href="/settings" className="btn btn-outline btn-sm">Edit Mint</Link>
          </div>
        )}
      </div>

      {/* Stats */}
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
        <div className="stat-box">
          <div className="stat-label">Items</div>
          <div className="stat-value">{user.ownedEditions.length}</div>
        </div>
      </div>

      {/* Items */}
      {user.ownedEditions.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          {isOwn ? 'Your Mint is empty. Head to the Marketplace.' : 'This Mint is empty. Sad millionaire noises.'}
        </div>
      ) : (
        <div>
          {Object.entries(byCategory).map(([cat, editions]) => (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 12 }}>{cat}</div>
              <div className="items-grid">
                {editions.map(e => (
                  <Link key={e.id} href={`/item/${e.id}`} style={{ textDecoration: 'none' }}>
                    <div className={`item-card tier-${e.item.class}`}>
                      <div className="item-card-img">
                        {e.item.imageUrl ? <img src={e.item.imageUrl} alt={e.item.name} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>}
                      </div>
                      <div className="item-card-body">
                        <div className="item-card-name">{e.item.name}</div>
                        <div className="item-card-price">{e.lastSalePrice ? '$' + Number(e.lastSalePrice).toLocaleString() : '—'}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
