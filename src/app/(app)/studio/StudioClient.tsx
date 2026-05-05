'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES    = ['cars', 'yachts', 'watches', 'art', 'fashion', 'jets', 'mansions', 'collectibles', 'businesses']
const USER_RARITIES  = ['Common', 'Rare', 'Exotic']
const ADMIN_RARITIES = ['Common', 'Rare', 'Exotic', 'Legendary', 'Mythic']

const RARITY_DESC: Record<string, string> = {
  Common:    '10 max supply · entry tier',
  Rare:      '7 max supply · popular tier',
  Exotic:    '5 max supply · rare tier',
  Legendary: '3 max supply · ultra-rare',
  Mythic:    '1 of 1 · admin only',
}

const RARITY_COLOUR: Record<string, string> = {
  Common:    '#888',
  Rare:      '#4ab8d8',
  Exotic:    '#b07fef',
  Legendary: '#e0a030',
  Mythic:    '#e05a5a',
}

interface Submission {
  id:         string
  name:       string
  category:   string
  rarityTier: string
  isApproved: boolean
  isFrozen:   boolean
  imageUrl:   string | null
  editions:   number
  createdAt:  string
}

export default function StudioClient({ isAdmin, submissions: initial }: { isAdmin: boolean; submissions: Submission[] }) {
  const router = useRouter()
  const [showForm, setShowForm]       = useState(false)
  const [submissions, setSubmissions] = useState(initial)
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  const [name, setName]             = useState('')
  const [description, setDesc]      = useState('')
  const [category, setCategory]     = useState('cars')
  const [rarityTier, setRarity]     = useState('Exotic')
  const [imageUrl, setImageUrl]     = useState('')
  const [suggestedPrice, setPrice]  = useState('')

  const rarities = isAdmin ? ADMIN_RARITIES : USER_RARITIES

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    const res = await fetch('/api/studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, category, rarityTier, imageUrl: imageUrl || null, suggestedPrice: Number(suggestedPrice) }),
    })
    const json = await res.json()
    if (res.ok) {
      setSuccess('Item submitted! It will appear in the marketplace once approved by an admin.')
      setShowForm(false)
      setName(''); setDesc(''); setImageUrl(''); setPrice('')
      setSubmissions(prev => [{ id: json.itemId, name, category, rarityTier, isApproved: false, isFrozen: false, imageUrl: imageUrl || null, editions: 0, createdAt: new Date().toISOString() }, ...prev])
      router.refresh()
    } else {
      setError(json.error || 'Submission failed')
    }
    setBusy(false)
  }

  return (
    <div style={{ marginTop: 28 }}>
      {success && (
        <div style={{ background: '#1e2a15', border: '1px solid var(--green)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--green)', fontSize: 13 }}>
          {success}
        </div>
      )}

      {!showForm && (
        <button className="btn btn-gold" onClick={() => setShowForm(true)} style={{ marginBottom: 32 }}>
          + Craft new item
        </button>
      )}

      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 20 }}>Craft a new item</div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Item name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Phantom GT Coupe" required maxLength={80} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={description} onChange={e => setDesc(e.target.value)} placeholder="What makes this special?" rows={2} style={{ resize: 'vertical' }} maxLength={300} />
            </div>

            <div className="form-group">
              <label className="form-label">Rarity tier</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginTop: 6 }}>
                {rarities.map(r => (
                  <button key={r} type="button" onClick={() => setRarity(r)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${rarityTier === r ? RARITY_COLOUR[r] : 'var(--border)'}`, background: rarityTier === r ? RARITY_COLOUR[r] + '18' : 'var(--bg3)', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: rarityTier === r ? RARITY_COLOUR[r] : 'var(--white)' }}>{r}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{RARITY_DESC[r]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Suggested value (USD)</label>
                <input className="form-input" type="number" min="1" value={suggestedPrice} onChange={e => setPrice(e.target.value)} placeholder="e.g. 500000" required />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Minimum bid will be 10% of this. Admin sets final pricing.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Image URL</label>
                <input className="form-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-gold" type="submit" disabled={busy || !name || !suggestedPrice}>
                {busy ? 'Submitting...' : 'Submit for approval'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 14 }}>
        MY SUBMISSIONS {submissions.length > 0 && `· ${submissions.length}`}
      </div>

      {submissions.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          Nothing submitted yet. Craft your first item above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submissions.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 6, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden' }}>
                {s.imageUrl && <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {s.category} · <span style={{ color: RARITY_COLOUR[s.rarityTier] ?? 'var(--muted)', fontWeight: 700 }}>{s.rarityTier}</span>
                  {' '}· {s.editions} editions
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                {s.isFrozen ? (
                  <span style={{ fontSize: 11, background: 'var(--bg3)', color: 'var(--red)', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>FROZEN</span>
                ) : s.isApproved ? (
                  <Link href={`/item/${s.id}`} style={{ fontSize: 11, background: '#1e2a15', color: 'var(--green)', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>LIVE ↗</Link>
                ) : (
                  <span style={{ fontSize: 11, background: 'var(--bg3)', color: 'var(--gold)', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>PENDING</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
