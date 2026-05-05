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
    item: { name: string; imageUrl: string | null; category: string; referencePrice: string | null }
  } | null
}
interface WatchItem    { editionId: string; itemName: string; imageUrl: string | null; currentPrice: string; endsAt: string | null; auctionId: string | null }
interface ActiveBid    { auctionId: string; editionId: string; itemName: string; imageUrl: string | null; myBid: string; currentBid: string; isLeading: boolean; endsAt: string }
interface LiveAuction  { id: string; editionId: string; itemName: string; imageUrl: string | null; currentBid: string; endsAt: string }
interface Friend       { id: string; username: string; avatarUrl: string | null; status: 'online' | 'idle' | 'offline' }
interface UserProfile  { username: string; tagline: string | null; avatarUrl: string | null; balance: string; followersCount: number; followingCount: number }
interface Comment      { id: string; message: string; createdAt: string; user: { username: string; avatarUrl: string | null } }
interface InventoryItem { editionId: string; itemName: string; imageUrl: string | null; isListed: boolean; listedPrice: string | null; lastSalePrice: string | null; referencePrice: string | null }
interface ClassStats   { onlineCount: number; topPlayerUsername: string | null; hotCategory: string | null }
interface ChallengeProgress { carCount: number; hasWonAuction: boolean; hasBusiness: boolean; cashOk: boolean }

interface Props {
  userId: string; userProfile: UserProfile
  initialEvents: FeedEvent[]; initialWatching: WatchItem[]; initialBids: ActiveBid[]
  initialAuctions: LiveAuction[]; initialFriends: Friend[]; initialInterests: string[]
  reactionsByEventId: Record<string, string>
  myRank: number; totalPlayers: number
  classStats: ClassStats
  challengeProgress: ChallengeProgress
}

const ALL_CATEGORIES = ['Cars', 'Yachts', 'Watches', 'Art', 'Fashion', 'Jets', 'Mansions', 'Collectibles', 'Businesses']

const REACTIONS = [
  { type: 'flex',  label: '🔥 Flex'  },
  { type: 'smart', label: '📈 Smart' },
  { type: 'risky', label: '😬 Risky' },
  { type: 'watch', label: '👀 Watch' },
]

const MARKET_SIGNALS: Record<string, string> = {
  cars:         'Cars up 8% this week · Strong collector demand',
  watches:      'Watches trending · Patek models +12%',
  art:          'Contemporary art steady · 2 new drops expected',
  yachts:       'Yachts gaining · Summer season effect',
  mansions:     'Mansion market soft · -6% this month',
  businesses:   'Businesses hot · Income assets in demand',
  jets:         'Jets stable · Ultra-HNW buyers active',
  fashion:      'Fashion drops imminent · Hype building',
  collectibles: 'Collectibles mixed · Blue-chips outperforming',
}

const COMMENT_PROMPTS = ['Good buy?', 'Overpaid?', 'Future classic?', 'Flip it!', 'Hold it!']

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

function feedCopy(e: FeedEvent): string {
  const item = e.edition?.item.name ?? 'an item'
  const amt  = e.amount ? fmt(e.amount) ?? '' : ''
  switch (e.eventType) {
    case 'buy':           return `bought ${item}${amt ? ' for ' + amt : ''}`
    case 'sell':          return `sold ${item}${amt ? ' for ' + amt : ''}`
    case 'offer':         return `offered ${amt} on ${item}`
    case 'accept':        return `accepted ${amt} for ${item}`
    case 'auction_start': return `started an auction on ${item}`
    case 'auction_end':   return `won ${item} at auction${amt ? ' for ' + amt : ''}`
    case 'create_item':   return `crafted a new item: ${item}`
    case 'post':          return String(e.metadata?.text ?? '')
    case 'achievement':
    case 'market_event':  return String(e.metadata?.title ?? e.eventType)
    default:              return e.eventType.replace(/_/g, ' ')
  }
}

