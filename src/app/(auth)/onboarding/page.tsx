'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TAGS = ['Collector', 'Hustler', 'Yacht degenerate', 'Art snob', 'Car obsessed', 'Fashion first', 'Real estate mogul', 'Watch nerd']

export default function OnboardingPage() {
  const router = useRouter()
  const [tagline, setTagline] = useState('')
  const [saving, setSaving]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/me/tagline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagline }),
    })
    router.push('/marketplace')
  }

  return (
    <div className="onboard-wrap">
      <div className="onboard-box">
        <div className="onboard-million">$1,000,000</div>
        <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700, marginBottom: 24 }}>
          Added to your Mint
        </div>
        <h2 className="onboard-h2">What will a million make you?</h2>
        <p className="onboard-sub">This becomes your Mint tagline. Tell the world.</p>

        <form onSubmit={handleSubmit}>
          <input
            className="form-input"
            style={{ textAlign: 'center', fontSize: 17, padding: '14px 16px' }}
            placeholder="e.g. I only collect black cars."
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            maxLength={140}
            autoFocus
          />

          <div className="onboard-tags">
            {TAGS.map(t => (
              <button
                key={t}
                type="button"
                className={`onboard-tag${tagline === t ? ' selected' : ''}`}
                onClick={() => setTagline(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            className="btn btn-gold btn-full"
            type="submit"
            disabled={saving}
            style={{ marginTop: 32, padding: '14px 0', fontSize: 16 }}
          >
            {saving ? 'Setting up your Mint...' : 'Take me to the Marketplace →'}
          </button>
        </form>
      </div>
    </div>
  )
}
