'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { bidIncrement } from '@/lib/auction'

interface ChatMessage {
  id: string
  message: string
  createdAt: string
  user: { username: string; avatarUrl: string | null }
}

interface Props {
  auctionId:          string
  itemName:           string
  editionNum:         number
  imageUrl:           string | null
  editionId:          string
  rarityTier:         string
  status:             string
  minimumBid:         string
  benchmarkPrice:     string
  currentBid:         string | null
  endsAt:             string
  extensionCount:     number
  sellerId:           string | null
  isSystemAuction:    boolean
  bidCount:           number
  watcherCount:       number
  lastSalePrice:      string | null
  winnerName:         string | null
  winningBid:         string | null
  luckyUndervalueWin: boolean
  myBid:              { amount: string; status: string } | null
  userId:             string | null
  availableBalance:   string
  userUsername:       string | null
  isSeller:           boolean
  initialMessages:    ChatMessage[]
}

const RARITY_COLOUR: Record<string, string> = {
  Common:    '#888',
  Premium:   '#6db87a',
  Rare:      '#4ab8d8',
  Exotic:    '#b07fef',
  Legendary: '#e0a030',
  Mythic:    '#e05a5a',
  Custom:    '#d0d0d0',
  Banger:    '#ff6b35',
}

function useCountdown(endsAt: string) {
  const calc = () => Math.max(0, new Date(endsAt).getTime() - Date.now())
  const [ms, setMs] = useState(calc)
  useEffect(() => {
    setMs(calc())
    const t = setInterval(() => setMs(calc()), 1000)
    return () => clearInterval(t)
  }, [endsAt])
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  return { ms, d, h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), sec: s % 60, expired: ms === 0 }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function fmt(n: number) { return '$' + n.toLocaleString() }

