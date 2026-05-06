'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface AdminAuction {
  id:                    string
  status:                string
  itemName:              string
  itemImageUrl:          string | null
  editionNumber:         number
  editionId:             string
  sellerUsername:        string | null
  currentWinnerUsername: string | null
  currentBid:            string | null
  winningBid:            string | null
  minimumBid:            string
  benchmarkPrice:        string
  bidCount:              number
  startsAt:              string | null
  endsAt:                string
  isSystemAuction:       boolean
  createdAt:             string
}

const STATUS_TABS = ['all', 'scheduled', 'active', 'settling', 'settled', 'ended_no_sale', 'cancelled', 'failed', 'reversed', 'ended'] as const

const STATUS_COLOUR: Record<string, string> = {
  scheduled:    'var(--muted)',
  active:       'var(--green)',
  settling:     '#60a5fa',   // blue — in progress
  settled:      'var(--gold)',
  ended_no_sale:'#94a3b8',   // grey — no sale
  cancelled:    'var(--red)',
  failed:       '#ef4444',   // red
  reversed:     '#f59e0b',   // amber
  ended:        '#94a3b8',   // legacy — treat as ended_no_sale
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--bg3)',
  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontSize: 13,
  boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em',
  marginBottom: 4, display: 'block',
}
const grp: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }

// Convert UTC ISO to datetime-local string for <input type="datetime-local">
function toLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function toISO(local: string) {
  if (!local) return ''
  return new Date(local).toISOString()
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function money(s: string | null) {
  if (!s) return '—'
  return '$' + Number(s).toLocaleString()
}

export default function AdminAuctionsClient({ auctions }: { auctions: AdminAuction[] }) {
  const router   = useRouter()
  const [tab, setTab]       = useState<string>('all')
  const [busy, setBusy]     = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ minimumBid: '', startsAt: '', endsAt: '' })
  const [error, setError]   = useState('')

  const visible = tab === 'all' ? auctions : auctions.filter(a => a.status === tab)
  const editing = auctions.find(a => a.id === editId)

  function openEdit(a: AdminAuction) {
    setEditId(a.id)
    setEditForm({
      minimumBid: a.minimumBid,
      startsAt:   toLocal(a.startsAt),
      endsAt:     toLocal(a.endsAt),
    })
    setError('')
  }

  async function saveEdit() {
    if (!editId) return
    setBusy('edit')
    const res = await fetch(`/api/admin/auctions/${editId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        minimumBid: Number(editForm.minimumBid),
        startsAt:   toISO(editForm.startsAt) || undefined,
        endsAt:     toISO(editForm.endsAt)   || undefined,
      }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    setEditId(null)
    router.refresh()
  }

  async function doAction(id: string, action: string) {
    setBusy(id + action)
    setError('')
    const res = await fetch(`/api/admin/auctions/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    router.refresh()
  }

  return (
    <div>
      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STATUS_TABS.map(t => {
          const count = t === 'all' ? auctions.length : auctions.filter(a => a.status === t).length
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: tab === t ? 'var(--gold)' : 'var(--bg3)',
                color:      tab === t ? '#000'        : 'var(--muted)',
                border:     '1px solid var(--border)', cursor: 'pointer' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16,
          background: 'var(--bg2)', border: '1px solid var(--red)', borderRadius: 6, padding: '8px 14px' }}>
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: 24 }}>No auctions in this view.</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Item / Edition', 'Seller', 'Status', 'Bids', 'Top Bid', 'Min Bid', 'Ends', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>

                  {/* Item */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {a.itemImageUrl && (
                        <img src={a.itemImageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{a.itemName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          #{a.editionNumber} {a.isSystemAuction && '· System'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Seller */}
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                    {a.sellerUsername ? `@${a.sellerUsername}` : 'System'}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOUR[a.status] ?? 'var(--muted)',
                      background: 'var(--bg3)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {a.status}
                    </span>
                  </td>

                  {/* Bids */}
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{a.bidCount}</td>

                  {/* Top bid */}
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--gold)' }}>
                    {a.winningBid ? money(a.winningBid) : money(a.currentBid)}
                    {a.currentWinnerUsername && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
                        @{a.currentWinnerUsername}
                      </div>
                    )}
                  </td>

                  {/* Min bid */}
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{money(a.minimumBid)}</td>

                  {/* Ends */}
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {fmt(a.endsAt)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/* Edit — always available */}
                      <button onClick={() => openEdit(a)}
                        style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4,
                          background: 'var(--bg3)', color: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                        Edit
                      </button>

                      {/* Activate — only for scheduled */}
                      {a.status === 'scheduled' && (
                        <button onClick={() => doAction(a.id, 'activate')} disabled={busy === a.id + 'activate'}
                          style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4,
                            background: 'var(--bg3)', color: 'var(--green)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                          Activate
                        </button>
                      )}

                      {/* Cancel — scheduled, active, or settling */}
                      {(a.status === 'scheduled' || a.status === 'active' || a.status === 'settling') && (
                        <button onClick={() => { if (confirm(`Cancel auction for "${a.itemName} #${a.editionNumber}"? All ${a.bidCount} bids will be refunded.`)) doAction(a.id, 'cancel') }}
                          disabled={busy === a.id + 'cancel'}
                          style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4,
                            background: 'var(--bg3)', color: 'var(--red)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      )}

                      {/* Reverse — only for settled */}
                      {a.status === 'settled' && (
                        <button onClick={() => { if (confirm(`Reverse settled auction for "${a.itemName} #${a.editionNumber}"?\n\nThis will:\n• Refund ${money(a.winningBid)} to the winner\n• Claw back proceeds from the seller\n• Return the edition to the seller\n\nThis cannot be undone.`)) doAction(a.id, 'reverse') }}
                          disabled={busy === a.id + 'reverse'}
                          style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4,
                            background: 'var(--bg3)', color: '#f59e0b', border: '1px solid var(--border)', cursor: 'pointer' }}>
                          Reverse
                        </button>
                      )}

                      {/* Link to edition */}
                      <Link href={`/item/${a.editionId}`} target="_blank"
                        style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4,
                          background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)',
                          textDecoration: 'none', display: 'inline-block' }}>
                        ↗
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editId && editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setEditId(null) }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 28, width: 420, maxWidth: '95vw' }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Edit Auction</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
              {editing.itemName} #{editing.editionNumber} · <span style={{ color: STATUS_COLOUR[editing.status] }}>{editing.status}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={grp}>
                <label style={lbl}>MINIMUM BID ($)</label>
                <input style={inp} type="number" min={1} value={editForm.minimumBid}
                  onChange={e => setEditForm(f => ({ ...f, minimumBid: e.target.value }))} />
              </div>
              <div style={grp}>
                <label style={lbl}>STARTS AT</label>
                <input style={inp} type="datetime-local" value={editForm.startsAt}
                  onChange={e => setEditForm(f => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div style={grp}>
                <label style={lbl}>ENDS AT</label>
                <input style={inp} type="datetime-local" value={editForm.endsAt}
                  onChange={e => setEditForm(f => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={saveEdit} disabled={busy === 'edit'}
                style={{ padding: '9px 24px', background: 'var(--gold)', color: '#000', fontWeight: 900, fontSize: 13, borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                {busy === 'edit' ? '...' : 'Save'}
              </button>
              <button onClick={() => setEditId(null)}
                style={{ padding: '9px 18px', background: 'var(--bg3)', color: 'var(--muted)', fontWeight: 700, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
