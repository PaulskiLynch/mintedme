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
  monthlyUpkeep:    number
  daysUntilCharge:  number
  supplyLocked:     boolean
  availableNow:     number
  alreadyClaimed:   number
  totalEver:        number
  scarcityThreshold: number
  membersNeeded:    number
  watcherCount:     number
  pendingOfferCount: number
  trendPct:         number | null
  businessRiskTier: string | null
  businessGross:    number
  businessUpkeep:   number
  businessNet:      number
  businessDaysToIncome: number
  discountPrice:    number | null
  propertyTier:     string | null
  propertyDef:      { label: string; emoji: string; prestige: string } | null
  propertyUpkeep:   number
  propertyAppreciation: number
  propertyNet:      number
  yachtType:        string | null
  yachtDef:         { label: string; emoji: string; prestige: string } | null
  yachtUpkeep:      number
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
  monthlyUpkeep, daysUntilCharge, supplyLocked,
  availableNow, alreadyClaimed, totalEver,
  scarcityThreshold, membersNeeded,
  watcherCount, pendingOfferCount, trendPct,
  businessRiskTier, businessGross, businessUpkeep, businessNet, businessDaysToIncome,
  discountPrice,
  propertyTier, propertyDef, propertyUpkeep, propertyAppreciation, propertyNet,
  yachtType, yachtDef, yachtUpkeep,
}: Props) {
  const router = useRouter()
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState('')

  // Offer state
  const [offerRaw, setOfferRaw]       = useState('')
  const [offerDisplay, setOfferDisplay] = useState('')
  const [offerNote, setOfferNote]     = useState('')
  const [showNote, setShowNote]       = useState(false)
  const [offerSent, setOfferSent]     = useState(false)

  // Owner action state
  const [showList, setShowList]           = useState(false)
  const [showAuction, setShowAuction]     = useState(false)
  const [listPrice, setListPrice]         = useState(listedPrice ?? '')
  const [bidOption, setBidOption]         = useState<'10pct' | '25pct' | 'custom'>('10pct')
  const [customBidValue, setCustomBidValue] = useState('')

  // Report state
  const [showReport, setShowReport]   = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc]   = useState('')
  const [reportSent, setReportSent]   = useState(false)

  const balance   = Number(userBalance ?? 0)
  const minBid    = Number(minimumBid ?? 0)
  const buyPrice  = Number(listedPrice ?? 0)
  const benchmark = Number(benchmarkPrice ?? 0)

  const demand = (watcherCount + pendingOfferCount * 2) >= 6 ? 'High'
               : (watcherCount + pendingOfferCount * 2) >= 2 ? 'Medium'
               : 'Normal'

  const isUnique   = rarityTier === 'Custom' || rarityTier === 'Banger'
  const supplyLine = isUnique
    ? '1 of 1 · Unique edition'
    : supplyLocked && scarcityThreshold > 0
    ? `SOLD OUT · ${membersNeeded} more members needed`
    : availableNow > 0
    ? `${availableNow} available now · ${totalEver} total ever`
    : `${totalEver} total ever`
  const claimedLine = isUnique ? null : alreadyClaimed > 0 ? `${alreadyClaimed} already claimed` : null

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
    if (res.ok) {
      setOfferRaw(''); setOfferDisplay(''); setOfferNote(''); setShowNote(false)
      setOfferSent(true)
      setTimeout(() => setOfferSent(false), 4000)
      router.refresh()
    } else {
      setError(json.error || 'Offer failed')
    }
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
    const bid10 = Math.round(benchmark * 0.10)
    const bid25 = Math.round(benchmark * 0.25)
    const startingBid = bidOption === '10pct' ? bid10 : bidOption === '25pct' ? bid25 : Number(customBidValue)
    const res = await fetch('/api/auctions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editionId, startingBid }) })
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

        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{supplyLine}</div>
        {claimedLine && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{claimedLine}</div>}

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

        {/* Property / Business / Yacht / Car panel — owner view */}
        {propertyDef ? (
          <PropertyPanel def={propertyDef} upkeep={propertyUpkeep} appreciation={propertyAppreciation} net={propertyNet} />
        ) : businessRiskTier ? (
          <BusinessIncomePanel gross={businessGross} upkeep={businessUpkeep} net={businessNet} daysToIncome={businessDaysToIncome} />
        ) : yachtDef ? (
          <YachtPanel def={yachtDef} upkeep={yachtUpkeep} />
        ) : monthlyUpkeep > 0 && (() => {
          const overdue = daysUntilCharge < 0
          return (
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: overdue ? '#2a1010' : 'var(--bg3)', border: `1px solid ${overdue ? 'var(--red)44' : 'transparent'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.06em' }}>COST OF OWNERSHIP</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: overdue ? 'var(--red)' : 'var(--gold)' }}>
                  ${monthlyUpkeep.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--muted)', marginTop: 4 }}>
                {overdue
                  ? `Overdue by ${Math.abs(daysUntilCharge)} day${Math.abs(daysUntilCharge) !== 1 ? 's' : ''}`
                  : `Next charge in ${daysUntilCharge} day${daysUntilCharge !== 1 ? 's' : ''}`}
              </div>
            </div>
          )
        })()}

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
        {showAuction && (() => {
          const bid10 = Math.round(benchmark * 0.10)
          const bid25 = Math.round(benchmark * 0.25)
          const canSubmit = bidOption !== 'custom' || (Number(customBidValue) > 0)
          return (
            <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowAuction(false) }}>
              <div className="modal">
                <div className="modal-title">Start Auction</div>
                <div className="modal-sub">{itemName} · 3-day auction</div>
                <form onSubmit={handleStartAuction}>
                  <div className="form-group">
                    <label className="form-label">Starting bid</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { key: '10pct', label: `10% of true value`, value: `$${bid10.toLocaleString()}` },
                        { key: '25pct', label: `25% of true value`, value: `$${bid25.toLocaleString()}` },
                        { key: 'custom', label: 'Custom amount', value: '' },
                      ].map(opt => (
                        <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 6, background: bidOption === opt.key ? 'var(--bg3)' : 'transparent', border: `1px solid ${bidOption === opt.key ? 'var(--gold-dim)' : 'transparent'}` }}>
                          <input type="radio" name="bidOption" value={opt.key} checked={bidOption === opt.key} onChange={() => setBidOption(opt.key as typeof bidOption)} />
                          <span style={{ flex: 1, fontSize: 14 }}>{opt.label}</span>
                          {opt.value && <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 14 }}>{opt.value}</span>}
                        </label>
                      ))}
                      {bidOption === 'custom' && (
                        <input className="form-input" type="number" min="1" value={customBidValue} onChange={e => setCustomBidValue(e.target.value)} placeholder="Enter amount" autoFocus required />
                      )}
                    </div>
                  </div>
                  {error && <div className="form-error">{error}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn btn-gold" type="submit" disabled={busy || !canSubmit}>{busy ? 'Starting...' : 'Start 3-day auction'}</button>
                    <button className="btn btn-ghost" type="button" onClick={() => setShowAuction(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )
        })()}

        {showReport && <ReportModal editionId={editionId} onClose={() => setShowReport(false)} />}
      </div>
    )
  }

  // ── Primary sale (no owner yet) ───────────────────────────────────────────────
  if (!currentOwnerId) {
    return (
      <div>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        <UrgencyBar watcherCount={watcherCount} pendingOfferCount={pendingOfferCount} />

        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{supplyLine}</div>
        {claimedLine && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{claimedLine}</div>}
        {!claimedLine && <div style={{ marginBottom: 12 }} />}

        {discountPrice !== null && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#0d2010', border: '1px solid #1a4020', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>🎉 Your suggestion made it in!</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>You get 50% off as the suggester</div>
          </div>
        )}

        {supplyLocked ? (
          <div style={{ background: 'rgba(224,90,90,0.07)', border: '1px solid rgba(224,90,90,0.25)', borderRadius: 8, padding: '14px 16px', textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--red)', letterSpacing: '0.06em', marginBottom: 4 }}>SOLD OUT</div>
            {scarcityThreshold > 0 && membersNeeded > 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                New editions unlock at <strong style={{ color: 'var(--white)' }}>{scarcityThreshold} members</strong>
                {' '}· <strong style={{ color: 'var(--gold)' }}>{membersNeeded} to go</strong>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Unlocks as more members join</div>
            )}
          </div>
        ) : discountPrice !== null ? (
          <button className="btn btn-gold btn-full btn-lg" onClick={handleBuy} disabled={busy || !userId || balance < discountPrice} style={{ marginBottom: 12 }}>
            {busy ? 'Buying...' : `Claim at $${discountPrice.toLocaleString()} (50% off)`}
          </button>
        ) : (
          <button className="btn btn-gold btn-full btn-lg" onClick={handleBuy} disabled={busy || !userId || balance < benchmark} style={{ marginBottom: 12 }}>
            {busy ? 'Buying...' : `Buy now — $${benchmark.toLocaleString()}`}
          </button>
        )}

        {!userId && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 12 }}>Sign in to buy</div>}
        {userId && (discountPrice ?? benchmark) > 0 && balance < (discountPrice ?? benchmark) && !supplyLocked && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>Insufficient balance (you have ${balance.toLocaleString()})</div>
        )}

        <PriceContext benchmark={benchmark} lastSalePrice={lastSalePrice} topOffer={topOffer} trendPct={trendPct} demand={demand} />

        {propertyDef
          ? <PropertyPanel def={propertyDef} upkeep={propertyUpkeep} appreciation={propertyAppreciation} net={propertyNet} />
          : businessRiskTier
          ? <BusinessIncomePanel gross={businessGross} upkeep={businessUpkeep} net={businessNet} daysToIncome={businessDaysToIncome} />
          : yachtDef
          ? <YachtPanel def={yachtDef} upkeep={yachtUpkeep} />
          : null
        }

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

      <UrgencyBar watcherCount={watcherCount} pendingOfferCount={pendingOfferCount} />

      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{supplyLine}</div>
      {claimedLine && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{claimedLine}</div>}
      {!claimedLine && <div style={{ marginBottom: 12 }} />}

      {/* Offer sent confirmation */}
      {offerSent && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#0d2010', border: '1px solid #1a4020', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Offer sent!</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              The owner will be notified. Check your <a href="/inbox" style={{ color: 'var(--green)' }}>inbox</a> for their response.
            </div>
          </div>
        </div>
      )}

      {/* Offer form */}
      {!isInAuction && !offerSent && (
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
      <PriceContext benchmark={benchmark} lastSalePrice={lastSalePrice} topOffer={topOffer} trendPct={trendPct} demand={demand} />

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

      {/* Property / Business / Yacht / Car upkeep — context for potential buyers */}
      {propertyDef ? (
        <PropertyPanel def={propertyDef} upkeep={propertyUpkeep} appreciation={propertyAppreciation} net={propertyNet} />
      ) : businessRiskTier ? (
        <BusinessIncomePanel gross={businessGross} upkeep={businessUpkeep} net={businessNet} daysToIncome={businessDaysToIncome} />
      ) : yachtDef ? (
        <YachtPanel def={yachtDef} upkeep={yachtUpkeep} />
      ) : monthlyUpkeep > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: 'var(--red)' }}>Cost of Ownership</span>
            <span style={{ fontWeight: 700, color: 'var(--red)' }}>−${monthlyUpkeep.toLocaleString()}</span>
          </div>
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

function UrgencyBar({ watcherCount, pendingOfferCount }: { watcherCount: number; pendingOfferCount: number }) {
  const signals: string[] = []
  if (watcherCount > 0) signals.push(`🔥 ${watcherCount} player${watcherCount !== 1 ? 's' : ''} watching`)
  if (pendingOfferCount > 0) signals.push(`📋 ${pendingOfferCount} offer${pendingOfferCount !== 1 ? 's' : ''} pending`)
  if (signals.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      {signals.map(s => (
        <span key={s} style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>
          {s}
        </span>
      ))}
    </div>
  )
}

function PriceContext({ benchmark, lastSalePrice, topOffer, trendPct, demand }: {
  benchmark: number
  lastSalePrice: string | null
  topOffer: string | null
  trendPct: number | null
  demand: string
}) {
  const trendColour = trendPct == null ? 'var(--muted)'
                    : trendPct > 0 ? 'var(--green)'
                    : trendPct < 0 ? 'var(--red)'
                    : 'var(--muted)'
  const trendLabel = trendPct == null ? null
                   : trendPct > 0 ? `↑ +${trendPct.toFixed(1)}% vs last sale`
                   : trendPct < 0 ? `↓ ${trendPct.toFixed(1)}% vs last sale`
                   : '→ Stable'

  const demandColour = demand === 'High' ? 'var(--green)' : demand === 'Medium' ? 'var(--gold)' : 'var(--muted)'

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 10 }}>PRICE CONTEXT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>True value</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: 700 }}>${benchmark.toLocaleString()}</span>
            {trendLabel && <div style={{ fontSize: 11, color: trendColour, marginTop: 1 }}>{trendLabel}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>Demand</span>
          <span style={{ fontWeight: 700, color: demandColour }}>{demand}</span>
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

function BusinessIncomePanel({ gross, upkeep, net, daysToIncome }: {
  gross: number; upkeep: number; net: number; daysToIncome: number
}) {
  return (
    <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid #2a3a2a' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 10 }}>MONTHLY INCOME</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>Gross income</span>
          <span style={{ fontWeight: 700, color: 'var(--green)' }}>+${gross.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>Upkeep</span>
          <span style={{ fontWeight: 700, color: 'var(--red)' }}>−${upkeep.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
          <span style={{ fontWeight: 700 }}>Net profit</span>
          <span style={{ fontWeight: 900, color: 'var(--gold)' }}>+${net.toLocaleString()}/mo</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
        {daysToIncome === 0 ? 'Payout due today' : `Next payout in ${daysToIncome} day${daysToIncome !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}

function PropertyPanel({ def, upkeep, appreciation, net }: {
  def: { label: string; emoji: string; prestige: string }
  upkeep: number
  appreciation: number
  net: number
}) {
  const isRentFree = upkeep === 0 && appreciation === 0
  if (isRentFree) {
    return (
      <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8 }}>{def.emoji} {def.label.toUpperCase()}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Free to own. No upkeep, no appreciation — but at least you have a roof over your head.<br />
          <span style={{ color: '#888', fontStyle: 'italic' }}>Prestige: {def.prestige}</span>
        </div>
      </div>
    )
  }
  return (
    <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 10 }}>{def.emoji} PROPERTY ECONOMICS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>Monthly appreciation</span>
          <span style={{ fontWeight: 700, color: 'var(--green)' }}>+${appreciation.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: 'var(--red)' }}>Cost of Ownership</span>
          <span style={{ fontWeight: 700, color: 'var(--red)' }}>−${upkeep.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
          <span style={{ fontWeight: 700 }}>Net / month</span>
          <span style={{ fontWeight: 900, color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {net >= 0 ? '+' : '−'}${Math.abs(net).toLocaleString()}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
        Appreciation grows the asset's value, not your cash balance. Sell to realise gains.
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        Prestige: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{def.prestige}</span>
      </div>
    </div>
  )
}

function YachtPanel({ def, upkeep }: {
  def: { label: string; emoji: string; prestige: string }
  upkeep: number
}) {
  return (
    <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 10 }}>{def.emoji} COST OF OWNERSHIP</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: 'var(--muted)', fontWeight: 700 }}>Monthly upkeep</span>
        <span style={{ fontWeight: 700, color: upkeep > 0 ? 'var(--red)' : 'var(--muted)' }}>
          {upkeep > 0 ? `−$${upkeep.toLocaleString()}` : 'Free to maintain'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
        Prestige: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{def.prestige}</span>
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
