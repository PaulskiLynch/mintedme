'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedEvent {
  id: string; eventType: string; amount: string | null; createdAt: string
  likeCount: number; commentCount: number
  metadata?: Record<string, unknown> | null
  user: { username: string; avatarUrl: string | null } | null
  targetUser: { username: string } | null
  edition: { id: string; item: { name: string; imageUrl: string | null; category: string } } | null
}
interface WatchItem { editionId: string; itemName: string; imageUrl: string | null; currentPrice: string; endsAt: string | null; auctionId: string | null }
interface ActiveBid  { auctionId: string; editionId: string; itemName: string; imageUrl: string | null; myBid: string; currentBid: string; isLeading: boolean; endsAt: string }
interface LiveAuction { id: string; editionId: string; itemName: string; imageUrl: string | null; currentBid: string; endsAt: string }
interface Friend     { id: string; username: string; avatarUrl: string | null; status: 'online' | 'idle' | 'offline' }
interface UserProfile { username: string; tagline: string | null; avatarUrl: string | null; balance: string; followersCount: number; followingCount: number }
interface Comment { id: string; message: string; createdAt: string; user: { username: string; avatarUrl: string | null } }

interface Props {
  userId: string; userProfile: UserProfile
  initialEvents: FeedEvent[]; initialWatching: WatchItem[]; initialBids: ActiveBid[]
  initialAuctions: LiveAuction[]; initialFriends: Friend[]; initialInterests: string[]
  likedEventIds: string[]
}

const ALL_CATEGORIES = ['Cars', 'Yachts', 'Watches', 'Art', 'Fashion', 'Jets', 'Mansions', 'Collectibles', 'Businesses']

function timeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'ended'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function feedCopy(e: FeedEvent): string {
  const item = e.edition?.item.name ?? 'an item'
  const amt  = e.amount ? '$' + Number(e.amount).toLocaleString() : ''
  switch (e.eventType) {
    case 'buy':           return `bought ${item}${amt ? ' for ' + amt : ''}`
    case 'sell':          return `sold ${item} to @${e.targetUser?.username ?? '?'}${amt ? ' for ' + amt : ''}`
    case 'offer':         return `offered ${amt} on ${item}`
    case 'accept':        return `accepted ${amt} for ${item}`
    case 'auction_start': return `started an auction on ${item}`
    case 'auction_end':   return `won ${item} at auction${amt ? ' for ' + amt : ''}`
    case 'create_item':   return `crafted a new item: ${item}`
    case 'post':          return String(e.metadata?.text ?? '')
    default:              return e.eventType.replace(/_/g, ' ')
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ avatarUrl, username, size = 36 }: { avatarUrl: string | null; username: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 900, color: 'var(--gold)' }}>
      {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : username[0]?.toUpperCase()}
    </div>
  )
}

function Module({ title, badge, collapsed, onToggle, children }: { title: string; badge?: React.ReactNode; collapsed: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="feed-module">
      <div className="feed-module-header" onClick={onToggle}>
        <span>{title} {badge}</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && <div className="feed-module-body">{children}</div>}
    </div>
  )
}

