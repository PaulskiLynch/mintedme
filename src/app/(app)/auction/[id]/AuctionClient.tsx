'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Bid {
  id: string
  amount: string
  createdAt: string
  user: { username: string }
}

interface Props {
  auctionId:    string
  itemName:     string
  editionNum:   number
  imageUrl:     string | null
  editionId:    string
  status:       string
  startingBid:  string
  currentBid:   string | null
  endsAt:       string
  sellerId:     string
  winnerName:   string | null
  bids:         Bid[]
  userId:       string | null
  userBalance:  string | null
  isSeller:     boolean
}

function useCountdown(endsAt: string) {
  const calc = () => Math.max(0, new Date(endsAt).getTime() - Date.now())
  const [ms, setMs] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setMs(calc()), 1000)
    return () => clearInterval(t)
  })
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return { ms, h, m, sec, expired: ms === 0 }
}

export default function AuctionClient({ auctionId, itemName, editionNum, imageUrl, editionId, status, startingBid, currentBid, endsAt, winnerName, bids, userId, userBalance, isSeller }: Props) {
  const router   = useRouter()
  const countdown = useCountdown(endsAt)
  const [bidAmt, setBidAmt]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const [settled, setSettled] = useState(status !== 'active')

  const balance   = Number(userBalance ?? 0)
  const minBid    = Number(currentBid ?? startingBid) + 1
  const isActive  = status === 'active' && !settled

  const settle = useCallback(async () => {
    if (settled) return
    const res = await fetch(`/api/auctions/${auctionId}/end`, { method: 'POST' })
    if (res.ok) { setSettled(true); router.refresh() }
  }, [auctionId, settled, router])

  // Auto-settle when timer hits zero
  useEffect(() => {
    if (countdown.expired && isActive) settle()
  }, [countdown.expired, isActive, settle])

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError('')
    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(bidAmt) }),
    })
    const json = await res.json()
    if (res.ok) { setBidAmt(''); router.refresh() } else { setError(json.error || 'Bid failed') }
    setBusy(false)
  }

  return (
    <div className="item-detail">
      {/* Left: image + bid history */}
      <div>
        <div className="item-detail-img">
          {imageUrl
            ? <img src={imageUrl} alt={itemName} />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>No image</div>
          }
        </div>

        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 12 }}>Bid History</h3>
          {bids.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No bids yet — be the first.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {bids.map((b, i) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>
                    {i === 0 && <span style={{ color: 'var(--gold)', fontWeight: 700, marginRight: 6 }}>★</span>}
                    <Link href={`/mint/${b.user.username}`} style={{ fontWeight: 700, color: 'var(--white)' }}>@{b.user.username}</Link>
                  </span>
                  <span style={{ color: 'var(--gold)', fontWeight: 700 }}>${Number(b.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: action box */}
      <div>
        <div className="item-action-box">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            {itemName} — Edition #{editionNum}
          </div>

          {/* Status / countdown */}
          {isActive ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 4 }}>TIME REMAINING</div>
              <div style={{ fontSize: 32, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: countdown.h < 1 ? 'var(--red)' : 'var(--white)' }}>
                {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.sec).padStart(2, '0')}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6 }}>
              <div style={{ fontWeight: 900, fontSize: 13 }}>
                {status === 'cancelled' ? 'Auction ended — no bids' : `Auction ended${winnerName ? ` — won by @${winnerName}` : ''}`}
              </div>
            </div>
          )}

          {/* Current bid */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 4 }}>
              {currentBid ? 'CURRENT BID' : 'STARTING BID'}
            </div>
            <div className="item-price-big">${Number(currentBid ?? startingBid).toLocaleString()}</div>
            {bids.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{bids.length} bid{bids.length !== 1 ? 's' : ''}</div>
            )}
          </div>

          {/* Bid form */}
          {isActive && !isSeller && (
            <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                  Minimum bid: <strong style={{ color: 'var(--white)' }}>${minBid.toLocaleString()}</strong>
                  {userId && <> · Your balance: <strong style={{ color: 'var(--white)' }}>${balance.toLocaleString()}</strong></>}
                </div>
                <input
                  className="form-input"
                  type="number"
                  min={minBid}
                  max={balance}
                  step="1"
                  value={bidAmt}
                  onChange={e => setBidAmt(e.target.value)}
                  placeholder={`$${minBid.toLocaleString()} or more`}
                  required
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button
                className="btn btn-gold btn-full btn-lg"
                type="submit"
                disabled={busy || !userId || !bidAmt || Number(bidAmt) < minBid || balance < Number(bidAmt)}
              >
                {busy ? 'Placing bid...' : userId ? 'Place bid' : 'Sign in to bid'}
              </button>
              {!userId && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                <Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to participate
              </div>}
            </form>
          )}

          {isActive && isSeller && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>You are the seller. Share this auction to attract bidders.</div>
              <button className="btn btn-danger btn-full" onClick={settle} disabled={busy}>
                End auction early
              </button>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Link href={`/item/${editionId}`} style={{ fontSize: 12, color: 'var(--muted)' }}>← View item page</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
