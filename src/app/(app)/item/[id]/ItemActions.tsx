'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  editionId:      string
  itemName:       string
  isOwner:        boolean
  isListed:       boolean
  listedPrice:    string | null
  isInAuction:    boolean
  isFrozen:       boolean
  userId:         string | null
  userBalance:    string | null
  currentOwnerId: string | null
  referencePrice: string | null
}

export default function ItemActions({ editionId, itemName, isOwner, isListed, listedPrice, isInAuction, isFrozen, userId, userBalance, currentOwnerId, referencePrice }: Props) {
  const router = useRouter()
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState('')
  const [showOffer, setShowOffer] = useState(false)
  const [showList, setShowList]   = useState(false)
  const [offerAmt, setOfferAmt]   = useState('')
  const [listPrice, setListPrice] = useState(listedPrice ?? referencePrice ?? '')
  const [message, setMessage]     = useState('')

  async function handleBuy() {
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError('')
    const res = await fetch('/api/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId }),
    })
    const json = await res.json()
    if (res.ok) { router.refresh() } else { setError(json.error || 'Purchase failed') }
    setBusy(false)
  }

  async function handleOffer(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError('')
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId, amount: Number(offerAmt), message }),
    })
    const json = await res.json()
    if (res.ok) { setShowOffer(false); router.refresh() } else { setError(json.error || 'Offer failed') }
    setBusy(false)
  }

  async function handleList(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await fetch(`/api/editions/${editionId}/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: Number(listPrice) }),
    })
    const json = await res.json()
    if (res.ok) { setShowList(false); router.refresh() } else { setError(json.error || 'Failed') }
    setBusy(false)
  }

  async function handleDelist() {
    setBusy(true); setError('')
    await fetch(`/api/editions/${editionId}/list`, { method: 'DELETE' })
    router.refresh()
    setBusy(false)
  }

  if (isFrozen) return <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>This item is frozen.</div>
  if (!currentOwnerId) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>This edition has no owner yet.</div>

  const balance = Number(userBalance ?? 0)
  const price   = Number(listedPrice ?? 0)

  return (
    <div>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

      {isOwner ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isListed ? (
            <button className="btn btn-danger btn-full" onClick={handleDelist} disabled={busy}>
              {busy ? '...' : 'Remove listing'}
            </button>
          ) : (
            <button className="btn btn-gold btn-full" onClick={() => setShowList(true)} disabled={busy}>
              List for sale
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isListed && listedPrice && !isInAuction && (
            <button className="btn btn-gold btn-full btn-lg" onClick={handleBuy} disabled={busy || !userId || balance < price}>
              {busy ? 'Buying...' : `Buy now — $${price.toLocaleString()}`}
            </button>
          )}
          {!isInAuction && (
            <button className="btn btn-outline btn-full" onClick={() => { if (!userId) { router.push('/login'); return } setShowOffer(true) }} disabled={busy}>
              Make offer
            </button>
          )}
          {!userId && (
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Sign in to buy or make offers</div>
          )}
          {userId && balance < price && isListed && (
            <div style={{ fontSize: 12, color: 'var(--red)' }}>Insufficient balance (you have ${balance.toLocaleString()})</div>
          )}
        </div>
      )}

      {/* Offer modal */}
      {showOffer && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowOffer(false) }}>
          <div className="modal">
            <div className="modal-title">Make an offer</div>
            <div className="modal-sub">on {itemName}</div>
            <form onSubmit={handleOffer}>
              <div className="form-group">
                <label className="form-label">Your offer (USD)</label>
                <input className="form-input" type="number" min="1" max={balance} value={offerAmt} onChange={e => setOfferAmt(e.target.value)} placeholder={referencePrice ? `ref: $${Number(referencePrice).toLocaleString()}` : 'Enter amount'} required autoFocus />
              </div>
              <div className="offer-warning">
                Your funds will be reserved for 48 hours while the offer is active.
                Balance: ${balance.toLocaleString()}
              </div>
              <div className="form-group">
                <label className="form-label">Message (optional)</label>
                <input className="form-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Love this piece..." maxLength={200} />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" type="submit" disabled={busy || !offerAmt}>{busy ? 'Sending...' : 'Send offer'}</button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowOffer(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List modal */}
      {showList && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowList(false) }}>
          <div className="modal">
            <div className="modal-title">List for sale</div>
            <div className="modal-sub">{itemName}</div>
            <form onSubmit={handleList}>
              <div className="form-group">
                <label className="form-label">Listing price (USD)</label>
                <input className="form-input" type="number" min="1" value={listPrice} onChange={e => setListPrice(e.target.value)} required autoFocus />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" type="submit" disabled={busy}>{busy ? 'Listing...' : 'List item'}</button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowList(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
