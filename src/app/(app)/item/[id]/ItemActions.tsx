'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  editionId:        string
  itemId:           string
  itemName:         string
  rarityTier:       string
  isOwner:          boolean
  isListed:         boolean
  listedPrice:      string | null
  isInAuction:      boolean
  isFrozen:         boolean
  userId:           string | null
  userBalance:      string | null
  currentOwnerId:   string | null
  ownerUsername:    string | null
  ownerLastSeenAt:  string | null
  ownerRareCount:   number
  minimumBid:       string
  benchmarkPrice:   string
  lastSalePrice:    string | null
  topOffer:         string | null
  weeklyUpkeep:     number
  supplyLocked:     boolean
  supplyInfo:       string
}

function timeAgo(iso: string | null): string | null {
  if (!iso) return null
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ItemActions({
  editionId, itemId, itemName, rarityTier,
  isOwner, isListed, listedPrice, isInAuction, isFrozen,
  userId, userBalance, currentOwnerId,
  ownerUsername, ownerLastSeenAt, ownerRareCount,
  minimumBid, benchmarkPrice, lastSalePrice, topOffer,
  weeklyUpkeep, supplyLocked, supplyInfo,
}: Props) {
  const router = useRouter()
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState('')

  // Offer state
  const [offerRaw, setOfferRaw]       = useState('')
  const [offerDisplay, setOfferDisplay] = useState('')
  const [offerNote, setOfferNote]     = useState('')
  const [showNote, setShowNote]       = useState(false)

  // Owner action state
  const [showList, setShowList]       = useState(false)
  const [showAuction, setShowAuction] = useState(false)
  const [listPrice, setListPrice]     = useState(listedPrice ?? '')
  const [startBid, setStartBid]       = useState(minimumBid ?? '')
  const [durationHours, setDurationHours] = useState('24')

  // Report state
  const [showReport, setShowReport]   = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc]   = useState('')
  const [reportSent, setReportSent]   = useState(false)

  const balance  = Number(userBalance ?? 0)
  const minBid   = Number(minimumBid ?? 0)
  const buyPrice = Number(listedPrice ?? 0)
  const benchmark = Number(benchmarkPrice ?? 0)

  async function handleBuy() {
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError('')
    const body = currentOwnerId ? { editionId } : { itemId }
    const res = await fetch('/api/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    if (res.ok) { router.push(`/item/${json.editionId}`) } else { setError(json.error || 'Purchase failed'); setBusy(false) }
  }

  async function handleOffer(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { router.push('/login'); return }
    if (!offerRaw) return
    setBusy(true); setError('')
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId, amount: Number(offerRaw), message: offerNote || undefined }),
    })
    const json = await res.json()
    if (res.ok) { setOfferRaw(''); setOfferDisplay(''); setOfferNote(''); router.refresh() }
    else { setError(json.error || 'Offer failed') }
    setBusy(false)
  }

  async function handleList(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await fetch(`/api/editions/${editionId}/list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price: Number(listPrice) }) })
    const json = await res.json()
    if (res.ok) { setShowList(false); router.refresh() } else { setError(json.error || 'Failed') }
    setBusy(false)
  }

  async function handleDelist() {
    setBusy(true); setError('')
    await fetch(`/api/editions/${editionId}/list`, { method: 'DELETE' })
    router.refresh(); setBusy(false)
  }

  async function handleStartAuction(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await fetch('/api/auctions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editionId, startingBid: Number(startBid), durationHours: Number(durationHours) }) })
    const json = await res.json()
    if (res.ok) { router.push(`/auction/${json.auctionId}`) } else { setError(json.error || 'Failed'); setBusy(false) }
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editionId, reason: reportReason, description: reportDesc }) })
    setReportSent(true); setBusy(false)
  }

  if (isFrozen) return <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>This item is frozen.</div>

  // ── Owner view ────────────────────────────────────────────────────────────────
  if (isOwner) {
    return (
      <div>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{supplyInfo}</div>

        {isInAuction ? (
          <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700, marginBottom: 12 }}>Live auction in progress</div>
        ) : isListed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
              Listed at <span style={{ color: 'var(--gold)', fontWeight: 700 }}>${Number(listedPrice).toLocaleString()}</span>
            </div>
            <button className="btn btn-danger btn-full" onClick={handleDelist} disabled={busy}>Remove listing</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => setShowList(true)} disabled={busy}>
              List for sale
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAuction(true)} disabled={busy}>
              Start auction
            </button>
          </div>
        )}

        <button onClick={() => setShowReport(true)} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
          Report this item
        </button>

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

        {showReport && <ReportModal editionId={editionId} onClose={() => setShowReport(false)} />}
      </div>
    )
  }

  // ── Primary sale (no owner yet) ───────────────────────────────────────────────
  if (!currentOwnerId) {
    return (
      <div>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{supplyInfo}</div>

        {supplyLocked ? (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 12 }}>
            Supply locked — unlocks as more users join
          </div>
        ) : (
          <button className="btn btn-gold btn-full btn-lg" onClick={handleBuy} disabled={busy || !userId || balance < benchmark} style={{ marginBottom: 12 }}>
            {busy ? 'Buying...' : `Buy now — $${benchmark.toLocaleString()}`}
          </button>
        )}

        {!userId && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 12 }}>Sign in to buy</div>}
        {userId && benchmark > 0 && balance < benchmark && !supplyLocked && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>Insufficient balance (you have ${balance.toLocaleString()})</div>
        )}

        <PriceContext benchmark={benchmark} lastSalePrice={lastSalePrice} topOffer={topOffer} />

        <button onClick={() => setShowReport(true)} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
          Report this item
        </button>

        {showReport && <ReportModal editionId={editionId} onClose={() => setShowReport(false)} />}
      </div>
    )
  }

  // ── Secondary market (has owner, not you) ─────────────────────────────────────
  const activeStr = timeAgo(ownerLastSeenAt)

  return (
    <div>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Offer form */}
      {!isInAuction && (
        <form onSubmit={handleOffer} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8 }}>MAKE OFFER</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15, fontWeight: 700, pointerEvents: 'none' }}>$</span>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                value={offerDisplay}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  setOfferRaw(raw)
                  setOfferDisplay(raw ? Number(raw).toLocaleString() : '')
                }}
                placeholder={minBid ? minBid.toLocaleString() : 'Enter amount'}
                style={{ paddingLeft: 24 }}
                required
              />
            </div>
            <button className="btn btn-gold" type="submit" disabled={busy || !offerRaw || !userId}>
              {busy ? '...' : 'Offer'}
            </button>
          </div>
          {minBid > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, display: 'flex', justifyContent: 'space-between' }}>
              <span>min ${minBid.toLocaleString()}</span>
              <button type="button" onClick={() => setShowNote(n => !n)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                {showNote ? 'hide note' : '+ add note'}
              </button>
            </div>
          )}
          {showNote && (
            <input className="form-input" style={{ marginTop: 8 }} type="text" value={offerNote} onChange={e => setOfferNote(e.target.value)} placeholder="Message to owner (optional)" maxLength={200} />
          )}
          {!userId && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Sign in to make offers</div>}
          {userId && balance < minBid && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>Insufficient balance (you have ${balance.toLocaleString()})</div>}
        </form>
      )}

      {/* Buy now */}
      {isListed && listedPrice && !isInAuction && (
        <button className="btn btn-outline btn-full" onClick={handleBuy} disabled={busy || !userId || balance < buyPrice} style={{ marginBottom: 16, fontSize: 13 }}>
          {busy ? 'Buying...' : `or Buy Now at $${buyPrice.toLocaleString()} →`}
        </button>
      )}

      {/* Price context */}
      <PriceContext benchmark={benchmark} lastSalePrice={lastSalePrice} topOffer={topOffer} />

      {/* Owner context */}
      {ownerUsername && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8 }}>OWNER</div>
          <Link href={`/mint/${ownerUsername}`} style={{ fontWeight: 700, color: 'var(--white)', fontSize: 14 }}>@{ownerUsername}</Link>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activeStr && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Active {activeStr}</div>}
            {ownerRareCount > 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Also owns {ownerRareCount} Exotic+ car{ownerRareCount !== 1 ? 's' : ''}</div>}
          </div>
        </div>
      )}

      {/* Upkeep warning */}
      {weeklyUpkeep > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14, fontSize: 12, color: '#e0a030' }}>
          Ownership cost: ${weeklyUpkeep.toLocaleString()}/week
        </div>
      )}

      {/* Report */}
      <button onClick={() => setShowReport(true)} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'block' }}>
        Report this item
      </button>

      {showReport && <ReportModal editionId={editionId} onClose={() => setShowReport(false)} />}
    </div>
  )
}

function PriceContext({ benchmark, lastSalePrice, topOffer }: { benchmark: number; lastSalePrice: string | null; topOffer: string | null }) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 10 }}>PRICE CONTEXT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>True value</span>
          <span style={{ fontWeight: 700 }}>${benchmark.toLocaleString()}</span>
        </div>
        {lastSalePrice && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Last sold</span>
            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>${Number(lastSalePrice).toLocaleString()}</span>
          </div>
        )}
        {topOffer && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Highest offer</span>
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>${Number(topOffer).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ReportModal({ editionId, onClose }: { editionId: string; onClose: () => void }) {
  const [reason, setReason]   = useState('')
  const [desc, setDesc]       = useState('')
  const [sent, setSent]       = useState(false)
  const [busy, setBusy]       = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editionId, reason, description: desc }) })
    setSent(true); setBusy(false)
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-title">Report this item</div>
        {sent ? (
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Thanks — our team will review it shortly.</p>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <select className="form-input" value={reason} onChange={e => setReason(e.target.value)} required>
                <option value="">Select a reason</option>
                <option value="copyright">Copyright / real brand</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="fake">Fake or misleading listing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Details (optional)</label>
              <input className="form-input" type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the issue..." maxLength={500} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger" type="submit" disabled={busy || !reason}>{busy ? 'Sending...' : 'Submit report'}</button>
              <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