function FeedPost({ event, liked, likeCount: initLikeCount, commentCount: initCommentCount, userId }: {
  event: FeedEvent; liked: boolean; likeCount: number; commentCount: number; userId: string
}) {
  const [isLiked,   setLiked]   = useState(liked)
  const [likes,     setLikes]   = useState(initLikeCount)
  const [comments,  setComments] = useState<Comment[]>([])
  const [commCount, setCommCount] = useState(initCommentCount)
  const [expanded,  setExpanded] = useState(false)
  const [input,     setInput]   = useState('')
  const [posting,   setPosting]  = useState(false)

  async function toggleLike() {
    setLiked(p => !p)
    setLikes(p => p + (isLiked ? -1 : 1))
    await fetch(`/api/feed/${event.id}/like`, { method: 'POST' })
  }

  async function loadComments() {
    const res = await fetch(`/api/feed/${event.id}/comments`)
    if (res.ok) { const d = await res.json(); setComments(d.comments) }
  }

  async function toggleComments() {
    if (!expanded) await loadComments()
    setExpanded(p => !p)
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setPosting(true)
    const res = await fetch(`/api/feed/${event.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    })
    if (res.ok) {
      const d = await res.json()
      setComments(p => [...p, d.comment])
      setCommCount(p => p + 1)
      setInput('')
    }
    setPosting(false)
  }

  return (
    <div className="feed-post">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Link href={event.user ? `/mint/${event.user.username}` : '#'}>
          <Avatar avatarUrl={event.user?.avatarUrl ?? null} username={event.user?.username ?? '?'} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {event.user
              ? <Link href={`/mint/${event.user.username}`} style={{ fontWeight: 700, color: 'var(--white)' }}>@{event.user.username}</Link>
              : <span style={{ fontWeight: 700 }}>Someone</span>
            }{' '}
            <span style={{ color: 'var(--muted)' }}>{feedCopy(event)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
            {event.edition && <> · <span style={{ textTransform: 'capitalize' }}>{event.edition.item.category}</span></>}
          </div>
        </div>
        {event.edition?.item.imageUrl && (
          <Link href={`/item/${event.edition.id}`}>
            <img src={event.edition.item.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="feed-post-actions">
        <button className={`feed-action-btn${isLiked ? ' liked' : ''}`} onClick={toggleLike}>
          ♥ {likes > 0 && likes}
        </button>
        <button className="feed-action-btn" onClick={toggleComments}>
          💬 {commCount > 0 && commCount}
        </button>
        {event.edition && (
          <Link href={`/item/${event.edition.id}`} className="feed-action-btn" style={{ marginLeft: 'auto' }}>
            View item →
          </Link>
        )}
      </div>

      {/* Comments */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <Avatar avatarUrl={c.user.avatarUrl} username={c.user.username} size={24} />
              <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)', marginRight: 6 }}>@{c.user.username}</span>
                {c.message}
              </div>
            </div>
          ))}
          {userId && (
            <form onSubmit={postComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="form-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Add a comment…" maxLength={500} style={{ flex: 1, fontSize: 13, padding: '6px 10px' }} />
              <button className="btn btn-gold" type="submit" disabled={posting || !input.trim()} style={{ fontSize: 12, padding: '6px 14px' }}>Post</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FeedClient({ userId, userProfile, initialEvents, initialWatching, initialBids, initialAuctions, initialFriends, initialInterests, likedEventIds }: Props) {
  const router = useRouter()

  const [events,    setEvents]    = useState(initialEvents)
  const [watching,  setWatching]  = useState(initialWatching)
  const [bids,      setBids]      = useState(initialBids)
  const [auctions,  setAuctions]  = useState(initialAuctions)
  const [friends,   setFriends]   = useState(initialFriends)
  const [interests, setInterests] = useState<string[]>(initialInterests)
  const [filter,    setFilter]    = useState<string | null>(null)
  const [rightOpen,    setRightOpen]    = useState(false)
  const [darkMode,     setDarkMode]     = useState(true)
  const [collapsed,    setCollapsed]    = useState<Record<string, boolean>>({})
  const [showPost,     setShowPost]     = useState(false)
  const [postText,     setPostText]     = useState('')
  const [postBusy,     setPostBusy]     = useState(false)

  // Initialise theme + collapsed from localStorage (client only)
  useEffect(() => {
    const theme = localStorage.getItem('theme')
    if (theme === 'light') setDarkMode(false)
    try { setCollapsed(JSON.parse(localStorage.getItem('feed-collapsed') ?? '{}')) } catch {}
  }, [])

  useEffect(() => {
    document.body.classList.toggle('light', !darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Heartbeat on mount
  useEffect(() => { fetch('/api/me/heartbeat', { method: 'POST' }) }, [])

  // Poll sidebar every 30s
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
    const next = interests.includes(lower)
      ? interests.filter(i => i !== lower)
      : [...interests, lower]
    setInterests(next)
    await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interests: next }) })
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!postText.trim()) return
    setPostBusy(true)
    const res = await fetch('/api/feed/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const filteredEvents = filter
    ? events.filter(e => e.edition?.item.category === filter.toLowerCase())
    : events

  const outbidCount = bids.filter(b => !b.isLeading).length

  return (
    <div className="feed-layout">
      {/* ── Main feed ─────────────────────────────── */}
      <div className="feed-main">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="page-title" style={{ marginBottom: 2 }}>Feed</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>What&apos;s happening in the Mint economy</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="theme-toggle" onClick={() => setDarkMode(p => !p)} title="Toggle theme">
              {darkMode ? '☀' : '🌙'}
            </button>
            <button className="feed-drawer-btn" onClick={() => setRightOpen(p => !p)}>◉</button>
          </div>
        </div>

        {/* Create post form */}
        {showPost && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <form onSubmit={submitPost} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                className="form-input"
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder="What's happening in your Mint?"
                rows={3}
                maxLength={400}
                autoFocus
                style={{ resize: 'none', fontSize: 14 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowPost(false); setPostText('') }}>Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={postBusy || !postText.trim()}>
                  {postBusy ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category filter chips */}
        <div className="interest-chips" style={{ marginBottom: 20 }}>
          <button className={`chip${!filter ? ' active' : ''}`} onClick={() => setFilter(null)}>All</button>
          {ALL_CATEGORIES.map(cat => (
            <button key={cat} className={`chip${filter === cat.toLowerCase() ? ' active' : ''}`}
              onClick={() => setFilter(filter === cat.toLowerCase() ? null : cat.toLowerCase())}>
              {cat}
            </button>
          ))}
        </div>

        {/* Feed posts */}
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
            {filter ? `No ${filter} activity yet.` : 'No activity yet. Be the first to buy something.'}
          </div>
        ) : (
          filteredEvents.map(e => (
            <FeedPost
              key={e.id} event={e} userId={userId}
              liked={likedSet.has(e.id)} likeCount={e.likeCount} commentCount={e.commentCount}
            />
          ))
        )}
      </div>

      {/* ── Backdrop (mobile) ──────────────────────── */}
      <div className={`feed-drawer-backdrop${rightOpen ? ' open' : ''}`} onClick={() => setRightOpen(false)} />

      {/* ── Right panel ───────────────────────────── */}
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

        {/* Watching */}
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
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>${Number(w.currentPrice).toLocaleString()}{w.endsAt && ` · ${timeLeft(w.endsAt)}`}</div>
              </div>
              {w.auctionId && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>LIVE</span>}
            </Link>
          ))}
        </Module>

        {/* Active Bids */}
        <Module
          title="Your Bids"
          badge={outbidCount > 0 ? <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 900, padding: '1px 6px', marginLeft: 4 }}>{outbidCount}</span> : undefined}
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
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Your bid: ${Number(b.myBid).toLocaleString()}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: b.isLeading ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                {b.isLeading ? '★ LEAD' : 'OUTBID'}
              </span>
            </Link>
          ))}
        </Module>

        {/* Quick Actions */}
        <Module title="Quick Actions" collapsed={!!collapsed['actions']} onToggle={() => toggleSection('actions')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-gold btn-full" style={{ fontSize: 13 }}
              onClick={() => { setShowPost(true); setRightOpen(false) }}>
              + Create Post
            </button>
            <Link href={`/mint/${userProfile.username}`} className="btn btn-ghost btn-full" style={{ textAlign: 'center', fontSize: 13 }}>
              Quick Sell
            </Link>
            <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
              onClick={() => window.location.reload()}>
              ↻ Refresh Feed
            </button>
          </div>
        </Module>

        {/* Friends Online */}
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
          {friends.length > 8 && <Link href="/marketplace" style={{ fontSize: 12, color: 'var(--gold)', display: 'block', marginTop: 8 }}>See all →</Link>}
        </Module>

        {/* Interests */}
        <Module title="Your Interests" collapsed={!!collapsed['interests']} onToggle={() => toggleSection('interests')}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Click to save · filters your feed</div>
          <div className="interest-chips">
            {ALL_CATEGORIES.map(cat => (
              <button key={cat}
                className={`chip${interests.includes(cat.toLowerCase()) ? ' active' : ''}`}
                onClick={() => { toggleInterest(cat); setFilter(interests.includes(cat.toLowerCase()) ? null : cat.toLowerCase()) }}>
                {cat}
              </button>
            ))}
          </div>
        </Module>

        {/* Live Auctions Spotlight */}
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
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.itemName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>${Number(a.currentBid).toLocaleString()} · ends {timeLeft(a.endsAt)}</div>
                </div>
              </div>
              <Link href={`/auction/${a.id}`} className="btn btn-gold btn-full" style={{ fontSize: 12, textAlign: 'center' }}>Place Bid →</Link>
            </div>
          ))}
          <Link href="/auctions" style={{ fontSize: 12, color: 'var(--gold)' }}>See all auctions →</Link>
        </Module>
      </div>
    </div>
  )
}
