'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function SignupPage() {
  const router = useRouter()
  const t  = useTranslations('auth')
  const tb = useTranslations('auth.brand')

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

  const FEATURES = [
    { icon: '◆', label: tb('features.collectibles.label'), sub: tb('features.collectibles.sub') },
    { icon: '↗', label: tb('features.trading.label'),      sub: tb('features.trading.sub')      },
    { icon: '★', label: tb('features.leaderboard.label'),  sub: tb('features.leaderboard.sub')  },
  ]

  return (
    <div className="auth-split">
      {/* Brand panel */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-0.02em', marginBottom: 10 }}>
            MILLIBUX
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--white)', lineHeight: 1.25, marginBottom: 14 }}>
            {tb('tagline')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 44 }}>
            {tb('description')}
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
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{tb('startingStat2')}</div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div style={{ marginBottom: 32 }}>
            <div className="auth-title">{t('signup.title')}</div>
            <div className="auth-sub">{t('signup.subtitle')}</div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('signup.inviteCode')}</label>
              <input className="form-input" type="text" value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder={t('signup.inviteCodePlaceholder')} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup.username')}</label>
              <input className="form-input" type="text" value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname" required minLength={3} maxLength={30} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup.email')}</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup.password')}</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <button className="btn btn-gold btn-full" type="submit" disabled={loading}
              style={{ marginTop: 8, fontSize: 15, padding: '13px 0' }}>
              {loading ? t('signup.submitting') : t('signup.submit')}
            </button>
          </form>

          <div className="auth-footer">
            {t('signup.footer')}{' '}
            <Link href="/login">{t('signup.footerLink')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
