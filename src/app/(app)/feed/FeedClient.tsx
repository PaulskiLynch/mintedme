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

interface Props {
  userId: string; userProfile: UserProfile
  initialEvents: FeedEvent[]; initialWatching: WatchItem[]; initialBids: ActiveBid[]
  initialAuctions: LiveAuction[]; initialFriends: Friend[]; initialInterests: string[]
  likedEventIds: string[]
}

const ALL_CATEGORIES = ['Cars', 'Yachts', 'Watches', 'Art', 'Fashion', 'Jets', 'Mansions', 'Collectibles', 'Businesses']

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
    default:              return e.eventType.replace(/_/g, ' ')
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

// ─── Feed post ────────────────────────────────────────────────────────────────

function FeedPost({ event, liked, likeCount: initLikes, commentCount: initCommCount, userId }: {
  event: FeedEvent; liked: boolean; likeCount: number; commentCount: number; userId: string
}) {
  const [isLiked,   setLiked]    = useState(liked)
  const [likes,     setLikes]    = useState(initLikes)
  const [comments,  setComments] = useState<Comment[]>([])
  const [commCount, setCommCount] = useState(initCommCount)
  const [expanded,  setExpanded] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [posting,   setPosting]  = useState(false)
  const [showOffer, setShowOffer] = useState(false)
  const [offerAmt,  setOfferAmt] = useState('')
  const [offerBusy, setOfferBusy] = useState(false)
  const [offerDone, setOfferDone] = useState(false)

  async function toggleLike() {
    setLiked(p => !p); setLikes(p => p + (isLiked ? -1 : 1))
    await fetch(`/api/feed/${event.id}/like`, { method: 'POST' })
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

  const item = event.edition?.item
  const refPrice = item?.referencePrice
  const isPost = event.eventType === 'post'

  return (
    <div className="feed-post">
      {/* Header row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Link href={event.user ? `/mint/${event.user.username}` : '#'}>
          <Avatar avatarUrl={event.user?.avatarUrl ?? null} username={event.user?.username ?? '?'} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Action text */}
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {event.user
              ? <Link href={`/mint/${event.user.username}`} style={{ fontWeight: 700 }}>@{event.user.username}</Link>
              : <span style={{ fontWeight: 700 }}>Someone</span>
            }{' '}
            <span style={{ color: 'var(--muted)' }}>{feedCopy(event)}</span>
          </div>

          {/* Price context row */}
          {!isPost && (event.amount || refPrice) && (
            <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              {event.amount && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>
                  Paid {fmt(event.amount)}
                </span>
              )}
              {refPrice && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Ref {fmt(refPrice)}
                </span>
              )}
            </div>
          )}

          {/* From / to counterparty */}
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

      {/* Offer done confirmation */}
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

      {/* Actions */}
      <div className="feed-post-actions">
        <button className={`feed-action-btn${isLiked ? ' liked' : ''}`} onClick={toggleLike}>♥ {likes > 0 && likes}</button>
        <button className="feed-action-btn" onClick={loadAndToggleComments}>💬 {commCount > 0 && commCount}</button>
        {event.edition && !isPost && userId && !offerDone && (
          <button className="feed-action-btn" onClick={() => setShowOffer(p => !p)}>
            {showOffer ? 'Cancel offer' : '+ Make offer'}
          </button>
        )}
        {event.edition && (
          <Link href={`/item/${event.edition.id}`} className="feed-action-btn" style={{ marginLeft: 'auto' }}>View →</Link>
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
            <form onSubmit={postComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="form-input" value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Add a comment…" maxLength={500} style={{ flex: 1, fontSize: 13 }} />
              <button className="btn btn-gold" type="submit" disabled={posting || !commentInput.trim()} style={{ fontSize: 12, padding: '0 14px' }}>Post</button>
            </form>
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
              <input className="form-input" type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} required autoFocus={!!selected} />
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

export default function FeedClient({ userId, userProfile, initialEvents, initialWatching, initialBids, initialAuctions, initialFriends, initialInterests, likedEventIds }: Props) {
  const [events,       setEvents]       = useState(initialEvents)
  const [watching,     setWatching]     = useState(initialWatching)
  const [bids,         setBids]         = useState(initialBids)
  const [auctions,     setAuctions]     = useState(initialAuctions)
  const [friends,      setFriends]      = useState(initialFriends)
  const [interests,    setInterests]    = useState<string[]>(initialInterests)
  const [filter,       setFilter]       = useState<string | null>(null)
  const [rightOpen,    setRightOpen]    = useState(false)
  const [darkMode,     setDarkMode]     = useState(true)
  const [collapsed,    setCollapsed]    = useState<Record<string, boolean>>({})
  const [showPost,     setShowPost]     = useState(false)
  const [postText,     setPostText]     = useState('')
  const [postBusy,     setPostBusy]     = useState(false)
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

  const likedSet = new Set(likedEventIds)
  const filteredEvents = filter ? events.filter(e => e.edition?.item.category === filter.toLowerCase()) : events
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="theme-toggle" onClick={() => setDarkMode(p => !p)}>{darkMode ? '☀' : '🌙'}</button>
            <button className="feed-drawer-btn" onClick={() => setRightOpen(p => !p)}>◉</button>
          </div>
        </div>

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
        ) : filteredEvents.map(e => (
          <FeedPost key={e.id} event={e} userId={userId} liked={likedSet.has(e.id)} likeCount={e.likeCount} commentCount={e.commentCount} />
        ))}
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

        {/* 2. Watching */}
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

        {/* 3. Bids */}
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

        {/* 4. Quick Actions */}
        <Module title="Quick Actions" collapsed={!!collapsed['actions']} onToggle={() => toggleSection('actions')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/studio" className="btn btn-gold btn-full" style={{ textAlign: 'center', fontSize: 13 }}>+ Craft Item</Link>
            <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }} onClick={() => { setShowQuickSell(true); setRightOpen(false) }}>Quick Sell</button>
            <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }} onClick={() => window.location.reload()}>↻ Refresh Feed</button>
          </div>
        </Module>

        {/* 5. Friends Online */}
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

        {/* 6. Interests */}
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

        {/* 7. Live Auctions */}
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
