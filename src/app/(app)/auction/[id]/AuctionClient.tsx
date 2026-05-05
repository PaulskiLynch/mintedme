'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { bidIncrement } from '@/lib/auction'

interface Bid {
  id: string
  amount: string
  createdAt: string
  user: { username: string }
}

interface ChatMessage {
  id: string
  message: string
  createdAt: string
  user: { username: string; avatarUrl: string | null }
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
  userUsername: string | null
  isSeller:     boolean
  initialMessages: ChatMessage[]
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

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function AuctionClient({
  auctionId, itemName, editionNum, imageUrl, editionId,
  status, startingBid, currentBid: initBid, endsAt,
  winnerName: initWinner, bids: initBids, userId, userBalance, userUsername,
  isSeller, initialMessages,
}: Props) {
  const router    = useRouter()
  const countdown = useCountdown(endsAt)

  // Live bid state
  const [liveBid,    setLiveBid]    = useState(initBid)
  const [liveBids,   setLiveBids]   = useState(initBids)
  const [liveWinner, setLiveWinner] = useState(initWinner)
  const [liveStatus, setLiveStatus] = useState(status)

  // Bid form
  const [bidMode,  setBidMode]  = useState<'quick' | 'max'>('quick')
  const [bidAmt,   setBidAmt]   = useState('')
  const [maxBidAmt, setMaxBidAmt] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')
  const [settled,  setSettled]  = useState(status !== 'active')
  const [bidMsg,   setBidMsg]   = useState('')

  // Chat
  const [messages,  setMessages]  = useState<ChatMessage[]>(initialMessages)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy,  setChatBusy]  = useState(false)
  const chatEndRef       = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const balance  = Number(userBalance ?? 0)
  const curBid   = Number(liveBid ?? startingBid)
  const step     = bidIncrement(curBid)
  const minBid   = curBid + step
  const isActive = liveStatus === 'active' && !settled

  // Poll live bid state every 8s
  useEffect(() => {
    if (!isActive) return
    const t = setInterval(async () => {
      const res = await fetch(`/api/auctions/${auctionId}/live`)
      if (!res.ok) return
      const data = await res.json()
      setLiveBid(data.currentBid)
      setLiveBids(data.bids)
      setLiveWinner(data.winnerName)
      if (data.status !== 'active') { setLiveStatus(data.status); setSettled(true) }
    }, 8000)
    return () => clearInterval(t)
  }, [auctionId, isActive])

