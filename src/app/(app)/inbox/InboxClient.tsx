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
  id: string; amount: string; status: string; expiresAt: string
  message: string | null
  buyer: { username: string }
  edition: OfferEdition
}

interface OutgoingOffer {
  id: string; amount: string; status: string; expiresAt: string
  edition: OfferEdition
}

interface Props {
  incoming: IncomingOffer[]
  outgoing: OutgoingOffer[]
}

const STATUS_COLOUR: Record<string, string> = {
  pending:  'var(--gold)',
  accepted: 'var(--green)',
  declined: 'var(--red)',
  expired:  'var(--muted)',
  countered:'#7bb',
}

export default function InboxClient({ incoming, outgoing }: Props) {
  const router                        = useRouter()
  const [tab, setTab]                 = useState<'in' | 'out'>('in')
  const [busy, setBusy]               = useState('')
  const [counter, setCounter]         = useState<{ id: string; amt: string } | null>(null)

  async function act(offerId: string, action: string, counterAmount?: number) {
    setBusy(offerId)
    await fetch(`/api/offers/${offerId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, counterAmount }),
    })
    setBusy(''); setCounter(null); router.refresh()
  }

  const pendingCount = incoming.filter(o => o.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="page-title">Inbox</div>
          <div className="page-sub">Your offers</div>
        </div>
        {pendingCount > 0 && (
          <span style={{ background: 'var(--gold)', color: '#000', fontWeight: 800, fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>
            {pendingCount} pending
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`pill${tab === 'in' ? ' active' : ''}`} onClick={() => setTab('in')}>
          Received{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
        <button className={`pill${tab === 'out' ? ' active' : ''}`} onClick={() => setTab('out')}>Sent</button>
      </div>

      {tab === 'in' && (
        incoming.length === 0
          ? <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center', fontWeight: 700 }}>No offers received yet.</div>
          : incoming.map(o => (
            <div key={o.id} className="card" style={{ marginBottom: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {o.edition.item.imageUrl && <img src={o.edition.item.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  <span style={{ color: 'var(--gold)' }}>${Number(o.amount).toLocaleString()}</span>
                  {' '}from{' '}
                  <Link href={`/mint/${o.buyer.username}`} style={{ fontWeight: 700 }}>@{o.buyer.username}</Link>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  for {o.edition.item.name} · expires {formatDistanceToNow(new Date(o.expiresAt), { addSuffix: true })}
                </div>
                {o.message && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', marginBottom: 8 }}>&ldquo;{o.message}&rdquo;</div>}
                {o.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-gold btn-sm" onClick={() => act(o.id, 'accept')} disabled={busy === o.id}>Accept</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setCounter({ id: o.id, amt: o.amount })} disabled={busy === o.id}>Counter</button>
                    <button className="btn btn-danger btn-sm" onClick={() => act(o.id, 'decline')} disabled={busy === o.id}>Decline</button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOUR[o.status] ?? 'var(--muted)' }}>
                    {o.status.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))
      )}

      {tab === 'out' && (
        outgoing.length === 0
          ? <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center', fontWeight: 700 }}>No offers sent yet.</div>
          : outgoing.map(o => (
            <div key={o.id} className="card" style={{ marginBottom: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
              {o.edition.item.imageUrl && <img src={o.edition.item.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.edition.item.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Your offer: <span style={{ color: 'var(--gold)' }}>${Number(o.amount).toLocaleString()}</span>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOUR[o.status] ?? 'var(--muted)', flexShrink: 0 }}>
                {o.status.toUpperCase()}
              </span>
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
              <input className="form-input" type="number" min="1" value={counter.amt}
                onChange={e => setCounter(c => c ? { ...c, amt: e.target.value } : null)} autoFocus />
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
