'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Entry {
  id:        string
  value:     string
  reason:    string | null
  createdAt: string
}

const inp: React.CSSProperties = {
  flex: 1, padding: '8px 12px', background: 'var(--bg3)',
  border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--white)', fontSize: 13,
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [value, setValue]     = useState('')
  const [reason, setReason]   = useState('')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)

  useEffect(() => {
    fetch('/api/admin/blacklist')
      .then(r => r.json())
      .then(setEntries)
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await fetch('/api/admin/blacklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, reason }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setBusy(false); return }
    setEntries(prev => [data, ...prev])
    setValue(''); setReason(''); setBusy(false)
  }

  async function remove(id: string) {
    if (!confirm('Remove from blacklist?')) return
    const res = await fetch(`/api/admin/blacklist/${id}`, { method: 'DELETE' })
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-title">Email Blacklist</div>
      <div className="page-sub" style={{ marginBottom: 28 }}>
        Block specific emails or entire domains from signing up. Use <code style={{ color: 'var(--gold)' }}>@domain.com</code> to block a whole domain.
      </div>

      <form onSubmit={add} style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <input style={inp} type="text" value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="e.g. spammer@fake.com or @guerrillamail.com"
          required autoFocus />
        <input style={{ ...inp, flex: '0 0 200px' }} type="text" value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (optional)" />
        <button type="submit" disabled={busy}
          style={{ padding: '8px 18px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {busy ? '…' : 'Block'}
        </button>
      </form>
      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {entries.length === 0 ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center', fontWeight: 700 }}>No blocked emails yet.</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Value', 'Reason', 'Added', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--red)', fontFamily: 'monospace' }}>{e.value}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12 }}>{e.reason ?? '—'}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12 }}>
                    {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <button onClick={() => remove(e.id)}
                      style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