  // Poll chat every 5s
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/auctions/${auctionId}/chat`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages)
    }, 5000)
    return () => clearInterval(t)
  }, [auctionId])

  // Scroll the chat box itself — never the page
  useEffect(() => {
    const el = chatContainerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  const settle = useCallback(async () => {
    if (settled) return
    const res = await fetch(`/api/auctions/${auctionId}/end`, { method: 'POST' })
    if (res.ok) { setSettled(true); router.refresh() }
  }, [auctionId, settled, router])

  useEffect(() => {
    if (countdown.expired && isActive) settle()
  }, [countdown.expired, isActive, settle])

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError(''); setBidMsg('')

    const payload: Record<string, number> = {}
    if (bidMode === 'quick') {
      payload.amount = Number(bidAmt)
    } else {
      // Max bid mode — place minimum required bid, set max ceiling
      payload.amount = minBid
      payload.maxBid = Number(maxBidAmt)
    }

    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (res.ok) {
      setBidAmt(''); setMaxBidAmt('')
      if (json.result === 'outbid_by_proxy') {
        setBidMsg(`Your bid was placed but immediately outbid by a proxy ($${Number(json.proxyBid).toLocaleString()}).`)
      } else {
        setBidMsg('You are now the highest bidder!')
      }
      // Refresh live state immediately
      const live = await fetch(`/api/auctions/${auctionId}/live`)
      if (live.ok) {
        const data = await live.json()
        setLiveBid(data.currentBid); setLiveBids(data.bids); setLiveWinner(data.winnerName)
      }
    } else {
      setError(json.error || 'Bid failed')
    }
    setBusy(false)
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    setChatBusy(true)
    await fetch(`/api/auctions/${auctionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: chatInput }),
    })
    setChatInput('')
    // Immediately refresh chat
    const res = await fetch(`/api/auctions/${auctionId}/chat`)
    if (res.ok) { const data = await res.json(); setMessages(data.messages) }
    setChatBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Main two-column layout */}
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
            {liveBids.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No bids yet — be the first.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {liveBids.map((b, i) => (
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

            {/* Countdown */}
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
                  {liveStatus === 'cancelled' ? 'Auction ended — no bids' : `Auction ended${liveWinner ? ` — won by @${liveWinner}` : ''}`}
                </div>
              </div>
            )}

            {/* Current bid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 4 }}>
                {liveBid ? 'CURRENT BID' : 'STARTING BID'}
              </div>
              <div className="item-price-big">${Number(liveBid ?? startingBid).toLocaleString()}</div>
              {liveBids.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{liveBids.length} bid{liveBids.length !== 1 ? 's' : ''}</div>
              )}
              {liveBid && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Next increment: <strong style={{ color: 'var(--white)' }}>${step.toLocaleString()}</strong> · Min bid: <strong style={{ color: 'var(--white)' }}>${minBid.toLocaleString()}</strong>
                </div>
              )}
            </div>

            {/* Bid form */}
            {isActive && !isSeller && (
              <div>
                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 14, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  {(['quick', 'max'] as const).map(mode => (
                    <button key={mode} type="button" onClick={() => { setBidMode(mode); setError(''); setBidMsg('') }}
                      style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700, background: bidMode === mode ? 'var(--gold)' : 'var(--bg3)', color: bidMode === mode ? 'var(--bg)' : 'var(--muted)', border: 'none', cursor: 'pointer' }}>
                      {mode === 'quick' ? 'Quick bid' : 'Max bid (proxy)'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bidMode === 'quick' ? (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                        Min: <strong style={{ color: 'var(--white)' }}>${minBid.toLocaleString()}</strong>
                        {userId && <> · Balance: <strong style={{ color: 'var(--white)' }}>${balance.toLocaleString()}</strong></>}
                      </div>
                      <input
                        className="form-input" type="number" min={minBid} max={balance} step="1"
                        value={bidAmt} onChange={e => setBidAmt(e.target.value)}
                        placeholder={`$${minBid.toLocaleString()} or more`} required
                      />
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                        Set your ceiling — system bids the minimum required on your behalf
                      </div>
                      <input
                        className="form-input" type="number" min={minBid} max={balance} step="1"
                        value={maxBidAmt} onChange={e => setMaxBidAmt(e.target.value)}
                        placeholder={`$${minBid.toLocaleString()} minimum`} required
                      />
                    </div>
                  )}

                  {error  && <div className="form-error">{error}</div>}
                  {bidMsg && <div style={{ fontSize: 12, color: 'var(--green)', padding: '6px 10px', background: '#1e2a15', borderRadius: 6 }}>{bidMsg}</div>}

                  <button
                    className="btn btn-gold btn-full btn-lg" type="submit"
                    disabled={busy || !userId || (bidMode === 'quick' ? (!bidAmt || Number(bidAmt) < minBid || balance < Number(bidAmt)) : (!maxBidAmt || Number(maxBidAmt) < minBid || balance < minBid))}>
                    {busy ? 'Placing...' : userId ? (bidMode === 'quick' ? 'Place bid' : 'Set max bid') : 'Sign in to bid'}
                  </button>
                  {!userId && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                    <Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to participate
                  </div>}
                </form>
              </div>
            )}

            {isActive && isSeller && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>You are the seller. Share this auction to attract bidders.</div>
                <button className="btn btn-danger btn-full" onClick={settle} disabled={busy}>End auction early</button>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Link href={`/item/${editionId}`} style={{ fontSize: 12, color: 'var(--muted)' }}>← View item page</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Room chat — full width */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>Bid Room</div>
          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>LIVE</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} style={{ height: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {messages.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>No messages yet. Start the conversation!</div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {msg.user.avatarUrl
                    ? <img src={msg.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>{msg.user.username[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <Link href={`/mint/${msg.user.username}`} style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)' }}>
                      @{msg.user.username}
                    </Link>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(msg.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--white)', marginTop: 2, wordBreak: 'break-word' }}>{msg.message}</div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        {userId ? (
          <form onSubmit={handleChat} style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Say something..."
              maxLength={500}
              style={{ flex: 1 }}
            />
            <button className="btn btn-gold" type="submit" disabled={chatBusy || !chatInput.trim()} style={{ flexShrink: 0 }}>
              Send
            </button>
          </form>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            <Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to join the conversation
          </div>
        )}
      </div>
    </div>
  )
}
