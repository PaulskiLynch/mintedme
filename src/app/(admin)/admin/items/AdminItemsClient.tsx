'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Item {
  id:           string
  name:         string
  category:     string
  rarityTier:   string
  imageUrl:     string | null
  isApproved:   boolean
  isFrozen:     boolean
  isOfficial:   boolean
  minimumBid:   string
  totalSupply:  number
  editionCount: number
  creatorName:  string | null
  createdAt:    string
}

export default function AdminItemsClient({ items: initial }: { items: Item[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'pending' | 'frozen'>('all')
  const [busy, setBusy] = useState<string | null>(null)

  const filtered = items.filter(i => {
    if (filter === 'pending') return !i.isApproved
    if (filter === 'frozen')  return i.isFrozen
    return true
  })

  async function action(itemId: string, act: string) {
    setBusy(itemId + act)
    const res = await fetch(`/api/admin/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => {
        if (i.id !== itemId) return i
        if (act === 'approve')   return { ...i, isApproved: true }
        if (act === 'reject')    return { ...i, isApproved: false }
        if (act === 'freeze')    return { ...i, isFrozen: true }
        if (act === 'unfreeze')  return { ...i, isFrozen: false }
        return i
      }))
      router.refresh()
    }
    setBusy(null)
  }

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'pending', 'frozen'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: filter === f ? 'var(--gold)' : 'transparent', color: filter === f ? '#000' : 'var(--muted)', cursor: 'pointer' }}>
            {f === 'all' ? `All (${items.length})` : f === 'pending' ? `Pending (${items.filter(i => !i.isApproved).length})` : `Frozen (${items.filter(i => i.isFrozen).length})`}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(item => (
          <div key={item.id} style={{ background: 'var(--bg2)', border: `1px solid ${!item.isApproved ? 'var(--red)' : item.isFrozen ? 'var(--muted)' : 'var(--border)'}`, borderRadius: 8, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Thumbnail */}
            <div style={{ width: 64, height: 64, borderRadius: 6, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden' }}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {item.category} · <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{item.rarityTier}</span>
                {' '}· {item.editionCount}/{item.totalSupply} editions
                {' '}· ${Number(item.minimumBid).toLocaleString()} min bid
                {item.creatorName && <> · by @{item.creatorName}</>}
                {item.isOfficial && <> · <span style={{ color: 'var(--gold)' }}>official</span></>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {!item.isApproved && <span style={{ color: 'var(--red)', fontWeight: 700, marginRight: 8 }}>PENDING APPROVAL</span>}
                {item.isFrozen   && <span style={{ color: 'var(--muted)', fontWeight: 700, marginRight: 8 }}>FROZEN</span>}
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {!item.isApproved ? (
                <>
                  <button onClick={() => action(item.id, 'approve')} disabled={!!busy}
                    style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--green)', color: '#000', border: 'none', cursor: 'pointer' }}>
                    {busy === item.id + 'approve' ? '...' : 'Approve'}
                  </button>
                  <button onClick={() => action(item.id, 'reject')} disabled={!!busy}
                    style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    {busy === item.id + 'reject' ? '...' : 'Reject'}
                  </button>
                </>
              ) : null}
              {item.isFrozen ? (
                <button onClick={() => action(item.id, 'unfreeze')} disabled={!!busy}
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--bg3)', color: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  {busy === item.id + 'unfreeze' ? '...' : 'Unfreeze'}
                </button>
              ) : (
                <button onClick={() => action(item.id, 'freeze')} disabled={!!busy}
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--bg3)', color: 'var(--red)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  {busy === item.id + 'freeze' ? '...' : 'Freeze'}
                </button>
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
