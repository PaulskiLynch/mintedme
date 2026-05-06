'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedEvent {
  id: string; eventType: string; amount: string | null; createdAt: string
  likeCount: number; commentCount: number
  metadata?: Record<string, unknown> | null
  user: { username: string; avatarUrl: string | null } | null
  targetUser: { username: string; avatarUrl: string | null } | null
  edition: {
    id: string
    item: { name: string; imageUrl: string | null; category: string; benchmarkPrice: string; minimumBid: string }
  } | null
}
interface WatchItem    { editionId: string; itemName: string; imageUrl: string | null; currentPrice: string; endsAt: string | null; auctionId: string | null }
interface ActiveBid    { auctionId: string; editionId: string; itemName: string; imageUrl: string | null; myBid: string; minimumBid: string; isLeading: boolean; endsAt: string }
interface LiveAuction  { id: string; editionId: string; itemName: string; imageUrl: string | null; minimumBid: string; endsAt: string }
interface Friend       { id: string; username: string; avatarUrl: string | null; status: 'online' | 'idle' | 'offline' }
interface UserProfile  { username: string; tagline: string | null; avatarUrl: string | null; balance: string; followersCount: number; followingCount: number }
interface Comment      { id: string; message: string; createdAt: string; user: { username: string; avatarUrl: string | null } }
interface InventoryItem { editionId: string; itemName: string; imageUrl: string | null; isListed: boolean; listedPrice: string | null; lastSalePrice: string | null; minimumBid: string | null }
interface ClassStats   { onlineCount: number; topPlayerUsername: string | null; hotCategory: string | null }
interface ClientChallenge {
  code: string; label: string; icon: string; desc: string; reward: number
  done: boolean; claimed: boolean; progress: string | null
}

interface Props {
  userId: string; userProfile: UserProfile
  initialEvents: FeedEvent[]; initialWatching: WatchItem[]; initialBids: ActiveBid[]
  initialAuctions: LiveAuction[]; initialFriends: Friend[]; initialInterests: string[]
  reactionsByEventId: Record<string, string>
  myRank: number; totalPlayers: number
  classStats: ClassStats
  challenges: ClientChallenge[]
}

const ALL_CATEGORIES = ['Cars', 'Yachts', 'Watches', 'Art', 'Fashion', 'Jets', 'Mansions', 'Collectibles', 'Businesses']

const COMMENT_PROMPTS = ['Good buy?', 'Overpaid?', 'Future classic?', 'Flip it!', 'Hold it!']

const TYPE_INFO: Record<string, { label: string; css: string }> = {
  buy:           { label: 'PURCHASE',    css: 'purchase'    },
  sell:          { label: 'SALE',        css: 'sale'        },
  accept:        { label: 'SALE',        css: 'sale'        },
  offer:         { label: 'OFFER',       css: 'offer'       },
  auction_start: { label: 'AUCTION',     css: 'auction'     },
  auction_end:   { label: 'AUCTION WIN', css: 'auction'     },
  create_item:   { label: 'NEW ITEM',    css: 'new-item'    },
  post:          { label: 'POST',        css: 'post'        },
  achievement:   { label: 'ACHIEVEMENT', css: 'achievement' },
  income:        { label: 'INCOME',      css: 'achievement' },
  market_event:  { label: 'MARKET',      css: 'market'      },
}

