'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ChatMessage {
  id: string
  message: string
  createdAt: string
  user: { username: string; avatarUrl: string | null }
}

interface Props {
  auctionId:         string
  itemName:          string
  editionNum:        number
  imageUrl:          string | null
  editionId:         string
  rarityTier:        string
  status:            string
  minimumBid:        string
  endsAt:            string
  sellerId:          string
  bidCount:          number
  winnerName:        string | null
  winningBid:        string | null
  luckyUndervalueWin:boolean
  myBid:             { amount: string; status: string } | null
  userId:            string | null
  availableBalance:  string
  userUsername:      string | null
  isSeller:          boolean
  initialMessages:   ChatMessage[]
}

const RARITY_COLOUR: Record<string, string> = {
  Common:    '#888',
  Rare:      '#4ab8d8',
  Exotic:    '#b07fef',
  Legendary: '#e0a030',
  Mythic:    '#e05a5a',
}

function useCountdown(endsAt: string) {
  const calc = () => Math.max(0, new Date(endsAt).getTime() - Date.now())
  const [ms, setMs] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setMs(calc()), 1000)
    return () => clearInterval(t)
  })
  const s = Math.floor(ms / 1000)
  return { ms, h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), sec: s % 60, expired: ms === 0 }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function AuctionClient({
  auctionId, itemName, editionNum, imageUrl, editionId, rarityTier,
  status: initStatus, minimumBid, endsAt, sellerId, bidCount: initBidCount,
  winnerName: initWinner, winningBid: initWinningBid, luckyUndervalueWin: initLucky,
  myBid: initMyBid, userId, availableBalance, userUsername, isSeller, initialMessages,
}: Props) {
  const router    = useRouter()
  const countdown = useCountdown(endsAt)

  const [liveStatus,   setLiveStatus]   = useState(initStatus)
  const [liveBidCount, setLiveBidCount] = useState(initBidCount)
  const [winnerName,   setWinnerName]   = useState(initWinner)
  const [winningBid,   setWinningBid]   = useState(initWinningBid)
  const [lucky,        setLucky]        = useState(initLucky)
  const [myBid,        setMyBid]        = useState(initMyBid)

  const [bidAmt,  setBidAmt]  = useState(initMyBid?.amount ?? '')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [bidMsg,  setBidMsg]  = useState('')

  const [messages,  setMessages]  = useState<ChatMessage[]>(initialMessages)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy,  setChatBusy]  = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const isActive   = liveStatus === 'active'
  const isSettled  = liveStatus === 'settled'
  const available  = Number(availableBalance)
  const minBid     = Number(minimumBid)
  const colour     = RARITY_COLOUR[rarityTier] ?? 'var(--muted)'

  // Poll live state every 10s
  useEffect(() => {
    if (!isActive) return
    const t = setInterval(async () => {
      const res = await fetch(`/api/auctions/${auctionId}/live`)
      if (!res.ok) return
      const data = await res.json()
      setLiveStatus(data.status)
      setLiveBidCount(data.bidCount)
      if (data.status === 'settled') {
        setWinnerName(data.winnerName)
        setWinningBid(data.winningBid)
        setLucky(data.luckyUndervalueWin ?? false)
      }
      if (data.myBid) setMyBid(data.myBid)
    }, 10000)
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

  // Scroll chat container only — never the page
  useEffect(() => {
    const el = chatContainerRef.current
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
      setBidMsg(json.result === 'updated' ? 'Bid updated. Funds locked.' : 'Bid placed. Funds locked.')
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
    if (res.ok) { const data = await res.json(); setMessages(data.messages) }
    setChatBusy(false)
  }

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

          {/* Sealed bid notice */}
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--white)' }}>Sealed auction.</strong> Bids are hidden until the auction closes. The highest valid bid wins at their exact bid amount.
          </div>
        </div>

        {/* Right: action box */}
        <div>
          <div className="item-action-box">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: colour, background: colour + '22', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em' }}>
                {rarityTier.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Edition #{editionNum}</span>
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
              <div style={{ marginBottom: 16, padding: '8px 12px', background: isSettled ? '#1e2a15' : 'var(--bg3)', borderRadius: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: isSettled ? 'var(--green)' : 'var(--muted)' }}>
                  {isSettled ? 'Auction settled' : 'Auction ended'}
                </div>
              </div>
            )}

            {/* Public stats */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>MIN BID</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>${Number(minimumBid).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>BIDS</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{liveBidCount}</div>
              </div>
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
                      Winning bid: <span style={{ color: 'var(--white)', fontWeight: 700 }}>${Number(winningBid).toLocaleString()}</span>
                      {lucky && <span style={{ marginLeft: 8, color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>UNDERVALUE WIN</span>}
                    </div>
                    {userUsername === winnerName && (
                      <div style={{ marginTop: 8 }}>
                        <Link href={`/item/${editionId}`} className="btn btn-gold btn-sm">View your car →</Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--muted)', fontWeight: 700 }}>No eligible winner</div>
                )}
              </div>
            )}

            {/* My current bid */}
            {myBid && isActive && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#1e2a15', borderRadius: 6, fontSize: 13 }}>
                Your sealed bid: <span style={{ color: 'var(--green)', fontWeight: 900 }}>${Number(myBid.amount).toLocaleString()}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 8 }}>(funds locked)</span>
              </div>
            )}

            {/* Bid form */}
            {isActive && !isSeller && (
              <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                    {myBid ? 'Update your bid' : 'Place a sealed bid'} · Min: <strong style={{ color: 'var(--white)' }}>${Number(minimumBid).toLocaleString()}</strong>
                    {userId && <> · Available: <strong style={{ color: 'var(--white)' }}>${available.toLocaleString()}</strong></>}
                  </div>
                  <input
                    className="form-input"
                    type="number"
                    min={minBid}
                    max={available + (myBid ? Number(myBid.amount) : 0)}
                    step="1"
                    value={bidAmt}
                    onChange={e => setBidAmt(e.target.value)}
                    placeholder={`$${minBid.toLocaleString()} minimum`}
                    required
                  />
                </div>
                {error  && <div className="form-error">{error}</div>}
                {bidMsg && <div style={{ fontSize: 12, color: 'var(--green)', padding: '6px 10px', background: '#1e2a15', borderRadius: 6 }}>{bidMsg}</div>}
                <button
                  className="btn btn-gold btn-full btn-lg"
                  type="submit"
                  disabled={busy || !userId || !bidAmt || Number(bidAmt) < minBid}>
                  {busy ? 'Placing...' : userId ? (myBid ? 'Update bid' : 'Place sealed bid') : 'Sign in to bid'}
                </button>
                {!userId && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                  <Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to participate
                </div>}
              </form>
            )}

            {isActive && isSeller && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>You are the seller. Auction closes automatically.</div>
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

        <div ref={chatContainerRef} style={{ height: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
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
