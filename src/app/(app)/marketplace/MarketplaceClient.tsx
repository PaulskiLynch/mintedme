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
  lastSaleDate: string | null
}

interface Item {
  id: string
  name: string
  category: string
  rarityTier: string
  imageUrl: string | null
  businessRiskTier: string | null
  totalSupply: number
  minimumBid: string
  benchmarkPrice: string
  horsepower: number | null
  topSpeed: number | null
  zeroToHundred: string | null
  watcherCount: number
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

const BIZ_TIER_STYLES: Record<string, { bg: string; label: string; icon: string }> = {
  safe:     { bg: 'linear-gradient(135deg, #1a2e1a 0%, #0d1f0d 100%)', label: 'Safe',     icon: '🏦' },
  growth:   { bg: 'linear-gradient(135deg, #1a1f2e 0%, #0d1220 100%)', label: 'Growth',   icon: '📈' },
  risky:    { bg: 'linear-gradient(135deg, #2e1a10 0%, #200d08 100%)', label: 'Risky',    icon: '🎲' },
  prestige: { bg: 'linear-gradient(135deg, #2a1f0a 0%, #1c1408 100%)', label: 'Prestige', icon: '👑' },
}

const RARITY_COLOURS: Record<string, string> = {
  Common:    '#888',
  Premium:   '#6db87a',
  Rare:      '#4ab8d8',
  Exotic:    '#b07fef',
  Legendary: '#e0a030',
  Mythic:    '#e05a5a',
  Custom:    '#d0d0d0',
  Banger:    '#ff6b35',
}

function fmt(n: string | null) {
  if (!n) return null
  return '$' + Number(n).toLocaleString()
}

function trendSignal(editions: Edition[], benchmarkPrice: string): { label: string; colour: string } | null {
  const lastSale = editions.find(e => e.lastSalePrice)
  if (!lastSale?.lastSalePrice) return null
  const pct = ((Number(lastSale.lastSalePrice) - Number(benchmarkPrice)) / Number(benchmarkPrice)) * 100
  if (Math.abs(pct) < 2) return null
  return pct > 0
    ? { label: `↑ +${pct.toFixed(0)}% above value`, colour: 'var(--green)' }
    : { label: `↓ ${pct.toFixed(0)}% below value`,  colour: 'var(--red)' }
}

function scarcityLine(editions: Edition[], totalSupply: number): { text: string; urgent: boolean } | null {
  const available  = editions.filter(e => !e.currentOwnerId).length
  const claimed    = editions.filter(e => e.currentOwnerId).length

  const DAY = 86400000
  const soldToday  = editions.filter(e => e.lastSaleDate && Date.now() - new Date(e.lastSaleDate).getTime() < DAY).length

  if (soldToday > 0) return { text: `${soldToday} sold today`, urgent: true }
  if (available === 1 && claimed > 0) return { text: 'Only 1 left', urgent: true }
  if (available === 0 && claimed > 0) return { text: 'All claimed', urgent: false }
  return null
}

function MarketplaceCard({ item, userId }: { item: Item; userId: string | null }) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  const listedEdition  = item.editions.find(e => e.isListed)
  const auctionEdition = item.editions.find(e => e.isInAuction)
  const availableCount = item.editions.filter(e => !e.currentOwnerId).length
  const colour         = RARITY_COLOURS[item.rarityTier] ?? 'var(--muted)'
  const editionId      = listedEdition?.id ?? auctionEdition?.id ?? item.editions[0]?.id
  const lastSold       = listedEdition?.lastSalePrice ?? item.editions.find(e => e.lastSalePrice)?.lastSalePrice ?? null
  const trend          = trendSignal(item.editions, item.benchmarkPrice)
  const scarcity       = scarcityLine(item.editions, item.totalSupply)

  const href = editionId ? `/item/${editionId}` : '#'

  return (
    <div
      className="item-card"
      style={{
        borderColor: hovered ? colour : colour + '55',
        cursor: 'pointer',
        position: 'relative',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? `0 8px 24px ${colour}22` : 'none',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(href)}
    >
      <div className="item-card-img">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} />
          : item.businessRiskTier && BIZ_TIER_STYLES[item.businessRiskTier]
          ? (() => {
              const s = BIZ_TIER_STYLES[item.businessRiskTier!]
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: s.bg, gap: 8 }}>
                  <div style={{ fontSize: 36 }}>{s.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.1em' }}>{s.label.toUpperCase()} TIER</div>
                </div>
              )
            })()
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

        {/* Trend line */}
        {trend && (
          <div style={{ fontSize: 11, color: trend.colour, fontWeight: 700, marginBottom: 2 }}>{trend.label}</div>
        )}
        {!trend && item.watcherCount > 0 && (
          <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, marginBottom: 2 }}>🔥 {item.watcherCount} watching</div>
        )}

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

        {/* Availability / scarcity */}
        <div className="item-card-edition">
          {auctionEdition
            ? <span style={{ color: colour, fontWeight: 700 }}>Live auction</span>
            : (item.rarityTier === 'Custom' || item.rarityTier === 'Banger')
            ? <span style={{ color: colour, fontWeight: 700 }}>1 of 1 · Unique edition</span>
            : scarcity
            ? <span style={{ color: scarcity.urgent ? 'var(--red)' : 'var(--muted)', fontWeight: scarcity.urgent ? 700 : 400 }}>{scarcity.text}</span>
            : availableCount > 0
            ? `${availableCount} of ${item.totalSupply} available from MilliBux`
            : 'Secondary market only'}
        </div>

        {listedEdition && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, background: 'var(--gold)', color: '#0d0d0d', fontWeight: 900, padding: '2px 8px', borderRadius: 4 }}>BUY NOW</span>
          </div>
        )}
      </div>

      {/* Hover CTA overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(13,13,13,0.97) 40%)',
        padding: '32px 12px 12px',
        display: 'flex',
        gap: 6,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.15s, transform 0.15s',
        pointerEvents: hovered ? 'auto' : 'none',
      }}>
        <span
          onClick={e => { e.stopPropagation(); router.push(href) }}
          style={{ flex: 1, textAlign: 'center', background: 'var(--gold)', color: '#0d0d0d', fontWeight: 900, fontSize: 12, borderRadius: 6, padding: '7px 0', cursor: 'pointer' }}
        >
          {listedEdition ? 'Buy Now →' : 'View Asset →'}
        </span>
        {!listedEdition && editionId && (
          <span
            onClick={e => { e.stopPropagation(); router.push(href) }}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 700, fontSize: 12, borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}
          >
            👀
          </span>
        )}
      </div>
    </div>
  )
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
          {items.map(item => (
            <MarketplaceCard key={item.id} item={item} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}
