'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const RARITY_TIERS = ['Common', 'Premium', 'Rare', 'Exotic', 'Legendary', 'Mythic']

interface Submission {
  id:          string
  itemName:    string
  category:    string
  description: string | null
  status:      string
  adminNotes:  string | null
  createdAt:   string
  creator:     { username: string }
  linkedItem:  { id: string; name: string } | null
}

const STATUS_COLOUR: Record<string, string> = {
  pending:  'var(--gold)',
  approved: 'var(--green)',
  rejected: 'var(--muted)',
}

export default function AdminSuggestionsClient({ submissions: initial }: { submissions: Submission[] }) {
  const router = useRouter()
  const [subs, setSubs]       = useState(initial)
  const [filter, setFilter]   = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [busy, setBusy]       = useState('')

  // Approve modal state
  const [approving, setApproving] = useState<Submission | null>(null)
  const [benchmarkPrice, setBenchmarkPrice] = useState('')
  const [rarityTier, setRarityTier]         = useState('Common')
  const [totalSupply, setTotalSupply]       = useState('3')
  const [imageUrl, setImageUrl]             = useState('')
  const [description, setDescription]       = useState('')
  const [seedEdition, setSeedEdition]       = useState(true)
  const [approveError, setApproveError]     = useState('')

  // Reject modal state
  const [rejecting, setRejecting] = useState<Submission | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const filtered = subs.filter(s => filter === 'all' || s.status === filter)

  function openApprove(s: Submission) {
    setApproving(s)
    setBenchmarkPrice(''); setRarityTier('Common'); setTotalSupply('3')
    setImageUrl(''); setDescription(s.description ?? ''); setSeedEdition(true); setApproveError('')
  }

  async function submitApprove(e: React.FormEvent) {
    e.preventDefault()
    if (!approving) return
    setBusy(approving.id); setApproveError('')
    const res = await fetch(`/api/admin/suggestions/${approving.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'approve', benchmarkPrice: Number(benchmarkPrice), rarityTier, totalSupply: Number(totalSupply), imageUrl: imageUrl || undefined, description: description || undefined, seedEdition }),
    })
    const data = await res.json()
    if (!res.ok) { setApproveError(data.error ?? 'Failed'); setBusy(''); return }
    setSubs(prev => prev.map(s => s.id === approving.id ? { ...s, status: 'approved', linkedItem: { id: data.itemId, name: approving.itemName } } : s))
    setApproving(null); setBusy(''); router.refresh()
  }

  async function submitReject(e: React.FormEvent) {
    e.preventDefault()
    if (!rejecting) return
    setBusy(rejecting.id)
    await fetch(`/api/admin/suggestions/${rejecting.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reject', adminNotes: adminNotes || undefined }),
    })
    setSubs(prev => prev.map(s => s.id === rejecting.id ? { ...s, status: 'rejected', adminNotes: adminNotes || null } : s))
    setRejecting(null); setAdminNotes(''); setBusy(''); router.refresh()
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontSize: 13, boxSizing: 'border-box' }

  return (
    <div>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: filter === f ? 'var(--gold)' : 'transparent', color: filter === f ? '#000' : 'var(--muted)', cursor: 'pointer' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}{f === 'pending' ? ` (${subs.filter(s => s.status === 'pending').length})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>Nothing here.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(s => (
          <div key={s.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.itemName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                  {s.category} · by <strong>@{s.creator.username}</strong> · {new Date(s.createdAt).toLocaleDateString()}
                </div>
                {s.description && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>{s.description}</div>
                )}
                {s.adminNotes && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Note: {s.adminNotes}</div>
                )}
                {s.linkedItem && (
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>→ Created as: {s.linkedItem.name}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: STATUS_COLOUR[s.status] }}>
                  {s.status.toUpperCase()}
                </span>
                {s.status === 'pending' && (
                  <>
                    <button onClick={() => openApprove(s)} disabled={busy === s.id}
                      style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--green)', color: '#000', border: 'none', cursor: 'pointer' }}>
                      Approve
                    </button>
                    <button onClick={() => { setRejecting(s); setAdminNotes('') }} disabled={busy === s.id}
                      style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--bg3)', color: 'var(--red)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Approve modal */}
      {approving && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setApproving(null) }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-title">Approve Suggestion</div>
            <div className="modal-sub">"{approving.itemName}" by @{approving.creator.username}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Fill in the item details. The suggester gets to buy at 50% off.
            </div>
            <form onSubmit={submitApprove} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>BENCHMARK PRICE *</label>
                  <input style={inputStyle} type="number" min={1} value={benchmarkPrice} onChange={e => setBenchmarkPrice(e.target.value)} placeholder="e.g. 250000" required autoFocus />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>RARITY TIER *</label>
                  <select style={inputStyle} value={rarityTier} onChange={e => setRarityTier(e.target.value)}>
                    {RARITY_TIERS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>TOTAL SUPPLY *</label>
                  <input style={inputStyle} type="number" min={1} value={totalSupply} onChange={e => setTotalSupply(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>IMAGE URL</label>
                  <input style={inputStyle} value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="/items/my-item.png" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>DESCRIPTION</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              {benchmarkPrice && (
                <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
                  Suggester discount: ${Math.round(Number(benchmarkPrice) * 0.5).toLocaleString()} (50% off ${Math.round(Number(benchmarkPrice)).toLocaleString()})
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={seedEdition} onChange={e => setSeedEdition(e.target.checked)} />
                Seed edition #1 immediately
              </label>
              {approveError && <div style={{ color: 'var(--red)', fontSize: 13 }}>{approveError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={!!busy} className="btn btn-gold">{busy ? '...' : 'Approve & create item'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setApproving(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejecting && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setRejecting(null) }}>
          <div className="modal">
            <div className="modal-title">Reject Suggestion</div>
            <div className="modal-sub">"{rejecting.itemName}" by @{rejecting.creator.username}</div>
            <form onSubmit={submitReject} style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>NOTE TO USER (optional)</label>
                <input className="form-input" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="e.g. Too similar to existing item..." maxLength={300} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={!!busy} className="btn btn-danger">{busy ? '...' : 'Reject'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setRejecting(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
