'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  username:  string
  tagline:   string | null
  avatarUrl: string | null
}

export default function SettingsClient({ username, tagline, avatarUrl }: Props) {
  const router = useRouter()

  // Profile state
  const [uname,  setUname]  = useState(username)
  const [tag,    setTag]    = useState(tagline ?? '')
  const [avatar, setAvatar] = useState(avatarUrl ?? '')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')
  const [saved,  setSaved]  = useState(false)

  // Password state
  const [curPw,    setCurPw]    = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confirmPw,setConfirmPw]= useState('')
  const [pwBusy,   setPwBusy]   = useState(false)
  const [pwError,  setPwError]  = useState('')
  const [pwSaved,  setPwSaved]  = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setSaved(false)
    const res = await fetch('/api/me', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: uname, tagline: tag, avatarUrl: avatar }),
    })
    const json = await res.json()
    if (res.ok) { setSaved(true); router.refresh() }
    else        { setError(json.error || 'Save failed') }
    setBusy(false)
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(''); setPwSaved(false)
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return }
    setPwBusy(true)
    const res = await fetch('/api/me/password', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    })
    const json = await res.json()
    if (res.ok) { setPwSaved(true); setCurPw(''); setNewPw(''); setConfirmPw('') }
    else        { setPwError(json.error || 'Failed') }
    setPwBusy(false)
  }

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 40 }}>

      {/* Profile */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.05em' }}>PROFILE</div>

        {saved && (
          <div style={{ background: '#1e2a15', border: '1px solid var(--green)', borderRadius: 8, padding: '10px 14px', color: 'var(--green)', fontSize: 13 }}>
            Profile saved.
          </div>
        )}

        {/* Avatar preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: 'var(--gold)', flexShrink: 0 }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : uname[0]?.toUpperCase()
            }
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Avatar URL</label>
            <input className="form-input" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className="form-input"
            value={uname}
            onChange={e => setUname(e.target.value)}
            placeholder="yourname"
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            required
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Letters, numbers and underscores only</div>
        </div>

        <div className="form-group">
          <label className="form-label">Tagline</label>
          <input
            className="form-input"
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="e.g. Connoisseur of rare things"
            maxLength={120}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="btn btn-gold" type="submit" disabled={busy || !uname}>
          {busy ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Change password */}
      <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.05em' }}>CHANGE PASSWORD</div>

        {pwSaved && (
          <div style={{ background: '#1e2a15', border: '1px solid var(--green)', borderRadius: 8, padding: '10px 14px', color: 'var(--green)', fontSize: 13 }}>
            Password updated.
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Current password</label>
          <input className="form-input" type="password" value={curPw} onChange={e => setCurPw(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">New password</label>
          <input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm new password</label>
          <input className="form-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required minLength={8} />
        </div>

        {pwError && <div className="form-error">{pwError}</div>}

        <button className="btn btn-outline" type="submit" disabled={pwBusy || !curPw || !newPw || !confirmPw}>
          {pwBusy ? 'Updating...' : 'Update password'}
        </button>
      </form>

    </div>
  )
}
