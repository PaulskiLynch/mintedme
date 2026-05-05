'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  editionId:      string
  itemId:         string
  itemName:       string
  isOwner:        boolean
  isListed:       boolean
  listedPrice:    string | null
  isInAuction:    boolean
  isFrozen:       boolean
  userId:         string | null
  userBalance:    string | null
  currentOwnerId: string | null
  minimumBid:     string
  supplyLocked:   boolean
  supplyInfo:     string
}

export default function ItemActions({ editionId, itemId, itemName, isOwner, isListed, listedPrice, isInAuction, isFrozen, userId, userBalance, currentOwnerId, minimumBid, supplyLocked, supplyInfo }: Props) {
  const router = useRouter()
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState('')
  const [showOffer, setShowOffer]       = useState(false)
  const [showList, setShowList]         = useState(false)
  const [showAuction, setShowAuction]   = useState(false)
  const [offerAmt, setOfferAmt]         = useState('')
  const [offerDisplay, setOfferDisplay] = useState('')
  const [listPrice, setListPrice]       = useState(listedPrice ?? minimumBid ?? '')
  const [message, setMessage]           = useState('')
  const [startBid, setStartBid]         = useState(minimumBid ?? '')
  const [durationHours, setDurationHours] = useState('24')

  async function handleBuy() {
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError('')
    // Primary sale: pass itemId so API finds/mints the next available edition
    const body = currentOwnerId ? { editionId } : { itemId }
    const res = await fetch('/api/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) {
      // Navigate to the edition that was bought (may be freshly minted)
      router.push(`/item/${json.editionId}`)
    } else {
      setError(json.error || 'Purchase failed')
    }
    setBusy(false)
  }

  async function handleOffer(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError('')
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId, amount: Number(offerAmt.replace(/,/g, '')), message }),
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

  async function handleStartAuction(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await fetch('/api/auctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId, startingBid: Number(startBid), durationHours: Number(durationHours) }),
    })
    const json = await res.json()
    if (res.ok) { router.push(`/auction/${json.auctionId}`) } else { setError(json.error || 'Failed'); setBusy(false) }
  }

  async function handleDelist() {
    setBusy(true); setError('')
    await fetch(`/api/editions/${editionId}/list`, { method: 'DELETE' })
    router.refresh()
    setBusy(false)
  }

  if (isFrozen) return <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>This item is frozen.</div>

  const balance  = Number(userBalance ?? 0)
  const price    = Number(listedPrice ?? 0)
  const refPrice = Number(minimumBid ?? 0)

  // Primary sale — no owner yet, buy at reference price
  if (!currentOwnerId) {
    return (
      <div>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{supplyInfo}</div>
        {supplyLocked ? (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            Supply locked — unlocks as more users join
          </div>
        ) : minimumBid ? (
          <button className="btn btn-gold btn-full btn-lg" onClick={handleBuy} disabled={busy || !userId || balance < refPrice}>
            {busy ? 'Buying...' : `Buy now — $${refPrice.toLocaleString()}`}
          </button>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Not available for sale.</div>
        )}
        {!userId && !supplyLocked && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>Sign in to buy</div>}
        {userId && refPrice > 0 && balance < refPrice && !supplyLocked && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>Insufficient balance (you have ${balance.toLocaleString()})</div>
        )}
      </div>
    )
  }

  return (
    <div>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

      {isOwner ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isInAuction ? (
            <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>Live auction in progress</div>
          ) : isListed ? (
            <button className="btn btn-danger btn-full" onClick={handleDelist} disabled={busy}>
              {busy ? '...' : 'Remove listing'}
            </button>
          ) : (
            <>
              <button className="btn btn-gold btn-full" onClick={() => setShowList(true)} disabled={busy}>
                List for sale
              </button>
              <button className="btn btn-outline btn-full" onClick={() => setShowAuction(true)} disabled={busy}>
                Start auction
              </button>
            </>
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
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  value={offerDisplay}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setOfferAmt(raw)
                    setOfferDisplay(raw ? Number(raw).toLocaleString() : '')
                  }}
                  placeholder={minimumBid ? `ref: $${Number(minimumBid).toLocaleString()}` : 'Enter amount'}
                  required
                  autoFocus
                />
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

      {/* Auction modal */}
      {showAuction && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowAuction(false) }}>
          <div className="modal">
            <div className="modal-title">Start Auction</div>
            <div className="modal-sub">{itemName}</div>
            <form onSubmit={handleStartAuction}>
              <div className="form-group">
                <label className="form-label">Starting bid (USD)</label>
                <input className="form-input" type="number" min="1" value={startBid} onChange={e => setStartBid(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <select className="form-input" value={durationHours} onChange={e => setDurationHours(e.target.value)}>
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" type="submit" disabled={busy || !startBid}>{busy ? 'Starting...' : 'Start auction'}</button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowAuction(false)}>Cancel</button>
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
