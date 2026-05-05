'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Sign up failed')
      const signInRes = await signIn('credentials', { email, password, redirect: false })
      if (signInRes?.ok) {
        router.push('/onboarding')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)', marginBottom: 24 }}>MILLIBUX</div>
        <div className="auth-title">Claim your $1,000,000</div>
        <div className="auth-sub">Build your fantasy Mint</div>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="yourname" required minLength={3} maxLength={30} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button className="btn btn-gold btn-full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Creating your Mint...' : 'Get $1,000,000 →'}
          </button>
        </form>
        <div className="auth-footer">
          Already have a Mint? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
