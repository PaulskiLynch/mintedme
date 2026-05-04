'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id:           string
  username:     string
  email:        string
  isAdmin:      boolean
  isFrozen:     boolean
  isEstablished: boolean
  balance:      string
  editionCount: number
  txnCount:     number
  createdAt:    string
}

export default function AdminUsersClient({ users: initial }: { users: User[] }) {
  const router = useRouter()
  const [users, setUsers] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'frozen' | 'admin'>('all')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const filtered = users.filter(u => {
    const matchesSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'frozen' && u.isFrozen) || (filter === 'admin' && u.isAdmin)
    return matchesSearch && matchesFilter
  })

  async function action(userId: string, act: string) {
    setBusy(userId + act)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        if (act === 'freeze')           return { ...u, isFrozen: true }
        if (act === 'unfreeze')         return { ...u, isFrozen: false }
        if (act === 'make_admin')       return { ...u, isAdmin: true }
        if (act === 'remove_admin')     return { ...u, isAdmin: false }
        if (act === 'mark_established') return { ...u, isEstablished: true }
        return u
      }))
      router.refresh()
    }
    setBusy(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search username or email..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontSize: 13 }}
        />
        {(['all', 'frozen', 'admin'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: filter === f ? 'var(--gold)' : 'transparent', color: filter === f ? '#000' : 'var(--muted)', cursor: 'pointer' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Email', 'Balance', 'Items', 'Txns', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', opacity: u.isFrozen ? 0.6 : 1 }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 700 }}>@{u.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px', color: 'var(--gold)', fontWeight: 700 }}>${Number(u.balance).toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{u.editionCount}</td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{u.txnCount}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.isAdmin        && <span style={{ fontSize: 10, background: '#1a1a2e', color: '#6c8ebf', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>}
                    {u.isFrozen       && <span style={{ fontSize: 10, background: 'var(--bg3)', color: 'var(--red)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>FROZEN</span>}
                    {u.isEstablished  && <span style={{ fontSize: 10, background: '#1e2a15', color: 'var(--green)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>EST.</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {u.isFrozen ? (
                      <button onClick={() => action(u.id, 'unfreeze')} disabled={!!busy}
                        style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                        {busy === u.id + 'unfreeze' ? '...' : 'Unfreeze'}
                      </button>
                    ) : (
                      <button onClick={() => action(u.id, 'freeze')} disabled={!!busy}
                        style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: 'var(--red)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                        {busy === u.id + 'freeze' ? '...' : 'Freeze'}
                      </button>
                    )}
                    {!u.isEstablished && (
                      <button onClick={() => action(u.id, 'mark_established')} disabled={!!busy}
                        style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: 'var(--green)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                        {busy === u.id + 'mark_established' ? '...' : '+ Est.'}
                      </button>
                    )}
                    {!u.isAdmin && (
                      <button onClick={() => action(u.id, 'make_admin')} disabled={!!busy}
                        style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                        {busy === u.id + 'make_admin' ? '...' : '+ Admin'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No users found.</div>
        )}
      </div>
    </div>
  )
}
