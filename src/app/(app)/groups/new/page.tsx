'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function NewGroupPage() {
  const t = useTranslations('groups.new')
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName]           = useState('')
  const [description, setDescription] = useState('')
  const [joinType, setJoinType]   = useState<'open' | 'invite_only'>('open')
  const [maxMembers, setMaxMembers] = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, joinType, maxMembers: maxMembers || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); setLoading(false); return }
      startTransition(() => router.push(`/groups/${data.slug}`))
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="page-title">{t('title')}</div>
      <div className="page-sub" style={{ marginBottom: 32 }}>{t('subtitle')}</div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
            {t('nameLabel')}
          </label>
          <input
            className="form-input"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={60}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
            {t('descriptionLabel')}
          </label>
          <textarea
            className="form-input"
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={280}
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 10 }}>
            {t('membershipLabel')}
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['open', 'invite_only'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setJoinType(type)}
                style={{
                  flex: 1, padding: '10px 0', border: `1px solid ${joinType === type ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius: 8, background: joinType === type ? 'rgba(200,169,110,0.1)' : 'var(--bg2)',
                  color: joinType === type ? 'var(--gold)' : 'var(--muted)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                {type === 'open' ? t('open') : t('inviteOnly')}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {joinType === 'open' ? t('openNote') : t('inviteOnlyNote')}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
            {t('maxMembersLabel')} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t('maxMembersOptional')}</span>
          </label>
          <input
            className="form-input"
            type="number"
            min={2}
            max={1000}
            placeholder={t('maxMembersPlaceholder')}
            value={maxMembers}
            onChange={e => setMaxMembers(e.target.value)}
            style={{ maxWidth: 160 }}
          />
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
            {loading ? t('creating') : t('submit')}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
