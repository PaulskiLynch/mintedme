'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Item {
  id:             string
  name:           string
  category:       string
  rarityTier:     string
  imageUrl:       string | null
  isApproved:     boolean
  isFrozen:       boolean
  isOfficial:     boolean
  benchmarkPrice: string
  minimumBid:     string
  totalSupply:    number
  editionCount:   number
  unownedCount:   number
  inAuctionCount: number
  creatorName:    string | null
  createdAt:      string
}

interface Props {
  items:      Item[]
  categories: string[]
}

const RARITY_ORDER = ['Common', 'Premium', 'Rare', 'Exotic', 'Legendary', 'Mythic', 'Custom', 'Banger']

export default function AdminItemsClient({ items: initial, categories }: Props) {
  const router = useRouter()
  const [items, setItems]       = useState(initial)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'frozen'>('all')
  const [catFilter, setCatFilter]       = useState<string>('all')
  const [busy, setBusy]         = useState<string | null>(null)
  const [auctionMsg, setAuctionMsg] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i => {
      if (statusFilter === 'pending' && i.isApproved)  return false
      if (statusFilter === 'frozen'  && !i.isFrozen)   return false
      if (catFilter !== 'all' && i.category !== catFilter) return false
      if (q && !i.name.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, statusFilter, catFilter])

  async function action(itemId: string, act: string) {
    setBusy(itemId + act)
    const res = await fetch(`/api/admin/items/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: act }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => {
        if (i.id !== itemId) return i
        if (act === 'approve')  return { ...i, isApproved: true }
        if (act === 'reject')   return { ...i, isApproved: false }
        if (act === 'freeze')   return { ...i, isFrozen: true }
        if (act === 'unfreeze') return { ...i, isFrozen: false }
        return i
      }))
      router.refresh()
    }
    setBusy(null)
  }

  async function pushAuction(itemId: string) {
    setBusy(itemId + 'auction')
    setAuctionMsg(m => ({ ...m, [itemId]: '' }))
    const res  = await fetch(`/api/admin/items/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'push_auction' }),
    })
    const data = await res.json()
    if (res.ok) {
      setAuctionMsg(m => ({ ...m, [itemId]: '✓ Live in auction' }))
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, inAuctionCount: i.inAuctionCount + 1 } : i))
      router.refresh()
    } else {
      setAuctionMsg(m => ({ ...m, [itemId]: data.error ?? 'Failed' }))
    }
    setBusy(null)
  }

  const btn = (label: string, onClick: () => void, opts?: { danger?: boolean; gold?: boolean; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={opts?.disabled}
      style={{
        padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: opts?.disabled ? 'not-allowed' : 'pointer',
        background: opts?.gold ? 'var(--gold)' : opts?.danger ? 'rgba(224,90,90,0.15)' : 'var(--bg3)',
        color:      opts?.gold ? '#0d0d0d'      : opts?.danger ? 'var(--red)'             : 'var(--white)',
        border:     opts?.gold ? 'none'          : opts?.danger ? '1px solid var(--red)'   : '1px solid var(--border)',
        opacity:    opts?.disabled ? 0.5 : 1,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="form-input"
          style={{ maxWidth: 180 }}
        >
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'pending', 'frozen'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: '1px solid var(--border)',
                background: statusFilter === f ? 'var(--gold)' : 'transparent',
                color:      statusFilter === f ? '#000' : 'var(--muted)',
                cursor: 'pointer',
              }}>
              {f === 'all'     ? `All (${items.length})`
               : f === 'pending' ? `Pending (${items.filter(i => !i.isApproved).length})`
               : `Frozen (${items.filter(i => i.isFrozen).length})`}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{filtered.length} shown</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(item => (
          <div key={item.id} style={{
            background: 'var(--bg2)',
            border: `1px solid ${!item.isApproved ? 'rgba(224,90,90,0.4)' : item.isFrozen ? 'var(--muted)' : 'var(--border)'}`,
            borderRadius: 8, padding: '12px 16px',
            display: 'flex', gap: 14, alignItems: 'center',
          }}>
            {/* Thumbnail */}
            <div style={{ width: 56, height: 56, borderRadius: 6, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden' }}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span>{item.category}</span>
                <span>·</span>
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{item.rarityTier}</span>
                <span>·</span>
                <span>${Number(item.benchmarkPrice).toLocaleString()} value</span>
                <span>·</span>
                <span>{item.editionCount}/{item.totalSupply} editions</span>
                {item.unownedCount > 0 && <><span>·</span><span style={{ color: 'var(--green)', fontWeight: 700 }}>{item.unownedCount} available</span></>}
                {item.inAuctionCount > 0 && <><span>·</span><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{item.inAuctionCount} in auction</span></>}
                {item.creatorName && <><span>·</span><span>@{item.creatorName}</span></>}
              </div>
              <div style={{ fontSize: 11, marginTop: 3, display: 'flex', gap: 8 }}>
                {!item.isApproved && <span style={{ color: 'var(--red)', fontWeight: 700 }}>PENDING</span>}
                {item.isFrozen   && <span style={{ color: 'var(--muted)', fontWeight: 700 }}>FROZEN</span>}
                {item.isOfficial && <span style={{ color: 'var(--gold)', fontWeight: 700 }}>OFFICIAL</span>}
                {auctionMsg[item.id] && (
                  <span style={{ color: auctionMsg[item.id].startsWith('✓') ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    {auctionMsg[item.id]}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {btn('Edit', () => router.push(`/admin/items/${item.id}/edit`))}

              {!item.isApproved && btn('Approve', () => action(item.id, 'approve'), { gold: true, disabled: busy === item.id + 'approve' })}
              {!item.isApproved && btn('Reject',  () => action(item.id, 'reject'),  { danger: true, disabled: busy === item.id + 'reject' })}

              {item.isFrozen
                ? btn('Unfreeze', () => action(item.id, 'unfreeze'), { disabled: busy === item.id + 'unfreeze' })
                : btn('Freeze',   () => action(item.id, 'freeze'),   { danger: true, disabled: busy === item.id + 'freeze' })
              }

              {item.isApproved && !item.isFrozen && btn(
                busy === item.id + 'auction' ? '...' : '⏱ Auction',
                () => pushAuction(item.id),
                { gold: true, disabled: busy === item.id + 'auction' },
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>Nothing here.</div>
        )}
      </div>
    </div>
  )
}
