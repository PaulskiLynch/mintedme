'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
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
      setError('Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)', marginBottom: 24 }}>MINTED</div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Sign in to your Mint</div>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-gold btn-full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="auth-footer">
          No account? <Link href="/signup">Claim your $1M →</Link>
        </div>
      </div>
    </div>
  )
}