function fmt(n: string | number | null | undefined) {
  if (!n) return null
  const v = Number(n)
  if (isNaN(v) || v === 0) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toLocaleString()}`
}

function timeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'ended'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function cap(s: string | undefined | null) {
  if (!s) return ''
  return s[0].toUpperCase() + s.slice(1)
}

function eventText(e: FeedEvent): string {
  const item = e.edition?.item.name ?? 'an item'
  const amt  = e.amount ? fmt(e.amount) ?? '' : ''
  switch (e.eventType) {
    case 'buy':           return `bought ${item}${amt ? ' for ' + amt : ''}`
    case 'sell':          return `sold ${item}${amt ? ' for ' + amt : ''}`
    case 'offer':         return `offered ${amt} on ${item}`
    case 'accept':        return `accepted ${amt} for ${item}`
    case 'auction_start': return `started an auction on ${item}`
    case 'auction_end':   return `won ${item}${amt ? ' for ' + amt : ''} at auction`
    case 'create_item':   return `crafted a new item: ${item}`
    case 'post':          return String(e.metadata?.text ?? '')
    default:              return e.eventType.replace(/_/g, ' ')
  }
}

function metaLine(e: FeedEvent): string {
  const parts: string[] = []
  const cat = e.edition?.item.category
  if (cat) parts.push(cap(cat))
  parts.push(formatDistanceToNow(new Date(e.createdAt), { addSuffix: true }))

  const amt = e.amount ? fmt(e.amount) : null
  switch (e.eventType) {
    case 'buy':
      if (amt) parts.push(`Paid ${amt}`)
      break
    case 'sell': case 'accept':
      if (amt) parts.push(`Received ${amt}`)
      break
    case 'auction_end':
      if (amt) parts.push(`Won for ${amt}`)
      break
  }

  if (e.targetUser) {
    const label = (e.eventType === 'buy' || e.eventType === 'offer') ? 'Owner' : 'Buyer'
    parts.push(`${label} @${e.targetUser.username}`)
  }

  return parts.join(' · ')
}

const REACTIONS = [
  { type: 'smart', emoji: '📈', label: 'Smart' },
  { type: 'bold',  emoji: '🔥', label: 'Bold'  },
  { type: 'risky', emoji: '😬', label: 'Risky' },
  { type: 'steal', emoji: '💰', label: 'Steal' },
]

function verdictLine(e: FeedEvent): { text: string; colour: string } | null {
  if (!e.amount || !e.edition?.item.benchmarkPrice) return null
  const amount = Number(e.amount)
  const bench  = Number(e.edition.item.benchmarkPrice)
  if (!bench) return null
  const pct = ((amount - bench) / bench) * 100

  switch (e.eventType) {
    case 'buy':
      if (pct < -25) return { text: `📉 ${Math.abs(pct).toFixed(0)}% below market · Smart buy`, colour: 'var(--green)' }
      if (pct >  25) return { text: `📈 ${pct.toFixed(0)}% above market · Overpaid`,             colour: 'var(--red)'   }
      return { text: 'Fair market price', colour: 'var(--muted)' }
    case 'offer':
      if (pct < -60) return { text: `😬 Lowball — ${Math.abs(pct).toFixed(0)}% below market`,   colour: 'var(--red)'   }
      if (pct < -25) return { text: `${Math.abs(pct).toFixed(0)}% below ask`,                    colour: 'var(--muted)' }
      if (pct >   0) return { text: `📈 Above market · Strong offer`,                            colour: 'var(--green)' }
      return null
    case 'sell': case 'accept':
      if (pct >  25) return { text: `💰 ${pct.toFixed(0)}% above market · Great flip`,           colour: 'var(--green)' }
      if (pct < -25) return { text: `${Math.abs(pct).toFixed(0)}% below market · Under-sold`,    colour: 'var(--red)'   }
      return { text: 'Fair sale', colour: 'var(--muted)' }
    case 'auction_end':
      if (pct < -20) return { text: `💰 Won ${Math.abs(pct).toFixed(0)}% below market · Bargain`, colour: 'var(--green)' }
      if (pct >  20) return { text: `${pct.toFixed(0)}% above market · Paid up`,                  colour: 'var(--muted)' }
      return null
  }
  return null
}

function impactLine(e: FeedEvent): string | null {
  if (!e.amount || !e.edition?.item.benchmarkPrice) return null
  const amount = Number(e.amount)
  const bench  = Number(e.edition.item.benchmarkPrice)

  if (e.eventType === 'buy') {
    const equity = bench - amount
    if (equity > 0)  return `Impact: +${fmt(equity)} instant equity`
    if (equity < -100) return `Impact: ${fmt(equity)} (overpaid)`
  }
  if (e.eventType === 'sell' || e.eventType === 'accept') {
    return `Impact: +${fmt(amount)} to balance`
  }
  if (e.eventType === 'auction_end' && amount) {
    const equity = bench - amount
    if (equity > 0) return `Impact: +${fmt(equity)} instant equity`
  }
  return null
}

function dedupeEvents(events: FeedEvent[]): FeedEvent[] {
  const counter = new Map<string, number>()
  return events.filter(e => {
    if (!e.user || !e.edition) return true
    const key = `${e.user.username}|${e.edition.item.name}|${e.eventType}`
    const n = (counter.get(key) ?? 0) + 1
    counter.set(key, n)
    return n <= 2
  })
}

function isVisible(e: FeedEvent): boolean {
  if (e.eventType === 'market_event' || e.eventType === 'achievement' || e.eventType === 'income') {
    return !!e.metadata?.title
  }
  if (e.eventType === 'post') {
    return !!e.metadata?.text && String(e.metadata.text).trim().length > 0
  }
  return !!e.user
}

// ─── Biggest Move Today ───────────────────────────────────────────────────────

function BiggestMoveToday({ events }: { events: FeedEvent[] }) {
  const DAY = 86400000
  const candidates = events.filter(e =>
    Date.now() - new Date(e.createdAt).getTime() < DAY &&
    (e.eventType === 'buy' || e.eventType === 'sell' || e.eventType === 'auction_end') &&
    e.amount && e.user
  )
  if (!candidates.length) return null
  const top = candidates.sort((a, b) => Number(b.amount) - Number(a.amount))[0]
  const verdict = verdictLine(top)

  return (
    <div style={{ marginBottom: 20, background: 'linear-gradient(135deg, #1a1400, #2a2000)', border: '1px solid var(--gold)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>🔥 BIGGEST MOVE TODAY</div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
        <Link href={`/mint/${top.user!.username}`} style={{ fontWeight: 700 }}>@{top.user!.username}</Link>
        {' '}<span style={{ color: 'var(--muted)' }}>{eventText(top)}</span>
      </div>
      {verdict && <div style={{ fontSize: 12, color: verdict.colour, marginTop: 4, fontWeight: 700 }}>{verdict.text}</div>}
      {top.edition && (
        <div style={{ marginTop: 10 }}>
          <Link href={`/item/${top.edition.id}`} className="btn btn-gold btn-sm">View Asset →</Link>
        </div>
      )}
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ avatarUrl, username, size = 36 }: { avatarUrl: string | null; username: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 900, color: 'var(--gold)' }}>
      {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : username[0]?.toUpperCase()}
    </div>
  )
}

// ─── Collapsible module ───────────────────────────────────────────────────────

function Module({ title, badge, collapsed, onToggle, children }: { title: string; badge?: React.ReactNode; collapsed: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="feed-module">
      <div className="feed-module-header" onClick={onToggle}>
        <span>{title}{badge}</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && <div className="feed-module-body">{children}</div>}
    </div>
  )
}

// ─── Challenge cards ──────────────────────────────────────────────────────────

function ChallengeCards({ challenges }: { challenges: ClientChallenge[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>
        Challenges · {challenges.filter(c => c.claimed).length}/{challenges.length} complete
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {challenges.map(c => (
          <div key={c.code} style={{
            flexShrink: 0, minWidth: 120, textAlign: 'center', borderRadius: 10, padding: '12px 14px',
            background: c.claimed ? '#1e2a10' : c.done ? '#1a2400' : 'var(--bg2)',
            border: `1px solid ${c.claimed ? 'var(--green)' : c.done ? '#5a8a00' : 'var(--border)'}`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.claimed ? 'var(--green)' : 'var(--white)', marginBottom: 3, lineHeight: 1.3 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, lineHeight: 1.3 }}>{c.desc}</div>
            {c.progress && !c.claimed && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: 'var(--gold)',
                    width: (() => {
                      const [cur, max] = c.progress.split('/').map(Number)
                      return `${Math.round((cur / max) * 100)}%`
                    })(),
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{c.progress}</div>
              </div>
            )}
            {c.claimed ? (
              <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--green)' }}>CLAIMED ✓</div>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gold)' }}>+${c.reward.toLocaleString()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Achievement card ─────────────────────────────────────────────────────────

function AchievementCard({ event }: { event: FeedEvent }) {
  const icon        = String(event.metadata?.icon  ?? '🏆')
  const title       = String(event.metadata?.title ?? '')
  const desc        = String(event.metadata?.description ?? '')
  const rankBefore  = event.metadata?.rankBefore as number | undefined
  const rankAfter   = event.metadata?.rankAfter  as number | undefined
  const username    = event.user?.username

  return (
    <div className="feed-post">
      <span className="feed-type-pill achievement">ACHIEVEMENT</span>
      <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.4 }}>{icon} {title}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{desc}</div>}
      {rankBefore !== undefined && rankAfter !== undefined && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Rank <span style={{ color: 'var(--muted)' }}>#{rankBefore}</span> → <span style={{ color: 'var(--gold)', fontWeight: 800 }}>#{rankAfter}</span>
        </div>
      )}
      {username && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <Link href={`/mint/${username}`} className="btn btn-ghost btn-sm">View Profile →</Link>
        </div>
      )}
    </div>
  )
}

// ─── Market event card ────────────────────────────────────────────────────────

function MarketCard({ event }: { event: FeedEvent }) {
  const icon     = String(event.metadata?.icon  ?? '📊')
  const title    = String(event.metadata?.title ?? '')
  const desc     = String(event.metadata?.description ?? '')
  const category = String(event.metadata?.category ?? '')

  // Strip leading emoji from title if it duplicates the icon
  const cleanTitle = title.replace(/^[\p{Emoji}\s]+/u, '').trim()

  return (
    <div className="feed-post">
      <span className="feed-type-pill market">MARKET</span>
      <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.4 }}>{icon} {cleanTitle || title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{desc}</div>}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <Link
          href={category ? `/marketplace?category=${category}` : '/marketplace'}
          className="btn btn-gold btn-sm"
        >
          {category ? `Browse ${cap(category)} →` : 'Browse Market →'}
        </Link>
      </div>
    </div>
  )
}

// ─── Feed post ────────────────────────────────────────────────────────────────

function FeedPost({ event, myReaction: initReaction, likeCount: initLikes, commentCount: initCommCount, userId }: {
  event: FeedEvent; myReaction: string | null; likeCount: number; commentCount: number; userId: string
}) {
  const [myReaction,   setMyReaction]  = useState(initReaction)
  const [likes,        setLikes]       = useState(initLikes)
  const [comments,     setComments]    = useState<Comment[]>([])
  const [commCount,    setCommCount]   = useState(initCommCount)
  const [expanded,     setExpanded]    = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [posting,      setPosting]     = useState(false)
  const [showOffer,    setShowOffer]   = useState(false)
  const [offerRaw,     setOfferRaw]    = useState('')
  const [offerDisplay, setOfferDisplay] = useState('')
  const [offerBusy,    setOfferBusy]   = useState(false)
  const [offerDone,    setOfferDone]   = useState(false)

  const bench     = Number(event.edition?.item.benchmarkPrice ?? 0)
  const offerNum  = Number(offerRaw || 0)
  const offerPct  = bench && offerNum ? ((offerNum - bench) / bench * 100) : null

  async function toggleReaction(type: string) {
    const next = myReaction === type ? null : type
    setMyReaction(next)
    setLikes(l => next ? (myReaction ? l : l + 1) : l - 1)
    await fetch(`/api/feed/${event.id}/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
  }

  async function loadAndToggleComments() {
    if (!expanded) {
      const res = await fetch(`/api/feed/${event.id}/comments`)
      if (res.ok) { const d = await res.json(); setComments(d.comments) }
    }
    setExpanded(p => !p)
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentInput.trim()) return
    setPosting(true)
    const res = await fetch(`/api/feed/${event.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: commentInput }),
    })
    if (res.ok) {
      const d = await res.json(); setComments(p => [...p, d.comment]); setCommCount(p => p + 1); setCommentInput('')
    }
    setPosting(false)
  }

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault()
    if (!event.edition || !offerRaw) return
    setOfferBusy(true)
    const res = await fetch('/api/offers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId: event.edition.id, amount: Number(offerRaw) }),
    })
    if (res.ok) { setOfferDone(true); setShowOffer(false) }
    setOfferBusy(false)
  }

  const typeInfo = TYPE_INFO[event.eventType] ?? { label: event.eventType.toUpperCase(), css: 'post' }
  const item     = event.edition?.item
  const meta     = metaLine(event)
  const verdict  = verdictLine(event)
  const impact   = impactLine(event)
  const isOwner  = event.targetUser && (event.eventType === 'sell' || event.eventType === 'accept')

  return (
    <div className="feed-post">
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: item?.imageUrl ? 12 : 0 }}>
        {event.user && (
          <Link href={`/mint/${event.user.username}`} style={{ flexShrink: 0 }}>
            <Avatar avatarUrl={event.user.avatarUrl} username={event.user.username} />
          </Link>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {event.user && (
              <Link href={`/mint/${event.user.username}`} style={{ fontWeight: 700 }}>@{event.user.username} </Link>
            )}
            <span style={{ color: 'var(--muted)' }}>{eventText(event)}</span>
          </div>
          {meta && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{meta}</div>}
        </div>
        <span className={`feed-type-pill ${typeInfo.css}`} style={{ flexShrink: 0, marginTop: 2 }}>{typeInfo.label}</span>
      </div>

      {/* Full-width image */}
      {item?.imageUrl && event.edition && (
        <Link href={`/item/${event.edition.id}`} style={{ display: 'block', marginBottom: 10 }}>
          <img src={item.imageUrl} alt={item.name ?? ''} className="feed-post-image" />
        </Link>
      )}

      {/* Asset name */}
      {item?.name && event.edition && (
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--white)' }}>{item.name}</div>
      )}

      {/* Verdict + impact */}
      {verdict && (
        <div style={{ fontSize: 12, color: verdict.colour, fontWeight: 700, marginBottom: impact ? 2 : 8 }}>{verdict.text}</div>
      )}
      {impact && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{impact}</div>
      )}

      {/* Inline offer form */}
      {showOffer && event.edition && (
        <form onSubmit={submitOffer} style={{ marginBottom: 10, padding: '12px', background: 'var(--bg3)', borderRadius: 8 }}>
          {bench > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              <span>Market value: <strong style={{ color: 'var(--white)' }}>{fmt(bench)}</strong></span>
              {offerPct !== null && (
                <span style={{ color: offerPct < -30 ? 'var(--red)' : offerPct > 0 ? 'var(--green)' : 'var(--muted)', fontWeight: 700 }}>
                  {offerPct > 0 ? '+' : ''}{offerPct.toFixed(0)}% vs market
                </span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>$</span>
              <input
                className="form-input" type="text" inputMode="numeric"
                value={offerDisplay}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  setOfferRaw(raw)
                  setOfferDisplay(raw ? Number(raw).toLocaleString() : '')
                }}
                placeholder={bench ? bench.toLocaleString() : 'Your offer'}
                style={{ paddingLeft: 22, fontSize: 13 }} autoFocus required
              />
            </div>
            <button className="btn btn-gold btn-sm" type="submit" disabled={offerBusy || !offerRaw}>{offerBusy ? '...' : 'Send'}</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowOffer(false)}>✕</button>
          </div>
        </form>
      )}
      {offerDone && <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>Offer sent!</div>}

      {/* Reactions row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {REACTIONS.map(r => (
          <button
            key={r.type}
            onClick={() => toggleReaction(r.type)}
            style={{
              fontSize: 11, fontWeight: 700,
              background: myReaction === r.type ? 'var(--bg3)' : 'transparent',
              border: `1px solid ${myReaction === r.type ? 'var(--gold)' : 'var(--border)'}`,
              color:  myReaction === r.type ? 'var(--gold)' : 'var(--muted)',
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
            }}
          >
            {r.emoji} {r.label}
          </button>
        ))}
        {likes > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', marginLeft: 2 }}>{likes} reaction{likes !== 1 ? 's' : ''}</span>}

        {/* CTAs pushed right */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button className={`feed-action-btn${expanded ? ' liked' : ''}`} onClick={loadAndToggleComments} style={{ fontSize: 11 }}>
            💬 {commCount > 0 ? commCount : ''}
          </button>
          {event.edition && userId && !offerDone && !isOwner && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowOffer(p => !p)} style={{ fontSize: 11 }}>
              {showOffer ? 'Cancel' : 'Offer'}
            </button>
          )}
          {event.edition && (
            <Link href={`/item/${event.edition.id}`} className="btn btn-gold btn-sm" style={{ fontSize: 11 }}>View →</Link>
          )}
        </div>
      </div>

      {/* Comments */}
      {expanded && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Avatar avatarUrl={c.user.avatarUrl} username={c.user.username} size={24} />
              <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)', marginRight: 6 }}>@{c.user.username}</span>
                {c.message}
              </div>
            </div>
          ))}
          {userId && (
            <div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {COMMENT_PROMPTS.map(p => (
                  <button key={p} onClick={() => setCommentInput(p)} style={{ fontSize: 11, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '3px 10px', cursor: 'pointer', color: 'var(--muted)' }}>{p}</button>
                ))}
              </div>
              <form onSubmit={postComment} style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Add a comment…" maxLength={500} style={{ flex: 1, fontSize: 13 }} />
                <button className="btn btn-gold btn-sm" type="submit" disabled={posting || !commentInput.trim()}>Post</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Quick Sell modal ─────────────────────────────────────────────────────────

function QuickSellModal({ onClose }: { onClose: () => void }) {
  const [items,    setItems]    = useState<InventoryItem[]>([])
  const [selected, setSelected] = useState('')
  const [price,    setPrice]    = useState('')
  const [busy,     setBusy]     = useState(false)
  const [done,     setDone]     = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/me/inventory').then(r => r.json()).then(d => { setItems(d.items ?? []); setLoading(false) })
  }, [])

  const item = items.find(i => i.editionId === selected)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !price) return
    setBusy(true)
    const res = await fetch(`/api/editions/${selected}/list`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: Number(price) }),
    })
    if (res.ok) setDone(true)
    setBusy(false)
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-title">Quick Sell</div>
        <div className="modal-sub">List an item from your Mint</div>
        {done ? (
          <div style={{ paddingTop: 16 }}>
            <div style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 16 }}>Listed successfully!</div>
            <button className="btn btn-ghost btn-full" onClick={onClose}>Close</button>
          </div>
        ) : loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, paddingTop: 12 }}>Loading your items…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, paddingTop: 12 }}>No items available to list.</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Select item</label>
              <select className="form-input" value={selected} onChange={e => {
                setSelected(e.target.value)
                const it = items.find(i => i.editionId === e.target.value)
                setPrice(it?.listedPrice ?? it?.lastSalePrice ?? it?.minimumBid ?? '')
              }} required>
                <option value="">Choose…</option>
                {items.map(i => <option key={i.editionId} value={i.editionId}>{i.itemName}{i.isListed ? ' (listed)' : ''}</option>)}
              </select>
            </div>
            {item && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
                <div>
                  <div style={{ fontWeight: 700 }}>{item.itemName}</div>
                  {item.lastSalePrice && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Last sale: {fmt(item.lastSalePrice)}</div>}
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Listing price (USD)</label>
              <input className="form-input" type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-gold" type="submit" disabled={busy || !selected || !price}>{busy ? 'Listing…' : 'List for sale'}</button>
              <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FeedClient({
  userId, userProfile, initialEvents, initialWatching, initialBids,
  initialAuctions, initialFriends, initialInterests,
  reactionsByEventId, myRank, totalPlayers, classStats, challenges,
}: Props) {
  const [events,        setEvents]        = useState(initialEvents)
  const [auctions,      setAuctions]      = useState(initialAuctions)
  const [filter,        setFilter]        = useState<string | null>(null)
  const [rightOpen,     setRightOpen]     = useState(false)
  const [darkMode,      setDarkMode]      = useState(true)
  const [collapsed,     setCollapsed]     = useState<Record<string, boolean>>({})
  const [showQuickSell, setShowQuickSell] = useState(false)

  // Keep refs to avoid using in sidebar poll closure
  const watching = initialWatching
  const bids     = initialBids
  const friends  = initialFriends
  void watching; void bids; void friends; void initialInterests  // unused for now

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    if (theme === 'light') setDarkMode(false)
    try { setCollapsed(JSON.parse(localStorage.getItem('feed-collapsed') ?? '{}')) } catch {}
  }, [])

  useEffect(() => {
    document.body.classList.toggle('light', !darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => { fetch('/api/me/heartbeat', { method: 'POST' }) }, [])

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch('/api/me/sidebar')
      if (!res.ok) return
      const d = await res.json()
      setAuctions(d.auctions)
    }, 30000)
    return () => clearInterval(t)
  }, [])

  function toggleSection(key: string) {
    const next = { ...collapsed, [key]: !collapsed[key] }
    setCollapsed(next)
    localStorage.setItem('feed-collapsed', JSON.stringify(next))
  }

  const visibleEvents  = events.filter(isVisible)
  const filteredEvents = dedupeEvents(
    filter
      ? visibleEvents.filter(e =>
          e.edition?.item.category === filter.toLowerCase() ||
          e.eventType === 'achievement' ||
          e.eventType === 'income' ||
          e.eventType === 'market_event'
        )
      : visibleEvents
  )

  return (
    <div className="feed-layout">
      {/* ── Main feed ─────────────────────────────── */}
      <div className="feed-main">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="page-title" style={{ marginBottom: 2 }}>Feed</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>What&apos;s happening in the economy</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {myRank > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--bg3)', borderRadius: 6, padding: '4px 10px', color: 'var(--gold)' }}>
                #{myRank} of {totalPlayers}
              </span>
            )}
            <button className="theme-toggle" onClick={() => setDarkMode(p => !p)}>{darkMode ? '☀' : '🌙'}</button>
            <button className="feed-drawer-btn" onClick={() => setRightOpen(p => !p)}>◉</button>
          </div>
        </div>

        {/* Challenge cards */}
        <ChallengeCards challenges={challenges} />

        {/* Category filter */}
        <div className="interest-chips" style={{ marginBottom: 20 }}>
          <button className={`chip${!filter ? ' active' : ''}`} onClick={() => setFilter(null)}>All</button>
          {ALL_CATEGORIES.map(cat => (
            <button key={cat} className={`chip${filter === cat.toLowerCase() ? ' active' : ''}`}
              onClick={() => setFilter(filter === cat.toLowerCase() ? null : cat.toLowerCase())}>
              {cat}
            </button>
          ))}
        </div>

        {/* Biggest Move Today */}
        <BiggestMoveToday events={visibleEvents} />

        {/* Feed */}
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
            {filter ? `No ${filter} activity yet.` : 'No activity yet. Buy something!'}
          </div>
        ) : filteredEvents.map(e => {
          if (e.eventType === 'achievement') return <AchievementCard key={e.id} event={e} />
          if (e.eventType === 'income')      return <AchievementCard key={e.id} event={e} />
          if (e.eventType === 'market_event') return <MarketCard key={e.id} event={e} />
          return (
            <FeedPost
              key={e.id} event={e} userId={userId}
              myReaction={reactionsByEventId[e.id] ?? null}
              likeCount={e.likeCount} commentCount={e.commentCount}
            />
          )
        })}
      </div>

      {/* ── Backdrop (mobile) ─────────────────── */}
      <div className={`feed-drawer-backdrop${rightOpen ? ' open' : ''}`} onClick={() => setRightOpen(false)} />

      {/* ── Right panel ───────────────────────── */}
      <div className={`feed-right${rightOpen ? ' open' : ''}`}>
        {rightOpen && (
          <button onClick={() => setRightOpen(false)} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', marginBottom: 8 }}>✕</button>
        )}

        {/* Profile */}
        <Module title="Profile" collapsed={!!collapsed['profile']} onToggle={() => toggleSection('profile')}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <Avatar avatarUrl={userProfile.avatarUrl} username={userProfile.username} size={48} />
            <div>
              <div style={{ fontWeight: 700 }}>@{userProfile.username}</div>
              {userProfile.tagline && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{userProfile.tagline}</div>}
              {myRank > 0 && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 3 }}>Rank #{myRank} of {totalPlayers}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/mint/${userProfile.username}`} className="btn btn-ghost btn-sm" style={{ flex: 1, textAlign: 'center' }}>My Mint</Link>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setShowQuickSell(true); setRightOpen(false) }}>Quick Sell</button>
          </div>
        </Module>

        {/* Class / Leaderboard */}
        <Module title="Class" collapsed={!!collapsed['class']} onToggle={() => toggleSection('class')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Players</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--white)' }}>{totalPlayers}</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Online</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="status-dot online" />
                <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--green)' }}>{classStats.onlineCount}</span>
              </div>
            </div>
          </div>
          {classStats.topPlayerUsername && (
            <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--muted)' }}>#1 player</span>
              <Link href={`/mint/${classStats.topPlayerUsername}`} style={{ fontWeight: 700, color: 'var(--gold)' }}>
                @{classStats.topPlayerUsername}
              </Link>
            </div>
          )}
          {myRank > 0 && (
            <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Your rank</span>
              <span style={{ fontWeight: 700 }}>#{myRank}</span>
            </div>
          )}
          {classStats.hotCategory && (
            <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Hot today</span>
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>🔥 {classStats.hotCategory}</span>
            </div>
          )}
        </Module>

        {/* Live Auctions */}
        <Module title="Live Auctions" collapsed={!!collapsed['auctions']} onToggle={() => toggleSection('auctions')}>
          {auctions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>No active auctions right now.</div>
          ) : auctions.map(a => (
            <div key={a.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0 }}>
                  {a.imageUrl && <img src={a.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.itemName}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Min {fmt(a.minimumBid)} · ends {timeLeft(a.endsAt)}</div>
                </div>
              </div>
              <Link href={`/auction/${a.id}`} className="btn btn-gold btn-full btn-sm" style={{ textAlign: 'center' }}>Place Bid →</Link>
            </div>
          ))}
          <Link href="/auctions" style={{ fontSize: 12, color: 'var(--gold)' }}>See all auctions →</Link>
        </Module>
      </div>

      {showQuickSell && <QuickSellModal onClose={() => setShowQuickSell(false)} />}
    </div>
  )
}
