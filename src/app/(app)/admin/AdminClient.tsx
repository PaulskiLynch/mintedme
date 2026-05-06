'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminUser {
  id: string; username: string; email: string; balance: string; debtAmount: string
  isAdmin: boolean; isFrozen: boolean; isEstablished: boolean
  createdAt: string; lastSeenAt: string | null
  editionCount: number; bidCount: number
}
interface AdminItem {
  id: string; name: string; category: string; rarityTier: string; benchmarkPrice: string
  isApproved: boolean; isFrozen: boolean; isOfficial: boolean; itemStatus: string
  totalSupply: number; editionCount: number; createdAt: string
}
interface AdminSuggestion {
  id: string; itemName: string; category: string; description: string
  creatorUsername: string; createdAt: string
}
interface AdminReport {
  id: string; reason: string; description: string
  reporterUsername: string; itemName: string | null; editionId: string | null
  createdAt: string
}
interface Stats {
  users: number; items: number; activeAuctions: number
  pendingSuggestions: number; pendingReports: number
  frozenItems: number; frozenUsers: number
}

const RARITY_COLOUR: Record<string, string> = {
  common: '#888', banger: '#e0a030', premium: '#60a0e0',
  rare: '#a060e0', exotic: '#e06030', legendary: '#e0c030', mythic: '#ff44cc',
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmt(n: string | number) {
  const v = Number(n)
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toLocaleString()}`
}

export default function AdminClient({ stats, users, items, suggestions, reports }: {
  stats: Stats
  users: AdminUser[]
  items: AdminItem[]
  suggestions: AdminSuggestion[]
  reports: AdminReport[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'users' | 'items' | 'suggestions' | 'reports'>('overview')
  const [userSearch, setUserSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<{ id: string; username: string } | null>(null)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveForm, setApproveForm] = useState({ benchmarkPrice: '', rarityTier: 'Common', totalSupply: '50', imageUrl: '', description: '' })

  async function userAction(userId: string, action: string) {
    setBusy(userId + action)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setBusy(null)
    router.refresh()
  }

  async function adjustBalance(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustTarget || !adjustDelta) return
    setBusy('adjust')
    await fetch(`/api/admin/users/${adjustTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adjust_balance', delta: Number(adjustDelta) }),
    })
    setBusy(null)
    setAdjustTarget(null)
    setAdjustDelta('')
    router.refresh()
  }

  async function itemAction(itemId: string, action: string) {
    setBusy(itemId + action)
    await fetch(`/api/admin/items/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setBusy(null)
    router.refresh()
  }

  async function approveSuggestion(id: string) {
    setBusy('approve' + id)
    await fetch(`/api/admin/suggestions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        benchmarkPrice: Number(approveForm.benchmarkPrice),
        rarityTier: approveForm.rarityTier,
        totalSupply: Number(approveForm.totalSupply),
        imageUrl: approveForm.imageUrl || null,
        description: approveForm.description || null,
        seedEdition: true,
      }),
    })
    setBusy(null)
    setApprovingId(null)
    router.refresh()
  }

  async function rejectSuggestion(id: string) {
    setBusy('reject' + id)
    await fetch(`/api/admin/suggestions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    setBusy(null)
    router.refresh()
  }

  async function dismissReport(id: string) {
    setBusy('report' + id)
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    })
    setBusy(null)
    router.refresh()
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  )
  const filteredItems = items.filter(i =>
    !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.category.toLowerCase().includes(itemSearch.toLowerCase())
  )

  const TABS = [
    { key: 'overview',    label: 'Overview' },
    { key: 'users',       label: `Users (${stats.users})` },
    { key: 'items',       label: `Items (${stats.items})` },
    { key: 'suggestions', label: `Suggestions${stats.pendingSuggestions > 0 ? ` · ${stats.pendingSuggestions}` : ''}` },
    { key: 'reports',     label: `Reports${stats.pendingReports > 0 ? ` · ${stats.pendingReports}` : ''}` },
  ] as const

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-title">Admin</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: tab === t.key ? 'var(--gold)' : 'var(--bg3)',
              color: tab === t.key ? '#000' : 'var(--muted)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Total Users',        value: stats.users,             colour: 'var(--white)' },
              { label: 'Total Items',        value: stats.items,             colour: 'var(--white)' },
              { label: 'Active Auctions',    value: stats.activeAuctions,    colour: 'var(--gold)' },
              { label: 'Pending Suggestions',value: stats.pendingSuggestions, colour: stats.pendingSuggestions > 0 ? 'var(--gold)' : 'var(--muted)' },
              { label: 'Pending Reports',    value: stats.pendingReports,    colour: stats.pendingReports > 0 ? 'var(--red)' : 'var(--muted)' },
              { label: 'Frozen Items',       value: stats.frozenItems,       colour: stats.frozenItems > 0 ? 'var(--red)' : 'var(--muted)' },
              { label: 'Frozen Users',       value: stats.frozenUsers,       colour: stats.frozenUsers > 0 ? 'var(--red)' : 'var(--muted)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.colour }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>QUICK LINKS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/marketplace" style={{ fontSize: 13, color: 'var(--gold)' }}>Browse Marketplace →</Link>
                <Link href="/auctions" style={{ fontSize: 13, color: 'var(--gold)' }}>View Auctions →</Link>
                <Link href="/leaderboard" style={{ fontSize: 13, color: 'var(--gold)' }}>Leaderboard →</Link>
              </div>
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>RECENT FROZEN</div>
              {users.filter(u => u.isFrozen).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>No frozen users</div>
              ) : users.filter(u => u.isFrozen).slice(0, 5).map(u => (
                <div key={u.id} style={{ fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--red)', fontWeight: 700 }}>@{u.username}</span>
                  <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{fmt(u.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div>
          <input
            className="form-input" type="text" placeholder="Search by username or email…"
            value={userSearch} onChange={e => setUserSearch(e.target.value)}
            style={{ marginBottom: 16, maxWidth: 360 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredUsers.map(u => (
              <div key={u.id} style={{
                background: u.isFrozen ? '#1a0808' : 'var(--bg2)',
                border: `1px solid ${u.isFrozen ? '#4a1010' : 'var(--border)'}`,
                borderRadius: 10, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <Link href={`/mint/${u.username}`} style={{ fontWeight: 900, fontSize: 15, color: 'var(--white)' }}>@{u.username}</Link>
                      {u.isAdmin && <span style={{ fontSize: 10, background: '#2a1a40', color: '#c080ff', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>}
                      {u.isFrozen && <span style={{ fontSize: 10, background: '#3a0808', color: 'var(--red)', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>FROZEN</span>}
                      {u.isEstablished && <span style={{ fontSize: 10, background: '#1e2a15', color: 'var(--green)', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>ESTABLISHED</span>}
                      {Number(u.debtAmount) > 0 && <span style={{ fontSize: 10, background: '#2a1500', color: '#e08030', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>DEBT</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      {u.editionCount} items · {u.bidCount} bids · joined {new Date(u.createdAt).toLocaleDateString()} · seen {timeAgo(u.lastSeenAt)}
                    </div>
                    {Number(u.debtAmount) > 0 && (
                      <div style={{ fontSize: 12, color: '#e08030', marginTop: 2 }}>Debt: {fmt(u.debtAmount)}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>{fmt(u.balance)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" disabled={!!busy}
                    onClick={() => userAction(u.id, u.isFrozen ? 'unfreeze' : 'freeze')}>
                    {u.isFrozen ? 'Unfreeze' : 'Freeze'}
                  </button>
                  {!u.isEstablished && (
                    <button className="btn btn-ghost btn-sm" disabled={!!busy}
                      onClick={() => userAction(u.id, 'mark_established')}>
                      Mark Established
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" disabled={!!busy}
                    onClick={() => userAction(u.id, u.isAdmin ? 'remove_admin' : 'make_admin')}>
                    {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                  <button className="btn btn-gold btn-sm" disabled={!!busy}
                    onClick={() => setAdjustTarget({ id: u.id, username: u.username })}>
                    Adjust Balance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Items ── */}
      {tab === 'items' && (
        <div>
          <input
            className="form-input" type="text" placeholder="Search by name or category…"
            value={itemSearch} onChange={e => setItemSearch(e.target.value)}
            style={{ marginBottom: 16, maxWidth: 360 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredItems.map(i => (
              <div key={i.id} style={{
                background: i.isFrozen ? '#1a0808' : 'var(--bg2)',
                border: `1px solid ${i.isFrozen ? '#4a1010' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: RARITY_COLOUR[i.rarityTier.toLowerCase()] ?? '#888' }}>{i.rarityTier.toUpperCase()}</span>
                    {i.isFrozen && <span style={{ fontSize: 10, background: '#3a0808', color: 'var(--red)', fontWeight: 800, padding: '2px 5px', borderRadius: 4 }}>FROZEN</span>}
                    {!i.isApproved && <span style={{ fontSize: 10, background: '#2a1500', color: '#e08030', fontWeight: 800, padding: '2px 5px', borderRadius: 4 }}>UNAPPROVED</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {i.category} · {fmt(i.benchmarkPrice)} benchmark · {i.editionCount}/{i.totalSupply} editions
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!i.isApproved && (
                    <button className="btn btn-gold btn-sm" disabled={!!busy}
                      onClick={() => itemAction(i.id, 'approve')}>Approve</button>
                  )}
                  <button className="btn btn-ghost btn-sm" disabled={!!busy}
                    onClick={() => itemAction(i.id, i.isFrozen ? 'unfreeze' : 'freeze')}>
                    {i.isFrozen ? 'Unfreeze' : 'Freeze'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Suggestions ── */}
      {tab === 'suggestions' && (
        <div>
          {suggestions.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No pending suggestions.</div>
          ) : suggestions.map(s => (
            <div key={s.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{s.itemName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {s.category} · by @{s.creatorUsername} · {timeAgo(s.createdAt)}
                  </div>
                  {s.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{s.description}</div>}
                </div>
              </div>

              {approvingId === s.id ? (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '14px 16px', marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>APPROVE DETAILS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Benchmark price</label>
                      <input className="form-input" type="number" value={approveForm.benchmarkPrice}
                        onChange={e => setApproveForm(f => ({ ...f, benchmarkPrice: e.target.value }))} placeholder="e.g. 500000" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Rarity tier</label>
                      <select className="form-input" value={approveForm.rarityTier}
                        onChange={e => setApproveForm(f => ({ ...f, rarityTier: e.target.value }))}>
                        {['Banger', 'Common', 'Premium', 'Rare', 'Exotic', 'Legendary', 'Mythic'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Total supply</label>
                      <input className="form-input" type="number" value={approveForm.totalSupply}
                        onChange={e => setApproveForm(f => ({ ...f, totalSupply: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Image URL (optional)</label>
                      <input className="form-input" type="text" value={approveForm.imageUrl}
                        onChange={e => setApproveForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="/items/…" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-gold btn-sm" disabled={busy === 'approve' + s.id || !approveForm.benchmarkPrice}
                      onClick={() => approveSuggestion(s.id)}>
                      {busy === 'approve' + s.id ? 'Approving…' : 'Confirm Approve'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setApprovingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-gold btn-sm" disabled={!!busy}
                    onClick={() => setApprovingId(s.id)}>Approve…</button>
                  <button className="btn btn-danger btn-sm" disabled={!!busy}
                    onClick={() => rejectSuggestion(s.id)}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'reports' && (
        <div>
          {reports.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No pending reports.</div>
          ) : reports.map(r => (
            <div key={r.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                    {r.itemName ?? 'Unknown item'}
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--red)', marginLeft: 8 }}>{r.reason.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>by @{r.reporterUsername} · {timeAgo(r.createdAt)}</div>
                  {r.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{r.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {r.editionId && (
                    <Link href={`/item/${r.editionId}`} className="btn btn-ghost btn-sm">View Item</Link>
                  )}
                  <button className="btn btn-ghost btn-sm" disabled={!!busy}
                    onClick={() => dismissReport(r.id)}>
                    {busy === 'report' + r.id ? '…' : 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Balance adjust modal */}
      {adjustTarget && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setAdjustTarget(null) }}>
          <div className="modal">
            <div className="modal-title">Adjust Balance</div>
            <div className="modal-sub">@{adjustTarget.username}</div>
            <form onSubmit={adjustBalance}>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Amount (negative to deduct)</label>
                <input className="form-input" type="number" value={adjustDelta}
                  onChange={e => setAdjustDelta(e.target.value)}
                  placeholder="e.g. 50000 or -10000" autoFocus required />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-gold" type="submit" disabled={busy === 'adjust' || !adjustDelta}>
                  {busy === 'adjust' ? 'Saving…' : 'Apply'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setAdjustTarget(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
