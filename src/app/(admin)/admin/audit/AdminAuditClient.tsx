'use client'

import { useState } from 'react'

export interface AuditEntry {
  id:             string
  adminUsername:  string
  action:         string
  targetType:     string | null
  targetId:       string | null
  beforeJson:     unknown
  afterJson:      unknown
  reason:         string | null
  createdAt:      string
}

const DESTRUCTIVE = new Set([
  'admin_user_freeze', 'admin_item_freeze', 'admin_auction_cancel',
  'admin_auction_reverse', 'admin_balance_adjust',
])

const ACTION_COLOUR: Record<string, string> = {
  admin_balance_adjust:    '#f59e0b',
  admin_user_freeze:       'var(--red)',
  admin_user_unfreeze:     'var(--green)',
  admin_grant_admin:       '#a78bfa',
  admin_revoke_admin:      'var(--muted)',
  admin_mark_established:  'var(--green)',
  admin_user_edit:         'var(--white)',
  admin_item_create:       'var(--green)',
  admin_item_edit:         'var(--white)',
  admin_item_approve:      'var(--green)',
  admin_item_reject:       'var(--red)',
  admin_item_freeze:       'var(--red)',
  admin_item_unfreeze:     'var(--green)',
  admin_auction_activate:  'var(--green)',
  admin_auction_edit:      'var(--white)',
  admin_auction_cancel:    'var(--red)',
  admin_auction_reverse:   '#f59e0b',
  admin_cron_run:          '#60a5fa',
  suggestion_approve:      'var(--green)',
  suggestion_reject:       'var(--red)',
}

const ALL_ACTIONS = Object.keys(ACTION_COLOUR)
const TARGET_TYPES = ['user', 'item', 'auction', 'cron', 'suggestion']

function JsonCell({ val }: { val: unknown }) {
  const [open, setOpen] = useState(false)
  if (!val) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>
  const preview = JSON.stringify(val).slice(0, 40)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
        {open ? '▾' : '▸'} {preview}{preview.length >= 40 ? '…' : ''}
      </button>
      {open && (
        <pre style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg3)', padding: '6px 8px', borderRadius: 4, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: 260 }}>
          {JSON.stringify(val, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function AdminAuditClient({ entries }: { entries: AuditEntry[] }) {
  const [actionFilter, setActionFilter]     = useState('')
  const [targetFilter, setTargetFilter]     = useState('')
  const [adminFilter, setAdminFilter]       = useState('')
  const [destructiveOnly, setDestructiveOnly] = useState(false)
  const [search, setSearch]                 = useState('')

  const sel: React.CSSProperties = {
    padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--white)', fontSize: 12,
  }

  const visible = entries.filter(e => {
    if (actionFilter     && e.action         !== actionFilter)  return false
    if (targetFilter     && e.targetType     !== targetFilter)  return false
    if (adminFilter      && e.adminUsername  !== adminFilter)   return false
    if (destructiveOnly  && !DESTRUCTIVE.has(e.action))        return false
    if (search) {
      const q = search.toLowerCase()
      if (!e.adminUsername.toLowerCase().includes(q) &&
          !e.action.toLowerCase().includes(q) &&
          !(e.targetId ?? '').toLowerCase().includes(q) &&
          !(e.reason   ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const admins = [...new Set(entries.map(e => e.adminUsername))]

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          style={{ ...sel, flex: 1, minWidth: 160 }} />

        <select style={sel} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All actions</option>
          {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select style={sel} value={targetFilter} onChange={e => setTargetFilter(e.target.value)}>
          <option value="">All targets</option>
          {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select style={sel} value={adminFilter} onChange={e => setAdminFilter(e.target.value)}>
          <option value="">All admins</option>
          {admins.map(a => <option key={a} value={a}>@{a}</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={destructiveOnly} onChange={e => setDestructiveOnly(e.target.checked)} />
          Destructive only
        </label>

        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{visible.length} entries</span>
      </div>

      {visible.length === 0 ? (
        <div style={{ color: 'var(--muted)', padding: 32, textAlign: 'center', fontSize: 13 }}>No entries match your filters.</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['When', 'Admin', 'Action', 'Target', 'Before', 'After', 'Reason'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', background: DESTRUCTIVE.has(e.action) ? 'rgba(239,68,68,0.04)' : undefined }}>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(e.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>@{e.adminUsername}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ACTION_COLOUR[e.action] ?? 'var(--muted)' }}>
                      {e.action}
                    </span>
                    {DESTRUCTIVE.has(e.action) && (
                      <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(239,68,68,0.15)', color: 'var(--red)', padding: '1px 5px', borderRadius: 3 }}>!</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 11 }}>
                    {e.targetType && <span style={{ fontWeight: 700 }}>{e.targetType}</span>}
                    {e.targetId && <div style={{ fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{e.targetId.slice(0, 8)}…</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}><JsonCell val={e.beforeJson} /></td>
                  <td style={{ padding: '10px 14px' }}><JsonCell val={e.afterJson} /></td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 11, maxWidth: 200 }}>
                    {e.reason ?? <span style={{ color: 'var(--bg3)' }}>—</span>}
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
