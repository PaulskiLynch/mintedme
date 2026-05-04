'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface OfferEdition {
  id: string
  lastSalePrice: string | null
  listedPrice: string | null
  highestOffer: string | null
  item: { name: string; imageUrl: string | null }
}

interface IncomingOffer {
  id: string
  amount: string
  status: string
  expiresAt: string
  message: string | null
  buyer: { username: string }
  edition: OfferEdition
}

interface OutgoingOffer {
  id: string
  amount: string
  status: string
  expiresAt: string
  edition: OfferEdition
}

interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  actionUrl: string | null
  createdAt: string
}

interface Props {
  incoming:      IncomingOffer[]
  outgoing:      OutgoingOffer[]
  notifications: Notification[]
}

const STATUS_COLOUR: Record<string, string> = {
  pending:  'var(--gold)',
  accepted: 'var(--green)',
  declined: 'var(--red)',
  expired:  'var(--muted)',
  countered:'#7bb',
}

export default function InboxClient({ incoming, outgoing, notifications }: Props) {
  const router = useRouter()
  const [tab, setTab]             = useState<'offers' | 'notifs'>('offers')
  const [offerTab, setOfferTab]   = useState<'in' | 'out'>('in')
  const [busy, setBusy]           = useState('')
  const [counter, setCounter]     = useState<{ id: string; amt: string } | null>(null)

  async function act(offerId: string, action: string, counterAmount?: number) {
    setBusy(offerId)
    await fetch(`/api/offers/${offerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, counterAmount }),
    })
    setBusy('')
    setCounter(null)
    router.refresh()
  }

  return (
    <div>
      <div className="page-title">Inbox</div>

      <div className="tabs">
        <div className={`tab${tab === 'offers' ? ' active' : ''}`} onClick={() => setTab('offers')}>
          Offers {incoming.filter(o => o.status === 'pending').length > 0 && `(${incoming.filter(o => o.status === 'pending').length})`}
        </div>
        <div className={`tab${tab === 'notifs' ? ' active' : ''}`} onClick={() => setTab('notifs')}>
          Notifications
        </div>
      </div>

      {tab === 'offers' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button className={`pill${offerTab === 'in' ? ' active' : ''}`} onClick={() => setOfferTab('in')}>Received</button>
            <button className={`pill${offerTab === 'out' ? ' active' : ''}`} onClick={() => setOfferTab('out')}>Sent</button>
          </div>

          {offerTab === 'in' && (
            incoming.length === 0
              ? <div style={{ color: 'var(--muted)' }}>No offers received.</div>
              : incoming.map(o => (
                <div key={o.id} className="card" style={{ marginBottom: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {o.edition.item.imageUrl && <img src={o.edition.item.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      <span style={{ color: 'var(--gold)' }}>${Number(o.amount).toLocaleString()}</span>
                      {' '}from <Link href={`/mint/${o.buyer.username}`} style={{ fontWeight: 700 }}>@{o.buyer.username}</Link>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                      for {o.edition.item.name} &middot; expires {formatDistanceToNow(new Date(o.expiresAt), { addSuffix: true })}
                    </div>
                    {o.message && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', marginBottom: 8 }}>&quot;{o.message}&quot;</div>}
                    {o.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-gold btn-sm" onClick={() => act(o.id, 'accept')} disabled={busy === o.id}>Accept</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setCounter({ id: o.id, amt: o.amount })} disabled={busy === o.id}>Counter</button>
                        <button className="btn btn-danger btn-sm" onClick={() => act(o.id, 'decline')} disabled={busy === o.id}>Decline</button>
                      </div>
                    )}
                    {o.status !== 'pending' && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOUR[o.status] ?? 'var(--muted)' }}>
                        {o.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))
          )}

          {offerTab === 'out' && (
            outgoing.length === 0
              ? <div style={{ color: 'var(--muted)' }}>No offers sent.</div>
              : outgoing.map(o => (
                <div key={o.id} className="card" style={{ marginBottom: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                  {o.edition.item.imageUrl && <img src={o.edition.item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.edition.item.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Your offer: <span style={{ color: 'var(--gold)' }}>${Number(o.amount).toLocaleString()}</span></div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOUR[o.status] ?? 'var(--muted)' }}>
                    {o.status.toUpperCase()}
                  </span>
                </div>
              ))
          )}
        </div>
      )}

      {tab === 'notifs' && (
        notifications.length === 0
          ? <div style={{ color: 'var(--muted)' }}>No notifications.</div>
          : notifications.map(n => (
            <div key={n.id} className="card" style={{ marginBottom: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</div>
              </div>
              {n.actionUrl && <Link href={n.actionUrl} style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 12 }}>View →</Link>}
            </div>
          ))
      )}

      {/* Counter modal */}
      {counter && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setCounter(null) }}>
          <div className="modal">
            <div className="modal-title">Counter offer</div>
            <div className="modal-sub">Enter your counter amount</div>
            <div className="form-group">
              <label className="form-label">Counter amount (USD)</label>
              <input className="form-input" type="number" min="1" value={counter.amt} onChange={e => setCounter(c => c ? { ...c, amt: e.target.value } : null)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-gold" onClick={() => act(counter.id, 'counter', Number(counter.amt))} disabled={!!busy}>Send counter</button>
              <button className="btn btn-ghost" onClick={() => setCounter(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