export default function AuctionClient({
  auctionId, itemName, editionNum, imageUrl, editionId, rarityTier,
  status: initStatus, minimumBid, benchmarkPrice, currentBid: initCurrentBid,
  endsAt: initEndsAt, extensionCount: initExtCount,
  sellerId, isSystemAuction, bidCount: initBidCount, watcherCount,
  lastSalePrice, winnerName: initWinner, winningBid: initWinningBid,
  luckyUndervalueWin: initLucky, myBid: initMyBid,
  userId, availableBalance, userUsername, isSeller, initialMessages,
}: Props) {
  const router    = useRouter()

  const [liveStatus,     setLiveStatus]     = useState(initStatus)
  const [liveCurrentBid, setLiveCurrentBid] = useState(initCurrentBid)
  const [liveBidCount,   setLiveBidCount]   = useState(initBidCount)
  const [liveEndsAt,     setLiveEndsAt]     = useState(initEndsAt)
  const [liveExtCount,   setLiveExtCount]   = useState(initExtCount)
  const [winnerName,     setWinnerName]     = useState(initWinner)
  const [winningBid,     setWinningBid]     = useState(initWinningBid)
  const [lucky,          setLucky]          = useState(initLucky)
  const [myBid,          setMyBid]          = useState(initMyBid)

  const countdown  = useCountdown(liveEndsAt)
  const isActive   = liveStatus === 'active'
  const isSettled  = liveStatus === 'settled'
  const available  = Number(availableBalance)
  const colour     = RARITY_COLOUR[rarityTier] ?? 'var(--muted)'
  const benchmark  = Number(benchmarkPrice)
  const currentBidNum = liveCurrentBid ? Number(liveCurrentBid) : null
  const minRequired   = currentBidNum !== null
    ? currentBidNum + bidIncrement(currentBidNum)
    : Number(minimumBid)

  const [bidAmt, setBidAmt] = useState('')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')
  const [bidMsg, setBidMsg] = useState('')

  const [messages,  setMessages]  = useState<ChatMessage[]>(initialMessages)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy,  setChatBusy]  = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  // Poll live state every 8s
  useEffect(() => {
    if (!isActive) return
    const t = setInterval(async () => {
      const res = await fetch(`/api/auctions/${auctionId}/live`)
      if (!res.ok) return
      const d = await res.json()
      setLiveStatus(d.status)
      setLiveBidCount(d.bidCount)
      setLiveEndsAt(d.endsAt)
      setLiveExtCount(d.extensionCount ?? 0)
      if (d.currentBid) setLiveCurrentBid(d.currentBid)
      if (d.status === 'settled') {
        setWinnerName(d.winnerName)
        setWinningBid(d.winningBid)
        setLucky(d.luckyUndervalueWin ?? false)
      }
      if (d.myBid) setMyBid(d.myBid)
    }, 8000)
    return () => clearInterval(t)
  }, [auctionId, isActive])

  // Poll chat every 5s
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/auctions/${auctionId}/chat`)
      if (!res.ok) return
      const d = await res.json()
      setMessages(d.messages)
    }, 5000)
    return () => clearInterval(t)
  }, [auctionId])

  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  const settle = useCallback(async () => {
    const res = await fetch(`/api/auctions/${auctionId}/end`, { method: 'POST' })
    if (res.ok) router.refresh()
  }, [auctionId, router])

  useEffect(() => {
    if (countdown.expired && isActive) settle()
  }, [countdown.expired, isActive, settle])

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { router.push('/login'); return }
    setBusy(true); setError(''); setBidMsg('')
    const amount = Number(bidAmt)
    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    const json = await res.json()
    if (res.ok) {
      setMyBid({ amount: bidAmt, status: 'active' })
      setLiveCurrentBid(bidAmt)
      setBidMsg(json.extended
        ? `Bid placed! Auction extended +5 min (anti-snipe)`
        : json.result === 'updated' ? 'Bid updated — funds locked' : 'Bid placed — funds locked')
      setBidAmt('')
      if (json.newEndsAt) setLiveEndsAt(json.newEndsAt)
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
    const res = await fetch(`/api/auctions/${auctionId}/chat`)
    if (res.ok) { const d = await res.json(); setMessages(d.messages) }
    setChatBusy(false)
  }

  // Verdict vs true value (shown after settlement)
  const verdictLine = (() => {
    if (!isSettled || !winningBid) return null
    const price = Number(winningBid)
    const pct   = Math.round(((price - benchmark) / benchmark) * 100)
    if (pct <= -20) return { label: `Steal — ${Math.abs(pct)}% below true value`, colour: 'var(--green)' }
    if (pct >= 20)  return { label: `Overpaid — ${pct}% above true value`, colour: 'var(--red)' }
    if (pct < 0)    return { label: `${Math.abs(pct)}% below true value`, colour: 'var(--green)' }
    return { label: `${pct}% above true value`, colour: 'var(--muted)' }
  })()

  const isLeading = myBid && liveCurrentBid && Number(myBid.amount) === Number(liveCurrentBid)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="item-detail">
        {/* Left: image */}
        <div>
          <div className="item-detail-img">
            {imageUrl
              ? <img src={imageUrl} alt={itemName} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>No image</div>
            }
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--white)' }}>Open auction.</strong>{' '}
            Highest bid at close wins. Bidder identities are hidden until the auction ends.
            {liveExtCount > 0 && <span style={{ color: 'var(--gold)', display: 'block', marginTop: 4 }}>
              ⏱ Extended {liveExtCount}× by anti-snipe rule
            </span>}
            {isSystemAuction && <span style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
              System auction — funds removed from circulation on win
            </span>}
          </div>
        </div>

        {/* Right: action box */}
        <div>
          <div className="item-action-box">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: colour, background: colour + '22', padding: '3px 10px', borderRadius: 20 }}>
                {rarityTier.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Edition #{editionNum}</span>
            </div>

            {/* Countdown */}
            {isActive ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 4 }}>ENDS IN</div>
                <div style={{ fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: countdown.h < 1 && countdown.d === 0 ? 'var(--red)' : 'var(--white)' }}>
                  {countdown.d > 0
                    ? `${countdown.d}d ${String(countdown.h).padStart(2,'0')}h`
                    : `${String(countdown.h).padStart(2,'0')}:${String(countdown.m).padStart(2,'0')}:${String(countdown.sec).padStart(2,'0')}`}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: isSettled ? '#1e2a15' : 'var(--bg3)', borderRadius: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: isSettled ? 'var(--green)' : 'var(--muted)' }}>
                  {isSettled ? 'Auction settled' : 'Auction ended'}
                </div>
              </div>
            )}

            {/* Current bid + true value */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 4 }}>CURRENT BID</div>
                {currentBidNum !== null
                  ? <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>{fmt(currentBidNum)}</div>
                  : <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700 }}>No bids yet</div>}
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 4 }}>TRUE VALUE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--white)' }}>{fmt(benchmark)}</div>
              </div>
            </div>

            {/* Current bid vs true value */}
            {currentBidNum !== null && (() => {
              const pct = Math.round(((currentBidNum - benchmark) / benchmark) * 100)
              const colour = pct <= -20 ? 'var(--green)' : pct >= 20 ? 'var(--red)' : 'var(--muted)'
              const label  = pct < 0 ? `${Math.abs(pct)}% below true value` : pct > 0 ? `${pct}% above true value` : 'at true value'
              return <div style={{ fontSize: 12, color: colour, fontWeight: 700, marginBottom: 12 }}>{label}</div>
            })()}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--muted)' }}>
              <span><strong style={{ color: 'var(--white)' }}>{liveBidCount}</strong> bid{liveBidCount !== 1 ? 's' : ''}</span>
              <span><strong style={{ color: 'var(--white)' }}>{watcherCount}</strong> watching</span>
            </div>

            {/* Settlement result */}
            {isSettled && (
              <div style={{ marginBottom: 16, padding: '12px 16px', background: '#1a1500', border: '1px solid var(--gold-dim)', borderRadius: 8 }}>
                {winnerName ? (
                  <>
                    <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>
                      Won by <Link href={`/mint/${winnerName}`} style={{ color: 'var(--gold)' }}>@{winnerName}</Link>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Winning bid: <span style={{ color: 'var(--white)', fontWeight: 700 }}>{fmt(Number(winningBid))}</span>
                    </div>
                    {verdictLine && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: verdictLine.colour, marginTop: 4 }}>
                        {verdictLine.label}
                      </div>
                    )}
                    {lucky && (
                      <div style={{ marginTop: 6, fontSize: 11, background: '#1e2a15', padding: '3px 8px', borderRadius: 4, display: 'inline-block', color: 'var(--green)', fontWeight: 700 }}>
                        STEAL
                      </div>
                    )}
                    {userUsername === winnerName && (
                      <div style={{ marginTop: 10 }}>
                        <Link href={`/item/${editionId}`} className="btn btn-gold btn-sm">View your car →</Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--muted)', fontWeight: 700 }}>No bids — auction closed</div>
                )}
              </div>
            )}

            {/* My current bid status */}
            {myBid && isActive && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 6, fontSize: 13,
                background: isLeading ? '#1e2a15' : '#2a1a10',
                border: `1px solid ${isLeading ? 'var(--green)' : 'var(--red)'}44`,
              }}>
                {isLeading
                  ? <><span style={{ color: 'var(--green)', fontWeight: 900 }}>You&rsquo;re winning</span> at {fmt(Number(myBid.amount))} · funds locked</>
                  : <><span style={{ color: 'var(--red)', fontWeight: 900 }}>You&rsquo;ve been outbid</span> — your locked bid: {fmt(Number(myBid.amount))}</>}
              </div>
            )}

            {/* Bid form */}
            {isActive && !isSeller && (
              <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                    {currentBidNum !== null ? `Beat current bid — min ${fmt(minRequired)}` : `Starting bid — min ${fmt(minRequired)}`}
                    {userId && <> · Available: <strong style={{ color: 'var(--white)' }}>{fmt(available + (myBid ? Number(myBid.amount) : 0))}</strong></>}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>$</span>
                    <input
                      className="form-input"
                      type="number"
                      min={minRequired}
                      step="1"
                      value={bidAmt}
                      onChange={e => setBidAmt(e.target.value)}
                      placeholder={minRequired.toLocaleString()}
                      style={{ paddingLeft: 24 }}
                      required
                    />
                  </div>
                </div>
                {error  && <div className="form-error">{error}</div>}
                {bidMsg && <div style={{ fontSize: 12, color: 'var(--green)', padding: '6px 10px', background: '#1e2a15', borderRadius: 6 }}>{bidMsg}</div>}
                <button
                  className="btn btn-gold btn-full btn-lg"
                  type="submit"
                  disabled={busy || !userId || !bidAmt || Number(bidAmt) < minRequired}>
                  {busy ? 'Placing...' : userId ? 'Place bid' : 'Sign in to bid'}
                </button>
                {!userId && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                    <Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to bid
                  </div>
                )}
              </form>
            )}

            {isActive && isSeller && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>You are the seller. Auction closes in {countdown.d > 0 ? `${countdown.d}d` : `${countdown.h}h ${countdown.m}m`}.</div>
                <button className="btn btn-danger btn-full" onClick={settle} disabled={busy}>End auction early</button>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Link href={`/item/${editionId}`} style={{ fontSize: 12, color: 'var(--muted)' }}>← View item page</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Room chat */}
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

        <div ref={chatRef} style={{ height: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {messages.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>No messages yet.</div>
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
                    <Link href={`/mint/${msg.user.username}`} style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)' }}>@{msg.user.username}</Link>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(msg.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--white)', marginTop: 2, wordBreak: 'break-word' }}>{msg.message}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {userId ? (
          <form onSubmit={handleChat} style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Say something..." maxLength={500} style={{ flex: 1 }} />
            <button className="btn btn-gold" type="submit" disabled={chatBusy || !chatInput.trim()} style={{ flexShrink: 0 }}>Send</button>
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