function storyLine(e: FeedEvent): string | null {
  const cat = e.edition?.item.category
  const amt = e.amount ? fmt(e.amount) : null
  switch (e.eventType) {
    case 'buy':
      return `Cash ↓ ${amt ?? '?'} · ${cap(cat)} +1 · Net worth unchanged`
    case 'sell':
      return `Cash ↑ ${amt ?? '?'} · ${cap(cat)} -1 · Realised gain/loss depends on cost basis`
    case 'auction_end':
      return `Cash ↓ ${amt ?? '?'} · Won at auction · ${cap(cat)} +1`
    case 'create_item':
      return `New ${cap(cat)} item minted · Available in marketplace`
    case 'offer':
      return `${amt ?? '?'} funds reserved · Waiting on seller response`
    default:
      return null
  }
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

function ChallengeCards({ progress }: { progress: ChallengeProgress }) {
  const challenges = [
    { icon: '🏎', label: 'Own 3 cars',       done: progress.carCount >= 3,      progress: `${progress.carCount}/3`   },
    { icon: '🏆', label: 'Win an auction',    done: progress.hasWonAuction,      progress: progress.hasWonAuction ? '✓' : '—' },
    { icon: '💰', label: '$500k cash',        done: progress.cashOk,             progress: progress.cashOk ? '✓' : '—'           },
    { icon: '🏢', label: 'Own a business',    done: progress.hasBusiness,        progress: progress.hasBusiness ? '✓' : '—'      },
    { icon: '🔄', label: 'Flip for profit',   done: false,                       progress: '—'                         },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>Challenges</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {challenges.map(c => (
          <div key={c.label} style={{
            flexShrink: 0, background: c.done ? '#1e2a10' : 'var(--bg2)', border: `1px solid ${c.done ? 'var(--green)' : 'var(--border)'}`,
            borderRadius: 10, padding: '10px 14px', minWidth: 120, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.done ? 'var(--green)' : 'var(--white)', marginBottom: 4, lineHeight: 1.3 }}>{c.label}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: c.done ? 'var(--green)' : 'var(--muted)' }}>{c.progress}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Achievement / market event card ─────────────────────────────────────────

function AchievementCard({ event }: { event: FeedEvent }) {
  const icon  = String(event.metadata?.icon  ?? '🏆')
  const title = String(event.metadata?.title ?? event.eventType)
  const desc  = String(event.metadata?.description ?? '')
  const rankBefore = event.metadata?.rankBefore as number | undefined
  const rankAfter  = event.metadata?.rankAfter  as number | undefined

  const isMarket = event.eventType === 'market_event'
  const border   = isMarket ? 'var(--red)' : 'var(--gold)'
  const bg       = isMarket ? '#1a0a0a' : '#1a1500'

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 26, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.4 }}>{title}</div>
          {desc && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{desc}</div>}
          {rankBefore !== undefined && rankAfter !== undefined && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 11, background: 'var(--bg3)', borderRadius: 4, padding: '2px 8px', color: 'var(--muted)' }}>
                Rank #{rankBefore} → <span style={{ color: 'var(--gold)', fontWeight: 800 }}>#{rankAfter}</span>
              </span>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Feed post ────────────────────────────────────────────────────────────────

function FeedPost({ event, myReaction: initReaction, likeCount: initLikes, commentCount: initCommCount, userId }: {
  event: FeedEvent; myReaction: string | null; likeCount: number; commentCount: number; userId: string
}) {
  const [myReaction, setMyReaction] = useState<string | null>(initReaction)
  const [likes,      setLikes]      = useState(initLikes)
  const [comments,   setComments]   = useState<Comment[]>([])
  const [commCount,  setCommCount]  = useState(initCommCount)
  const [expanded,   setExpanded]   = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [posting,    setPosting]    = useState(false)
  const [showOffer,  setShowOffer]  = useState(false)
  const [offerAmt,   setOfferAmt]   = useState('')
  const [offerBusy,  setOfferBusy]  = useState(false)
  const [offerDone,  setOfferDone]  = useState(false)

  async function react(type: string) {
    const prev = myReaction
    const isSame = prev === type
    setMyReaction(isSame ? null : type)
    setLikes(l => l + (isSame ? -1 : prev ? 0 : 1))
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
    if (!event.edition || !offerAmt) return
    setOfferBusy(true)
    const res = await fetch('/api/offers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId: event.edition.id, amount: Number(offerAmt) }),
    })
    if (res.ok) { setOfferDone(true); setShowOffer(false) }
    setOfferBusy(false)
  }

  const item      = event.edition?.item
  const refPrice  = item?.referencePrice
  const isPost    = event.eventType === 'post'
  const story     = storyLine(event)
  const signal    = item?.category ? MARKET_SIGNALS[item.category] : null

  return (
    <div className="feed-post">
      {/* Header row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Link href={event.user ? `/mint/${event.user.username}` : '#'}>
          <Avatar avatarUrl={event.user?.avatarUrl ?? null} username={event.user?.username ?? '?'} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {event.user
              ? <Link href={`/mint/${event.user.username}`} style={{ fontWeight: 700 }}>@{event.user.username}</Link>
              : <span style={{ fontWeight: 700 }}>Someone</span>
            }{' '}
            <span style={{ color: 'var(--muted)' }}>{feedCopy(event)}</span>
          </div>

          {/* Price context */}
          {!isPost && (event.amount || refPrice) && (
            <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              {event.amount && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>Paid {fmt(event.amount)}</span>}
              {refPrice     && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Ref {fmt(refPrice)}</span>}
            </div>
          )}

          {/* Counterparty */}
          {event.targetUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              <Avatar avatarUrl={event.targetUser.avatarUrl} username={event.targetUser.username} size={18} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {event.eventType === 'buy' ? 'from' : 'to'}{' '}
                <Link href={`/mint/${event.targetUser.username}`} style={{ fontWeight: 700, color: 'var(--white)' }}>
                  @{event.targetUser.username}
                </Link>
              </span>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
            {item && <> · <span style={{ textTransform: 'capitalize' }}>{item.category}</span></>}
          </div>
        </div>

        {/* Thumbnail */}
        {item?.imageUrl && event.edition && (
          <Link href={`/item/${event.edition.id}`}>
            <img src={item.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          </Link>
        )}
      </div>

      {/* Story line */}
      {story && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, borderLeft: '3px solid var(--gold)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Portfolio impact</div>
          <div style={{ fontSize: 12, color: 'var(--white)' }}>{story}</div>
          {signal && (
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
              📊 Market signal: {signal}
            </div>
          )}
        </div>
      )}

      {/* Offer done */}
      {offerDone && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>Offer sent!</div>}

      {/* Inline offer form */}
      {showOffer && event.edition && (
        <form onSubmit={submitOffer} style={{ display: 'flex', gap: 8, marginTop: 10, padding: '10px', background: 'var(--bg3)', borderRadius: 8 }}>
          <input
            className="form-input" type="number" min="1" step="1"
            value={offerAmt} onChange={e => setOfferAmt(e.target.value)}
            placeholder={refPrice ? `Ref ${fmt(refPrice)}` : 'Your offer $'}
            style={{ flex: 1, fontSize: 13 }} autoFocus required
          />
          <button className="btn btn-gold" type="submit" disabled={offerBusy || !offerAmt} style={{ fontSize: 12, padding: '0 14px' }}>
            {offerBusy ? '...' : 'Send'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setShowOffer(false)} style={{ fontSize: 12, padding: '0 10px' }}>✕</button>
        </form>
      )}

      {/* Reactions row */}
      <div className="feed-post-actions">
        {REACTIONS.map(r => (
          <button
            key={r.type}
            className={`feed-action-btn${myReaction === r.type ? ' liked' : ''}`}
            onClick={() => react(r.type)}
            style={{ fontSize: 12 }}
          >
            {r.label}
          </button>
        ))}
        <button className={`feed-action-btn${expanded ? ' liked' : ''}`} onClick={loadAndToggleComments} style={{ fontSize: 12 }}>
          💬 {commCount > 0 && commCount}
        </button>
        {likes > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', marginLeft: 4 }}>{likes}</span>}
        {event.edition && !isPost && userId && !offerDone && (
          <button className="feed-action-btn" onClick={() => setShowOffer(p => !p)} style={{ marginLeft: 'auto', fontSize: 12 }}>
            {showOffer ? 'Cancel' : '+ Offer'}
          </button>
        )}
        {event.edition && (
          <Link href={`/item/${event.edition.id}`} className="feed-action-btn" style={{ fontSize: 12, ...(event.edition && !isPost ? {} : { marginLeft: 'auto' }) }}>View →</Link>
        )}
      </div>

      {/* Comments */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <Avatar avatarUrl={c.user.avatarUrl} username={c.user.username} size={24} />
              <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)', marginRight: 6 }}>@{c.user.username}</span>
                {c.message}
              </div>
            </div>
          ))}
          {userId && (
            <div>
              {/* Quick comment prompts */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {COMMENT_PROMPTS.map(p => (
                  <button key={p} onClick={() => setCommentInput(p)} style={{ fontSize: 11, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '3px 10px', cursor: 'pointer', color: 'var(--muted)' }}>{p}</button>
                ))}
              </div>
              <form onSubmit={postComment} style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Add a comment…" maxLength={500} style={{ flex: 1, fontSize: 13 }} />
                <button className="btn btn-gold" type="submit" disabled={posting || !commentInput.trim()} style={{ fontSize: 12, padding: '0 14px' }}>Post</button>
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
                setPrice(it?.listedPrice ?? it?.lastSalePrice ?? it?.referencePrice ?? '')
              }} required>
                <option value="">Choose…</option>
                {items.map(i => (
                  <option key={i.editionId} value={i.editionId}>
                    {i.itemName}{i.isListed ? ' (listed)' : ''}
                  </option>
                ))}
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
  reactionsByEventId, myRank, totalPlayers, classStats, challengeProgress,
}: Props) {
  const [events,        setEvents]        = useState(initialEvents)
  const [watching,      setWatching]      = useState(initialWatching)
  const [bids,          setBids]          = useState(initialBids)
  const [auctions,      setAuctions]      = useState(initialAuctions)
  const [friends,       setFriends]       = useState(initialFriends)
  const [interests,     setInterests]     = useState<string[]>(initialInterests)
  const [filter,        setFilter]        = useState<string | null>(null)
  const [rightOpen,     setRightOpen]     = useState(false)
  const [darkMode,      setDarkMode]      = useState(true)
  const [collapsed,     setCollapsed]     = useState<Record<string, boolean>>({})
  const [showPost,      setShowPost]      = useState(false)
  const [postText,      setPostText]      = useState('')
  const [postBusy,      setPostBusy]      = useState(false)
  const [showQuickSell, setShowQuickSell] = useState(false)

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
      setWatching(d.watching); setBids(d.bids); setAuctions(d.auctions); setFriends(d.friends)
    }, 30000)
    return () => clearInterval(t)
  }, [])

  function toggleSection(key: string) {
    const next = { ...collapsed, [key]: !collapsed[key] }
    setCollapsed(next)
    localStorage.setItem('feed-collapsed', JSON.stringify(next))
  }

  async function toggleInterest(cat: string) {
    const lower = cat.toLowerCase()
    const next = interests.includes(lower) ? interests.filter(i => i !== lower) : [...interests, lower]
    setInterests(next)
    await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interests: next }) })
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!postText.trim()) return
    setPostBusy(true)
    const res = await fetch('/api/feed/post', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: postText }),
    })
    if (res.ok) {
      const d = await res.json()
      setEvents(prev => [d.event, ...prev])
      setPostText(''); setShowPost(false)
    }
    setPostBusy(false)
  }

  const filteredEvents = filter ? events.filter(e => e.edition?.item.category === filter.toLowerCase() || e.eventType === 'achievement' || e.eventType === 'market_event') : events
  const outbidCount    = bids.filter(b => !b.isLeading).length

  return (
    <div className="feed-layout">
      {/* ── Main feed ─────────────────────────────── */}
      <div className="feed-main">
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
        <ChallengeCards progress={challengeProgress} />

        {/* Create post form */}
        {showPost && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <form onSubmit={submitPost} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea className="form-input" value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="What's happening in your Mint?" rows={3} maxLength={400} autoFocus style={{ resize: 'none', fontSize: 14 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowPost(false); setPostText('') }}>Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={postBusy || !postText.trim()}>{postBusy ? 'Posting…' : 'Post'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Category chips */}
        <div className="interest-chips" style={{ marginBottom: 20 }}>
          <button className={`chip${!filter ? ' active' : ''}`} onClick={() => setFilter(null)}>All</button>
          {ALL_CATEGORIES.map(cat => (
            <button key={cat} className={`chip${filter === cat.toLowerCase() ? ' active' : ''}`}
              onClick={() => setFilter(filter === cat.toLowerCase() ? null : cat.toLowerCase())}>
              {cat}
            </button>
          ))}
        </div>

        {/* Feed */}
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
            {filter ? `No ${filter} activity yet.` : 'No activity yet. Buy something!'}
          </div>
        ) : filteredEvents.map(e => {
          if (e.eventType === 'achievement' || e.eventType === 'market_event') {
            return <AchievementCard key={e.id} event={e} />
          }
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

        {/* 1. Profile */}
        <Module title="Profile" collapsed={!!collapsed['profile']} onToggle={() => toggleSection('profile')}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <Avatar avatarUrl={userProfile.avatarUrl} username={userProfile.username} size={48} />
            <div>
              <div style={{ fontWeight: 700 }}>@{userProfile.username}</div>
              {userProfile.tagline && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{userProfile.tagline}</div>}
              {myRank > 0 && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 3 }}>Rank #{myRank} · {totalPlayers} players</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12 }}>
            <span><strong>{userProfile.followersCount}</strong> <span style={{ color: 'var(--muted)' }}>followers</span></span>
            <span><strong>{userProfile.followingCount}</strong> <span style={{ color: 'var(--muted)' }}>following</span></span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/mint/${userProfile.username}`} className="btn btn-ghost" style={{ fontSize: 12, flex: 1, textAlign: 'center' }}>My Mint</Link>
            <Link href="/settings" className="btn btn-ghost" style={{ fontSize: 12, flex: 1, textAlign: 'center' }}>Edit Profile</Link>
          </div>
        </Module>

        {/* 2. Class context */}
        <Module title="Class" collapsed={!!collapsed['class']} onToggle={() => toggleSection('class')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Players</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--white)' }}>{totalPlayers}</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Online</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="status-dot online" />
                <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--green)' }}>{classStats.onlineCount}</span>
              </div>
            </div>
          </div>
          {classStats.topPlayerUsername && (
            <div style={{ marginTop: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Top player</span>
              <Link href={`/mint/${classStats.topPlayerUsername}`} style={{ fontWeight: 700, color: 'var(--gold)' }}>
                @{classStats.topPlayerUsername}
              </Link>
            </div>
          )}
          {classStats.hotCategory && (
            <div style={{ marginTop: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Hot category</span>
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>🔥 {classStats.hotCategory}</span>
            </div>
          )}
        </Module>

        {/* 3. Watching */}
        <Module title="Watching" collapsed={!!collapsed['watching']} onToggle={() => toggleSection('watching')}>
          {watching.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nothing watched yet.</div>
          ) : watching.map(w => (
            <Link key={w.editionId} href={w.auctionId ? `/auction/${w.auctionId}` : `/item/${w.editionId}`}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0 }}>
                {w.imageUrl && <img src={w.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.itemName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(w.currentPrice)}{w.endsAt && ` · ${timeLeft(w.endsAt)}`}</div>
              </div>
              {w.auctionId && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>LIVE</span>}
            </Link>
          ))}
        </Module>

        {/* 4. Bids */}
        <Module
          title="Your Bids"
          badge={outbidCount > 0 ? <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 900, padding: '1px 6px', marginLeft: 6 }}>{outbidCount}</span> : undefined}
          collapsed={!!collapsed['bids']} onToggle={() => toggleSection('bids')}>
          {bids.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>No active bids.</div>
          ) : bids.map(b => (
            <Link key={b.auctionId} href={`/auction/${b.auctionId}`}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0 }}>
                {b.imageUrl && <img src={b.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.itemName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Your bid: {fmt(b.myBid)}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: b.isLeading ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                {b.isLeading ? '★ LEAD' : 'OUTBID'}
              </span>
            </Link>
          ))}
        </Module>

        {/* 5. Quick Actions */}
        <Module title="Quick Actions" collapsed={!!collapsed['actions']} onToggle={() => toggleSection('actions')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/studio" className="btn btn-gold btn-full" style={{ textAlign: 'center', fontSize: 13 }}>+ Craft Item</Link>
            <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }} onClick={() => { setShowQuickSell(true); setRightOpen(false) }}>Quick Sell</button>
            <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }} onClick={() => window.location.reload()}>↻ Refresh Feed</button>
          </div>
        </Module>

        {/* 6. Friends Online */}
        <Module title="Following" collapsed={!!collapsed['friends']} onToggle={() => toggleSection('friends')}>
          {friends.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Not following anyone yet.</div>
          ) : friends.slice(0, 8).map(f => (
            <Link key={f.id} href={`/mint/${f.username}`}
              style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
              <Avatar avatarUrl={f.avatarUrl} username={f.username} size={28} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>@{f.username}</span>
              <span className={`status-dot ${f.status}`} />
            </Link>
          ))}
          {friends.length > 8 && <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8 }}>+{friends.length - 8} more</div>}
        </Module>

        {/* 7. Interests */}
        <Module title="Your Interests" collapsed={!!collapsed['interests']} onToggle={() => toggleSection('interests')}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Tap to save · filters your feed</div>
          <div className="interest-chips">
            {ALL_CATEGORIES.map(cat => (
              <button key={cat}
                className={`chip${interests.includes(cat.toLowerCase()) ? ' active' : ''}`}
                onClick={() => { toggleInterest(cat); setFilter(filter === cat.toLowerCase() ? null : cat.toLowerCase()) }}>
                {cat}
              </button>
            ))}
          </div>
        </Module>

        {/* 8. Live Auctions */}
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
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.itemName}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(a.currentBid)} · ends {timeLeft(a.endsAt)}</div>
                </div>
              </div>
              <Link href={`/auction/${a.id}`} className="btn btn-gold btn-full" style={{ fontSize: 12, textAlign: 'center' }}>Place Bid →</Link>
            </div>
          ))}
          <Link href="/auctions" style={{ fontSize: 12, color: 'var(--gold)' }}>See all auctions →</Link>
        </Module>
      </div>

      {/* Quick Sell modal */}
      {showQuickSell && <QuickSellModal onClose={() => setShowQuickSell(false)} />}
    </div>
  )
}
