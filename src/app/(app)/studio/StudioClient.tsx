'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = ['cars', 'yachts', 'watches', 'art', 'fashion', 'jets', 'mansions', 'collectibles', 'businesses']
const USER_CLASSES  = ['essential', 'premium', 'elite', 'grail']
const ADMIN_CLASSES = ['essential', 'premium', 'elite', 'grail', 'unique']

const CLASS_DESC: Record<string, string> = {
  essential: '10,000 max supply · entry tier',
  premium:   '1,000 max supply · popular tier',
  elite:     '100 max supply · rare tier',
  grail:     '10 max supply · ultra-rare',
  unique:    '1 of 1 · admin only',
}

interface Submission {
  id:         string
  name:       string
  category:   string
  class:      string
  isApproved: boolean
  isFrozen:   boolean
  imageUrl:   string | null
  editions:   number
  createdAt:  string
}

export default function StudioClient({ isAdmin, submissions: initial }: { isAdmin: boolean; submissions: Submission[] }) {
  const router = useRouter()
  const [showForm, setShowForm]         = useState(false)
  const [submissions, setSubmissions]   = useState(initial)
  const [busy, setBusy]                 = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')

  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState('cars')
  const [itemClass, setClass]     = useState('elite')
  const [imageUrl, setImageUrl]   = useState('')
  const [refPrice, setRefPrice]   = useState('')
  const [hasOwnerCost, setOwnerCost] = useState(false)
  const [ownerCostPct, setOwnerCostPct] = useState('0.5')

  const classes = isAdmin ? ADMIN_CLASSES : USER_CLASSES

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    const res = await fetch('/api/studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, description, category, class: itemClass, imageUrl: imageUrl || null,
        referencePrice: Number(refPrice),
        hasOwnershipCost: hasOwnerCost,
        ownershipCostPct: hasOwnerCost ? Number(ownerCostPct) / 100 : null,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setSuccess('Item submitted! It will appear in the marketplace once approved by an admin.')
      setShowForm(false)
      setName(''); setDesc(''); setImageUrl(''); setRefPrice('')
      router.refresh()
    } else {
      setError(json.error || 'Submission failed')
    }
    setBusy(false)
  }

  return (
    <div style={{ marginTop: 28 }}>
      {/* Success banner */}
      {success && (
        <div style={{ background: '#1e2a15', border: '1px solid var(--green)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--green)', fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Submit button */}
      {!showForm && (
        <button className="btn btn-gold" onClick={() => setShowForm(true)} style={{ marginBottom: 32 }}>
          + Craft new item
        </button>
      )}

      {/* Submission form */}
      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 20 }}>Craft a new item</div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Item name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Matte Black G-Wagon" required maxLength={80} />
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

            {/* Class picker */}
            <div className="form-group">
              <label className="form-label">Tier</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 6 }}>
                {classes.map(c => (
                  <button key={c} type="button" onClick={() => setClass(c)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${itemClass === c ? 'var(--gold)' : 'var(--border)'}`, background: itemClass === c ? 'rgba(200,169,110,0.1)' : 'var(--bg3)', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: itemClass === c ? 'var(--gold)' : 'var(--white)', textTransform: 'capitalize' }}>
                      {c} {c === 'unique' && '★'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{CLASS_DESC[c]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Reference price (USD)</label>
                <input className="form-input" type="number" min="1" value={refPrice} onChange={e => setRefPrice(e.target.value)} placeholder="e.g. 250000" required />
              </div>
              <div className="form-group">
                <label className="form-label">Image URL</label>
                <input className="form-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={hasOwnerCost} onChange={e => setOwnerCost(e.target.checked)} />
                Has weekly ownership cost (e.g. yacht, jet, mansion)
              </label>
              {hasOwnerCost && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="form-input" type="number" min="0.1" max="5" step="0.1" value={ownerCostPct} onChange={e => setOwnerCostPct(e.target.value)} style={{ width: 100 }} />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>% of value per week</span>
                </div>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-gold" type="submit" disabled={busy || !name || !refPrice}>
                {busy ? 'Submitting...' : 'Submit for approval'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); setError('') }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My submissions */}
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
                  {s.category} · <span className={`class-badge class-${s.class}`}>{s.class}</span>
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
