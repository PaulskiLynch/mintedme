'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface ReportEntry {
  id:            string
  reporterId:    string
  reporterName:  string
  editionId:     string | null
  editionNum:    number | null
  itemName:      string | null
  editionFrozen: boolean
  reason:        string
  description:   string | null
  status:        string
  createdAt:     string
}

const REASON_COLOUR: Record<string, string> = {
  fake:        'var(--red)',
  spam:        '#f59e0b',
  inappropriate: 'var(--red)',
  wrong_info:  '#a78bfa',
  other:       'var(--muted)',
}

export default function AdminReportsClient({ reports }: { reports: ReportEntry[] }) {
  const router = useRouter()
  const [tab, setTab]       = useState<'pending' | 'reviewed' | 'all'>('pending')
  const [busy, setBusy]     = useState<string | null>(null)
  const [error, setError]   = useState('')

  const visible = reports.filter(r =>
    tab === 'all'      ? true :
    tab === 'pending'  ? r.status === 'pending' :
    r.status === 'reviewed'
  )

  const pending  = reports.filter(r => r.status === 'pending').length
  const reviewed = reports.filter(r => r.status === 'reviewed').length

  async function act(id: string, action: 'dismiss' | 'freeze_edition') {
    setBusy(id + action); setError('')
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    router.refresh()
  }

  const tabStyle = (t: typeof tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: 'none', background: tab === t ? 'var(--gold)' : 'var(--bg3)',
    color: tab === t ? '#000' : 'var(--muted)',
  })

  const btn = (colour: string): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4,
    border: 'none', cursor: 'pointer', background: colour, color: '#fff',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle('pending')}  onClick={() => setTab('pending')}>Pending ({pending})</button>
        <button style={tabStyle('reviewed')} onClick={() => setTab('reviewed')}>Reviewed ({reviewed})</button>
        <button style={tabStyle('all')}      onClick={() => setTab('all')}>All ({reports.length})</button>
      </div>

      {error && <div style={{ marginBottom: 16, color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>{error}</div>}

      {visible.length === 0 ? (
        <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center', fontSize: 13 }}>
          {tab === 'pending' ? 'No pending reports.' : 'Nothing here.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(r => (
            <div key={r.id} style={{ background: 'var(--bg2)', border: `1px solid ${r.status === 'pending' ? 'var(--border)' : 'transparent'}`, borderRadius: 8, padding: '16px 20px', opacity: r.status === 'reviewed' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  {/* Item */}
                  {r.itemName ? (
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {r.itemName}
                      {r.editionNum && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>#{r.editionNum}</span>}
                      {r.editionFrozen && <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(239,68,68,0.15)', color: 'var(--red)', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>FROZEN</span>}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>No edition linked</div>
                  )}

                  {/* Reason */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: REASON_COLOUR[r.reason] ?? 'var(--muted)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: 4 }}>
                      {r.reason.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>reported by @{r.reporterName}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* Description */}
                  {r.description && (
                    <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>{r.description}</div>
                  )}
                </div>

                {/* Actions */}
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {r.editionId && !r.editionFrozen && (
                      <button
                        style={btn('var(--red)')}
                        disabled={busy !== null}
                        onClick={() => act(r.id, 'freeze_edition')}
                      >
                        {busy === r.id + 'freeze_edition' ? '…' : 'Freeze Edition'}
                      </button>
                    )}
                    <button
                      style={btn('var(--bg3)')}
                      disabled={busy !== null}
                      onClick={() => act(r.id, 'dismiss')}
                    >
                      {busy === r.id + 'dismiss' ? '…' : 'Dismiss'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
