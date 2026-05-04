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
  class: string
  imageUrl: string
  totalSupply: number
  referencePrice: string | null
  hasOwnershipCost: boolean
  ownershipCostPct: string | null
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

function classBadge(c: string) {
  const map: Record<string, string> = {
    essential: 'class-essential',
    premium:   'class-premium',
    elite:     'class-elite',
    grail:     'class-grail',
    unique:    'class-unique',
  }
  return map[c] ?? 'class-essential'
}

function tierBorder(c: string) {
  const map: Record<string, string> = {
    essential: 'tier-essential',
    premium:   'tier-premium',
    elite:     'tier-elite',
    grail:     'tier-grail',
    unique:    'tier-unique',
  }
  return map[c] ?? 'tier-essential'
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
      <div className="page-sub">Browse and acquire luxury assets</div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            style={{ maxWidth: 360 }}
            placeholder="Search items..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button className="btn btn-outline" type="submit">Search</button>
        </div>
      </form>

      {/* Category pills */}
      <div className="pill-row">
        {categories.map(c => (
          <button key={c} className={`pill${currentCategory === c ? ' active' : ''}`} onClick={() => nav({ category: c, sort: currentSort, q })}>
            {c}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>SORT:</span>
        {[['newest', 'Newest'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓']].map(([v, l]) => (
          <button key={v} className={`pill btn-sm${currentSort === v ? ' active' : ''}`} onClick={() => nav({ category: currentCategory, sort: v, q })}>
            {l}
          </button>
        ))}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          No items found.
        </div>
      ) : (
        <div className="items-grid">
          {items.map(item => {
            const listedEdition  = item.editions.find(e => e.isListed)
            const availableCount = item.editions.filter(e => !e.currentOwnerId).length
            const price = listedEdition?.listedPrice ?? item.referencePrice

            return (
              <Link key={item.id} href={`/item/${item.editions[0]?.id ?? item.id}`} style={{ textDecoration: 'none' }}>
                <div className={`item-card ${tierBorder(item.class)}`}>
                  <div className="item-card-img">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>
                        No image
                      </div>
                    )}
                  </div>
                  <div className="item-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div className="item-card-name">{item.name}</div>
                      <span className={`class-badge ${classBadge(item.class)}`}>{item.class}</span>
                    </div>
                    <div className="item-card-meta">{item.category}</div>
                    <div className="item-card-price">{fmt(price) ?? 'Offer only'}</div>
                    <div className="item-card-edition">
                      {availableCount > 0
                        ? `${availableCount} of ${item.totalSupply} available`
                        : 'Secondary market only'}
                    </div>
                    {listedEdition && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 11, background: 'var(--gold)', color: '#0d0d0d', fontWeight: 900, padding: '2px 8px', borderRadius: 4 }}>
                          BUY NOW
                        </span>
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
