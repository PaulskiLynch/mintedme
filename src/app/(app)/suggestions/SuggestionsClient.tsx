'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface LinkedItem {
  id: string
  name: string
  imageUrl: string | null
  benchmarkPrice: string
}

interface Submission {
  id:          string
  itemName:    string
  category:    string
  description: string | null
  status:      string
  adminNotes:  string | null
  createdAt:   string
  discountUsed: boolean
  linkedItem:  LinkedItem | null
}

const STATUS_COLOUR: Record<string, { color: string; bg: string }> = {
  pending:  { color: 'var(--gold)',   bg: '#2a1f00' },
  approved: { color: 'var(--green)',  bg: '#0d2010' },
  rejected: { color: 'var(--muted)', bg: 'var(--bg3)' },
}

export default function SuggestionsClient({ submissions: initial }: { submissions: Submission[] }) {
  const t      = useTranslations('suggestions')
  const router = useRouter()
  const [subs, setSubs]         = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [category, setCategory] = useState('cars')
  const [description, setDescription] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  const pending = subs.filter(s => s.status === 'pending').length

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await fetch('/api/suggestions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemName: name, category, description }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setBusy(false); return }
    setName(''); setDescription(''); setShowForm(false); setBusy(false)
    router.refresh()
  }

  async function withdraw(id: string) {
    await fetch('/api/suggestions', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setSubs(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div>
      {/* Submit button / form */}
      {!showForm ? (
        <button
          className="btn btn-gold"
          onClick={() => setShowForm(true)}
          disabled={pending >= 3}
          style={{ marginBottom: 28 }}
        >
          {t('submitBtn')}
        </button>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>{t('formTitle')}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{t('formSubtitle')}</div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 6 }}>{t('categoryLabel')}</label>
              <select
                className="form-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="cars">{t('categoryCars')}</option>
                <option value="businesses">{t('categoryBiz')}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 6 }}>{t('nameLabel')}</label>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                required
                autoFocus
                maxLength={100}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 6 }}>
                {t('detailsLabel')} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{t('detailsOptional')}</span>
              </label>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('detailsPlaceholder')}
                rows={3}
                maxLength={500}
                style={{ resize: 'vertical' }}
              />
            </div>
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-gold" type="submit" disabled={busy}>{busy ? '...' : t('submit')}</button>
              <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); setError('') }}>{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {pending >= 3 && !showForm && (
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          {t('maxPending')}
        </div>
      )}

      {/* Submission history */}
      {subs.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          {t('empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {subs.map(s => {
            const st = STATUS_COLOUR[s.status] ?? STATUS_COLOUR.pending
            const STATUS_KEY: Record<string, 'statusPending' | 'statusApproved' | 'statusRejected'> = {
              pending: 'statusPending', approved: 'statusApproved', rejected: 'statusRejected',
            }
            const statusLabel = STATUS_KEY[s.status] ? t(STATUS_KEY[s.status]) : s.status
            const discountPrice = s.linkedItem
              ? Math.round(Number(s.linkedItem.benchmarkPrice) * 0.5)
              : null
            return (
              <div key={s.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.itemName}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {s.category.charAt(0).toUpperCase() + s.category.slice(1)}
                      {s.description && <> · {s.description}</>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>
                    {statusLabel.toUpperCase()}
                  </span>
                </div>

                {s.adminNotes && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {t('adminNote', { note: s.adminNotes })}
                  </div>
                )}

                {/* Approved — show discount buy CTA */}
                {s.status === 'approved' && s.linkedItem && discountPrice !== null && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: '#0d2010', border: '1px solid #1a4020', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>
                      {t('approvedTitle')}
                    </div>
                    {s.discountUsed ? (
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('discountUsed', { name: s.linkedItem.name })}</div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontSize: 13 }}>
                          {t('discountCta', { name: s.linkedItem.name, price: `$${discountPrice.toLocaleString()}` })}
                          <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>
                            {t('discountOff', { original: Math.round(Number(s.linkedItem.benchmarkPrice)).toLocaleString() })}
                          </span>
                        </div>
                        <Link href={`/item/${s.linkedItem.id}`} className="btn btn-gold btn-sm">{t('claimDiscount')}</Link>
                      </div>
                    )}
                  </div>
                )}

                {s.status === 'pending' && (
                  <button
                    onClick={() => withdraw(s.id)}
                    style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                  >
                    {t('withdraw')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
