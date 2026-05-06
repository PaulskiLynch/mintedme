'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id:            string
  username:      string
  email:         string
  isAdmin:       boolean
  isFrozen:      boolean
  isEstablished: boolean
  balance:       string
  editionCount:  number
  txnCount:      number
  createdAt:     string
}

const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontSize: 13, boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }
const grp: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }

export default function AdminUsersClient({ users: initial }: { users: User[] }) {
  const router = useRouter()
  const [users, setUsers]       = useState(initial)
  const [filter, setFilter]     = useState<'all' | 'frozen' | 'admin'>('all')
  const [search, setSearch]     = useState('')
  const [busy, setBusy]         = useState<string | null>(null)

  // Balance modal
  const [balModal, setBalModal]   = useState<User | null>(null)
  const [balAmount, setBalAmount] = useState('')
  const [balError, setBalError]   = useState('')

  // Edit modal
  const [editModal, setEditModal] = useState<User | null>(null)
  const [editForm, setEditForm]   = useState({ username: '', email: '', tagline: '', avatarUrl: '', password: '', isAdmin: false, isFrozen: false, isEstablished: false })
  const [editError, setEditError] = useState('')

  // Add user modal
  const [addOpen, setAddOpen]   = useState(false)
  const [addForm, setAddForm]   = useState({ username: '', email: '', password: '', tagline: '', balance: '1000000' })
  const [addError, setAddError] = useState('')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !search || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || (filter === 'frozen' && u.isFrozen) || (filter === 'admin' && u.isAdmin)
    return matchSearch && matchFilter
  })

  async function action(userId: string, act: string) {
    setBusy(userId + act)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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

  // ── Adjust balance ────────────────────────────────────────────────────────────
  async function adjustBalance(e: React.FormEvent) {
    e.preventDefault()
    if (!balModal) return
    const delta = Number(balAmount)
    if (isNaN(delta) || delta === 0) { setBalError('Enter a non-zero amount'); return }
    setBusy('bal')
    const res = await fetch(`/api/admin/users/${balModal.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adjust_balance', delta }),
    })
    const data = await res.json()
    if (!res.ok) { setBalError(data.error ?? 'Failed'); setBusy(null); return }
    setUsers(prev => prev.map(u => u.id === balModal.id ? { ...u, balance: data.balance } : u))
    setBalModal(null); setBalAmount(''); setBusy(null)
    router.refresh()
  }

  // ── Edit user ─────────────────────────────────────────────────────────────────
  function openEdit(u: User) {
    setEditModal(u)
    setEditForm({ username: u.username, email: u.email, tagline: '', avatarUrl: '', password: '', isAdmin: u.isAdmin, isFrozen: u.isFrozen, isEstablished: u.isEstablished })
    setEditError('')
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal) return
    setBusy('edit')
    const body: Record<string, unknown> = { ...editForm }
    if (!editForm.password) delete body.password
    const res = await fetch(`/api/admin/users/${editModal.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setEditError(data.error ?? 'Failed'); setBusy(null); return }
    setUsers(prev => prev.map(u => u.id === editModal.id ? {
      ...u,
      username:      editForm.username      || u.username,
      email:         editForm.email         || u.email,
      isAdmin:       editForm.isAdmin,
      isFrozen:      editForm.isFrozen,
      isEstablished: editForm.isEstablished,
    } : u))
    setEditModal(null); setBusy(null)
    router.refresh()
  }

  // ── Add user ──────────────────────────────────────────────────────────────────
  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setBusy('add')
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    if (!res.ok) { setAddError(data.error ?? 'Failed'); setBusy(null); return }
    setAddOpen(false)
    setAddForm({ username: '', email: '', password: '', tagline: '', balance: '1000000' })
    setBusy(null)
    router.refresh()
  }

  const btn = (label: string, onClick: () => void, colour = 'var(--muted)', disabled = false) => (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: colour, border: '1px solid var(--border)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {label}
    </button>
  )

  return (
    <div>
      {/* ── Balance modal ── */}
      {balModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setBalModal(null) }}>
          <div className="modal">
            <div className="modal-title">Adjust Balance</div>
            <div className="modal-sub">@{balModal.username} · current: ${Number(balModal.balance).toLocaleString()}</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
              Adds or subtracts cash from this user's balance and records an <em>admin_adjustment</em> transaction so it shows in their wallet history. Use positive numbers to give money, negative to take it.
            </p>
            <form onSubmit={adjustBalance} style={{ marginTop: 16 }}>
              <input className="form-input" type="number" placeholder="e.g. 50000 or -10000"
                value={balAmount} onChange={e => setBalAmount(e.target.value)} autoFocus required />
              {balError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{balError}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="submit" disabled={busy === 'bal'} className="btn btn-gold">{busy === 'bal' ? '…' : 'Apply'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setBalModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit user modal ── */}
      {editModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-title">Edit User</div>
            <div className="modal-sub">@{editModal.username}</div>
            <form onSubmit={saveEdit} style={{ marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={grp}>
                  <label style={lbl}>USERNAME</label>
                  <input style={inp} value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} required />
                </div>
                <div style={grp}>
                  <label style={lbl}>EMAIL</label>
                  <input style={inp} type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div style={grp}>
                  <label style={lbl}>TAGLINE</label>
                  <input style={inp} value={editForm.tagline} onChange={e => setEditForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Leave blank to keep existing" />
                </div>
                <div style={grp}>
                  <label style={lbl}>AVATAR URL</label>
                  <input style={inp} value={editForm.avatarUrl} onChange={e => setEditForm(f => ({ ...f, avatarUrl: e.target.value }))} placeholder="Leave blank to keep existing" />
                </div>
                <div style={{ ...grp, gridColumn: '1 / -1' }}>
                  <label style={lbl}>NEW PASSWORD <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                  <input style={inp} type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="•••••••" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 4, marginBottom: 16 }}>
                {([['isAdmin', 'Admin'], ['isFrozen', 'Frozen'], ['isEstablished', 'Established']] as const).map(([field, label]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
              {editError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{editError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={busy === 'edit'} className="btn btn-gold">{busy === 'edit' ? '…' : 'Save changes'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
                <Link href={`/mint/${editModal.username}`} target="_blank" className="btn btn-ghost" style={{ marginLeft: 'auto' }}>View Profile ↗</Link>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add user modal ── */}
      {addOpen && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setAddOpen(false) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-title">Add New User</div>
            <form onSubmit={createUser} style={{ marginTop: 20 }}>
              <div style={grp}>
                <label style={lbl}>USERNAME *</label>
                <input style={inp} value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))} required autoFocus />
              </div>
              <div style={grp}>
                <label style={lbl}>EMAIL *</label>
                <input style={inp} type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div style={grp}>
                <label style={lbl}>PASSWORD *</label>
                <input style={inp} type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div style={grp}>
                <label style={lbl}>TAGLINE</label>
                <input style={inp} value={addForm.tagline} onChange={e => setAddForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Optional" />
              </div>
              <div style={grp}>
                <label style={lbl}>STARTING BALANCE</label>
                <input style={inp} type="number" value={addForm.balance} onChange={e => setAddForm(f => ({ ...f, balance: e.target.value }))} />
              </div>
              {addError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{addError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={busy === 'add'} className="btn btn-gold">{busy === 'add' ? '…' : 'Create user'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or email…"
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontSize: 13 }} />
        {(['all', 'frozen', 'admin'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: filter === f ? 'var(--gold)' : 'transparent', color: filter === f ? '#000' : 'var(--muted)', cursor: 'pointer' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button onClick={() => { setAddOpen(true); setAddError('') }}
          style={{ padding: '6px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', background: 'var(--gold)', color: '#000', cursor: 'pointer' }}>
          + Add User
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Email', 'Balance', 'Items', 'Status', 'Actions'].map(h => (
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
                <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ color: 'var(--gold)', fontWeight: 700 }}>${Number(u.balance).toLocaleString()}</div>
                  <button onClick={() => { setBalModal(u); setBalAmount(''); setBalError('') }}
                    style={{ marginTop: 3, padding: '2px 8px', fontSize: 10, fontWeight: 700, background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
                    Adjust ±
                  </button>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{u.editionCount}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.isAdmin        && <span style={{ fontSize: 10, background: '#1a1a2e', color: '#6c8ebf', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>}
                    {u.isFrozen       && <span style={{ fontSize: 10, background: 'var(--bg3)', color: 'var(--red)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>FROZEN</span>}
                    {u.isEstablished  && <span style={{ fontSize: 10, background: '#1e2a15', color: 'var(--green)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>EST.</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {btn('Edit', () => openEdit(u), 'var(--white)')}
                    <Link href={`/mint/${u.username}`} target="_blank"
                      style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                      Profile ↗
                    </Link>
                    {u.isFrozen
                      ? btn('Unfreeze', () => action(u.id, 'unfreeze'), 'var(--white)', !!busy)
                      : btn('Freeze',   () => action(u.id, 'freeze'),   'var(--red)',   !!busy)
                    }
                    {!u.isEstablished && btn('+ Est.', () => action(u.id, 'mark_established'), 'var(--green)', !!busy)}
                    {!u.isAdmin && btn('+ Admin', () => action(u.id, 'make_admin'), 'var(--muted)', !!busy)}
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
