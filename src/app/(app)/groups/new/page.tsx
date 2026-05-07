'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function NewGroupPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [joinType, setJoinType] = useState<'open' | 'invite_only'>('open')
  const [maxMembers, setMaxMembers] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      <div className="page-title">Create Group</div>
      <div className="page-sub" style={{ marginBottom: 32 }}>Start a crew, run a leaderboard.</div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
            GROUP NAME *
          </label>
          <input
            className="form-input"
            placeholder="e.g. Car Collectors Club"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={60}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
            DESCRIPTION
          </label>
          <textarea
            className="form-input"
            placeholder="What's this group about?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={280}
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 10 }}>
            MEMBERSHIP
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['open', 'invite_only'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setJoinType(t)}
                style={{
                  flex: 1, padding: '10px 0', border: `1px solid ${joinType === t ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius: 8, background: joinType === t ? 'rgba(200,169,110,0.1)' : 'var(--bg2)',
                  color: joinType === t ? 'var(--gold)' : 'var(--muted)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                {t === 'open' ? '🌐 Open' : '🔒 Invite Only'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {joinType === 'open' ? 'Anyone can join.' : 'Members join via invite code (shown after creation).'}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
            MAX MEMBERS <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <input
            className="form-input"
            type="number"
            min={2}
            max={1000}
            placeholder="No limit"
            value={maxMembers}
            onChange={e => setMaxMembers(e.target.value)}
            style={{ maxWidth: 160 }}
          />
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
