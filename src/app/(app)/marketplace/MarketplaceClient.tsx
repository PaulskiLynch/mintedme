'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Edition {
  id: string
  editionNumber: number
  currentOwnerId: string | null
  isListed: boolean
  listedPrice: string | null
  isInAuction: boolean
  lastSalePrice: string | null
}

interface Item {
  id: string
  name: string
  category: string
  rarityTier: string
  imageUrl: string | null
  totalSupply: number
  minimumBid: string
  benchmarkPrice: string
  horsepower: number | null
  topSpeed: number | null
  zeroToHundred: string | null
  isOfficial: boolean
  editions: Edition[]
}

interface Props {
  items: Item[]
  categories: string[]
  currentCategory: string
  currentSort: string
  query: string
  userId: string | null
}

const RARITY_COLOURS: Record<string, string> = {
  Common:    '#888',
  Premium:   '#6db87a',
  Rare:      '#4ab8d8',
  Exotic:    '#b07fef',
  Legendary: '#e0a030',
  Mythic:    '#e05a5a',
}

function fmt(n: string | null) {
  if (!n) return null
  return '$' + Number(n).toLocaleString()
}

export default function MarketplaceClient({ items, categories, currentCategory, currentSort, query, userId }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(query)
  const [, startTransition] = useTransition()

  function nav(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.category && params.category !== 'All') sp.set('category', params.category)
    if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort)
    if (params.q) sp.set('q', params.q)
    startTransition(() => router.push(`/marketplace${sp.toString() ? '?' + sp.toString() : ''}`))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    nav({ category: currentCategory, sort: currentSort, q })
  }

  return (
    <div>
      <div className="page-title">Marketplace</div>
      <div className="page-sub">Browse and acquire collector cars</div>

      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ maxWidth: 360 }} placeholder="Search cars..." value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn btn-outline" type="submit">Search</button>
        </div>
      </form>

      <div className="pill-row">
        {categories.map(c => (
          <button key={c} className={`pill${currentCategory === c ? ' active' : ''}`} onClick={() => nav({ category: c, sort: currentSort, q })}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>SORT:</span>
        {[['newest', 'Newest'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓']].map(([v, l]) => (
          <button key={v} className={`pill btn-sm${currentSort === v ? ' active' : ''}`} onClick={() => nav({ category: currentCategory, sort: v, q })}>
            {l}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>No cars found.</div>
      ) : (
        <div className="items-grid">
          {items.map(item => {
            const listedEdition  = item.editions.find(e => e.isListed)
            const auctionEdition = item.editions.find(e => e.isInAuction)
            const availableCount = item.editions.filter(e => !e.currentOwnerId).length
            const colour         = RARITY_COLOURS[item.rarityTier] ?? 'var(--muted)'
            const editionId      = listedEdition?.id ?? auctionEdition?.id ?? item.editions[0]?.id
            const lastSold       = listedEdition?.lastSalePrice ?? auctionEdition?.lastSalePrice ?? item.editions.find(e => e.lastSalePrice)?.lastSalePrice ?? null

            return (
              <Link key={item.id} href={editionId ? `/item/${editionId}` : '#'} style={{ textDecoration: 'none' }}>
                <div className="item-card" style={{ borderColor: colour + '55' }}>
                  <div className="item-card-img">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>
                    }
                  </div>
                  <div className="item-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div className="item-card-name">{item.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: colour, flexShrink: 0, marginLeft: 6 }}>{item.rarityTier.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 1 }}>TRUE VALUE</div>
                    <div className="item-card-price">{fmt(item.benchmarkPrice)}</div>
                    {lastSold && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Last sold {fmt(lastSold)}</div>
                    )}
                    {(item.horsepower || item.topSpeed || item.zeroToHundred) && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', gap: 8 }}>
                        {item.horsepower && <span>{item.horsepower.toLocaleString()}hp</span>}
                        {item.topSpeed && <span>{item.topSpeed}km/h</span>}
                        {item.zeroToHundred && <span>{Number(item.zeroToHundred).toFixed(1)}s</span>}
                      </div>
                    )}
                    <div className="item-card-edition">
                      {auctionEdition
                        ? <span style={{ color: '#ff6b35' }}>Live auction</span>
                        : availableCount > 0
                        ? `${availableCount} of ${item.totalSupply} available`
                        : 'Secondary market only'}
                    </div>
                    {listedEdition && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 11, background: 'var(--gold)', color: '#0d0d0d', fontWeight: 900, padding: '2px 8px', borderRadius: 4 }}>BUY NOW</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
