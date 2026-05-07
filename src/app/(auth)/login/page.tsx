'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const router = useRouter()
  const t  = useTranslations('auth')
  const tb = useTranslations('auth.brand')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.ok) {
      router.push('/feed')
    } else {
      setError(t('login.error'))
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
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{tb('startingStat')}</div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div style={{ marginBottom: 32 }}>
            <div className="auth-title">{t('login.title')}</div>
            <div className="auth-sub">{t('login.subtitle')}</div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('login.email')}</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{t('login.password')}</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-gold btn-full" type="submit" disabled={loading}
              style={{ marginTop: 8, fontSize: 15, padding: '13px 0' }}>
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="auth-footer">
            {t('login.footer')}{' '}
            <Link href="/signup">{t('login.footerLink')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
