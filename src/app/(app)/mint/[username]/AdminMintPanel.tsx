'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Edition {
  id:          string
  editionNumber: number
  item: {
    id:        string
    name:      string
    imageUrl:  string | null
    category:  string
    rarityTier: string
  }
}

interface SearchResult {
  id:          string
  name:        string
  imageUrl:    string | null
  category:    string
  rarityTier:  string
  available:   number
  nextEdition: { id: string; editionNumber: number } | null
  alreadyOwned: boolean
}

export default function AdminMintPanel({
  profileUserId,
  editions,
}: {
  profileUserId: string
  editions:      Edition[]
}) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy]         = useState<string | null>(null)
  const [message, setMessage]   = useState<{ text: string; ok: boolean } | null>(null)
  const debounce                = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    fetch(`/api/admin/users/${profileUserId}/mint?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => { setResults(data); setSearching(false) })
      .catch(() => setSearching(false))
  }, [profileUserId])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(query), 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [query, search])

  async function assign(editionId: string) {
    setBusy('assign-' + editionId)
    const res = await fetch(`/api/admin/users/${profileUserId}/mint`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign', editionId }),
    })
    const data = await res.json()
    setBusy(null)
    setMessage({ text: res.ok ? 'Item added to mint.' : (data.error ?? 'Failed'), ok: res.ok })
    if (res.ok) { setQuery(''); setResults([]); router.refresh() }
    setTimeout(() => setMessage(null), 3000)
  }

  async function remove(editionId: string) {
    setBusy('remove-' + editionId)
    const res = await fetch(`/api/admin/users/${profileUserId}/mint`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', editionId }),
    })
    const data = await res.json()
    setBusy(null)
    setMessage({ text: res.ok ? 'Item removed.' : (data.error ?? 'Failed'), ok: res.ok })
    if (res.ok) router.refresh()
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '9px 16px', borderRadius: 8,
          background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.25)',
          color: 'var(--gold)', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
        <span>⚙ ADMIN — EDIT MINT</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.2)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16 }}>

          {message && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700,
              background: message.ok ? 'rgba(76,175,125,0.15)' : 'rgba(224,90,90,0.15)',
              color: message.ok ? 'var(--green)' : 'var(--red)', border: `1px solid ${message.ok ? 'var(--green)' : 'var(--red)'}44`,
            }}>
              {message.text}
            </div>
          )}

          {/* ── Add item ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 8 }}>ADD ITEM TO MINT</div>
            <input
              type="text"
              placeholder="Search items by name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontSize: 13, boxSizing: 'border-box' }}
              autoComplete="off"
            />

            {searching && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Searching…</div>}

            {results.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {results.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 4, background: 'var(--bg)', flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {item.category} · {item.rarityTier}
                        {item.alreadyOwned && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>· already owns one</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {item.available > 0 && item.nextEdition ? (
                        <button
                          disabled={!!busy}
                          onClick={() => assign(item.nextEdition!.id)}
                          style={{ padding: '5px 12px', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                          {busy === 'assign-' + item.nextEdition.id ? '…' : `Add #${item.nextEdition.editionNumber}`}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>No editions available</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {query.length >= 2 && !searching && results.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>No items found. <Link href="/admin/items/new" style={{ color: 'var(--gold)' }}>Create one →</Link></div>
            )}
          </div>

          {/* ── Remove items ── */}
          {editions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.08em', marginBottom: 8 }}>REMOVE FROM MINT</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                {editions.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--bg3)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {e.item.imageUrl
                      ? <img src={e.item.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg)', flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>#{e.editionNumber} · {e.item.category}</div>
                    </div>
                    <button
                      disabled={!!busy}
                      onClick={() => remove(e.id)}
                      style={{ padding: '4px 10px', background: 'rgba(224,90,90,0.15)', color: 'var(--red)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                      {busy === 'remove-' + e.id ? '…' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
