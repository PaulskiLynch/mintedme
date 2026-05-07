'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const FEATURES = [
  { icon: '◆', label: 'Rare collectibles',  sub: 'Cars, aircraft, property & more' },
  { icon: '↗', label: 'Open market trading', sub: 'Offers, auctions, instant buy'   },
  { icon: '★', label: 'Wealth leaderboard',  sub: 'Compete for the top spot'        },
]

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]         = useState('')
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, inviteCode }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Sign up failed')
      const signInRes = await signIn('credentials', { email, password, redirect: false })
      if (signInRes?.ok) router.push('/onboarding')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      {/* Brand panel */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-0.02em', marginBottom: 10 }}>
            MILLIBUX
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--white)', lineHeight: 1.25, marginBottom: 14 }}>
            The virtual marketplace<br />where collectors compete
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 44 }}>
            Buy, sell, and trade rare digital collectibles.<br />Every move counts.
          </div>

          <div className="auth-brand-features" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map(({ icon, label, sub }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, color: 'var(--gold)',
                }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)' }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-brand-stat" style={{ marginTop: 52, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-0.01em' }}>$1,000,000</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>starting balance, yours on sign-up</div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div style={{ marginBottom: 32 }}>
            <div className="auth-title">Claim your $1,000,000</div>
            <div className="auth-sub">Build your fantasy Mint</div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Invite code</label>
              <input className="form-input" type="text" value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="Enter your invite code" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" type="text" value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname" required minLength={3} maxLength={30} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <button className="btn btn-gold btn-full" type="submit" disabled={loading}
              style={{ marginTop: 8, fontSize: 15, padding: '13px 0' }}>
              {loading ? 'Creating your Mint…' : 'Get $1,000,000 →'}
            </button>
          </form>

          <div className="auth-footer">
            Already have a Mint?{' '}
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
