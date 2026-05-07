'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface Member {
  userId: string; username: string; avatarUrl: string | null
  balance: string; role: string; joinedAt: string
}

interface Props {
  slug: string; name: string; description: string | null
  joinType: string; inviteCode: string | null
  maxMembers: number | null; memberCount: number
  isMember: boolean; myRole: string | null
  userId: string
  leaderboard: Member[]
  initialEvents: FeedEvent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
}

function fmt(n: string | number | null | undefined) {
  if (!n) return null
  const v = Number(n)
  if (isNaN(v) || v === 0) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toLocaleString()}`
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

// ─── Feed post ────────────────────────────────────────────────────────────────

function FeedPost({ e }: { e: FeedEvent }) {
  const info = TYPE_INFO[e.eventType] ?? { label: e.eventType.toUpperCase(), css: 'post' }
  const editionHref = e.edition ? `/item/${e.edition.id}` : null

  return (
    <div className="feed-post">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <Link href={`/mint/${e.user?.username ?? ''}`} style={{ flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {e.user?.avatarUrl
              ? <img src={e.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 800 }}>
                  {e.user?.username?.[0]?.toUpperCase() ?? '?'}
                </span>
            }
          </div>
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: username + type pill + text */}
          <div style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 4 }}>
            <Link href={`/mint/${e.user?.username ?? ''}`} style={{ fontWeight: 800, color: 'var(--white)', marginRight: 4 }}>
              @{e.user?.username ?? 'unknown'}
            </Link>
            <span className={`type-pill type-pill--${info.css}`} style={{ marginRight: 6 }}>{info.label}</span>
            <span style={{ color: 'var(--muted)' }}>
              {e.edition
                ? <>
                    {eventText(e).split(e.edition.item.name)[0]}
                    {editionHref
                      ? <Link href={editionHref} style={{ color: 'var(--white)', fontWeight: 700 }}>{e.edition.item.name}</Link>
                      : <span style={{ fontWeight: 700, color: 'var(--white)' }}>{e.edition.item.name}</span>
                    }
                    {eventText(e).split(e.edition.item.name)[1]}
                  </>
                : eventText(e)
              }
            </span>
          </div>

          {/* Meta line */}
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {e.edition?.item.category && <span>{cap(e.edition.item.category)}</span>}
            <span>{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</span>
            {e.targetUser && <span>with @{e.targetUser.username}</span>}
          </div>
        </div>

        {/* Thumbnail */}
        {e.edition?.item.imageUrl && (
          <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
            <img src={e.edition.item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Join form (for invite_only) ──────────────────────────────────────────────

function JoinForm({ slug, joinType, onJoined }: { slug: string; joinType: string; onJoined: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function join() {
    setError(null)
    setLoading(true)
    const body = joinType === 'invite_only' ? { inviteCode: code } : {}
    try {
      const res = await fetch(`/api/groups/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); setLoading(false); return }
      onJoined()
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      {joinType === 'invite_only' && (
        <input
          className="form-input"
          placeholder="Invite code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          style={{ maxWidth: 180, letterSpacing: '0.1em', fontWeight: 700 }}
          maxLength={10}
        />
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}
      <button className="btn btn-primary" onClick={join} disabled={loading || (joinType === 'invite_only' && !code)}>
        {loading ? 'Joining...' : 'Join Group'}
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function GroupClient({
  slug, name, description, joinType, inviteCode,
  maxMembers, memberCount, isMember, myRole, userId,
  leaderboard, initialEvents,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [joined, setJoined] = useState(isMember)
  const [copied, setCopied] = useState(false)

  async function leave() {
    setLeaving(true)
    setLeaveError(null)
    try {
      const res = await fetch(`/api/groups/${slug}/leave`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setLeaveError(data.error ?? 'Failed'); setLeaving(false); return }
      if (data.deleted) {
        startTransition(() => router.push('/groups'))
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      setLeaveError('Something went wrong')
      setLeaving(false)
    }
  }

  function copyInvite() {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const myRank = leaderboard.findIndex(m => m.userId === userId) + 1

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--white)' }}>{name}</h1>
              {joinType === 'invite_only' && <span style={{ fontSize: 12, color: 'var(--muted)' }}>🔒</span>}
            </div>
            {description && <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)', maxWidth: 500 }}>{description}</p>}
            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12 }}>
              <span><strong style={{ color: 'var(--white)' }}>{memberCount}</strong> member{memberCount !== 1 ? 's' : ''}</span>
              {maxMembers && <span>· max {maxMembers}</span>}
              {joined && myRank > 0 && (
                <span>· You&apos;re <strong style={{ color: 'var(--gold)' }}>#{myRank}</strong> in this group</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            {joined ? (
              <>
                {inviteCode && (
                  <button
                    onClick={copyInvite}
                    className="btn btn-outline"
                    style={{ fontSize: 12 }}
                  >
                    {copied ? '✓ Copied!' : '🔗 Copy Invite Code'}
                  </button>
                )}
                <button
                  onClick={leave}
                  disabled={leaving}
                  style={{
                    background: 'none', border: 'none', color: 'var(--muted)',
                    fontSize: 12, cursor: 'pointer', fontWeight: 600, padding: '4px 0',
                  }}
                >
                  {leaving ? 'Leaving...' : myRole === 'owner' ? 'Leave / Dissolve' : 'Leave group'}
                </button>
                {leaveError && <div style={{ fontSize: 12, color: 'var(--red)' }}>{leaveError}</div>}
              </>
            ) : (
              <JoinForm
                slug={slug}
                joinType={joinType}
                onJoined={() => { setJoined(true); startTransition(() => router.refresh()) }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout: feed + leaderboard */}
      <div className="feed-layout">
        {/* Feed */}
        <div className="feed-main">
          {!joined ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
              Join this group to see member activity.
            </div>
          ) : initialEvents.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
              No activity yet — be the first to make a move.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {initialEvents.map(e => <FeedPost key={e.id} e={e} />)}
            </div>
          )}
        </div>

        {/* Leaderboard sidebar */}
        <aside className="feed-right">
          <div className="panel">
            <div className="panel-title">Group Leaderboard</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {leaderboard.map((m, i) => (
                <Link
                  key={m.userId}
                  href={`/mint/${m.username}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', textDecoration: 'none', color: 'inherit',
                    borderBottom: i < leaderboard.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{
                    width: 22, textAlign: 'center', fontSize: 12, fontWeight: 900,
                    color: i === 0 ? 'var(--gold)' : i === 1 ? '#b0b8c8' : i === 2 ? '#c8935a' : 'var(--muted)',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>

                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800 }}>{m.username[0]?.toUpperCase()}</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: m.userId === userId ? 800 : 600,
                      color: m.userId === userId ? 'var(--gold)' : 'var(--white)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      @{m.username}
                      {m.role === 'owner' && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>owner</span>}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', flexShrink: 0 }}>
                    {fmt(m.balance) ?? '$0'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
