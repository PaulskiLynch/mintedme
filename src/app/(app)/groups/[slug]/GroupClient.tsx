'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useTranslations } from 'next-intl'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  userId: string; username: string; avatarUrl: string | null
  balance: string; role: string; joinedAt: string; weeklyPct: number
}

interface ChatMessage {
  id: string; content: string; createdAt: string
  user: { username: string; avatarUrl: string | null }
}

interface Props {
  slug: string; name: string; description: string | null; avatarUrl: string | null
  joinType: string; inviteCode: string | null
  maxMembers: number | null; memberCount: number
  isMember: boolean; isOwner: boolean
  userId: string; myUsername: string; myAvatarUrl: string | null
  leaderboard: Member[]
  stats: { totalNetWorth: number; avgBalance: number }
  initialMessages: ChatMessage[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | string) {
  const v = Number(n)
  if (isNaN(v)) return '$0'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toLocaleString()}`
}

// ─── Invite panel ─────────────────────────────────────────────────────────────

function InvitePanel({ slug }: { slug: string }) {
  const t = useTranslations('groups')
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<{ id: string; username: string; avatarUrl: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState<Record<string, 'inviting' | 'done' | 'error'>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(timerRef.current!)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/groups/${slug}/invite?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setLoading(false)
    }, 300)
  }, [query, slug])

  async function invite(userId: string, username: string) {
    setStatus(s => ({ ...s, [userId]: 'inviting' }))
    const res = await fetch(`/api/groups/${slug}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    setStatus(s => ({ ...s, [userId]: res.ok ? 'done' : 'error' }))
    if (res.ok) setResults(r => r.filter(u => u.id !== userId))
  }

  return (
    <div style={{ marginTop: 12 }}>
      <input
        className="form-input"
        placeholder="Search username..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ maxWidth: '100%', marginBottom: 8 }}
      />
      {loading && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('searching')}</div>}
      {results.map(u => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {u.avatarUrl
              ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>{u.username[0]?.toUpperCase()}</span>
            }
          </div>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>@{u.username}</span>
          <button
            onClick={() => invite(u.id, u.username)}
            disabled={!!status[u.id]}
            style={{
              background: status[u.id] === 'done' ? 'var(--bg3)' : 'var(--gold)',
              color: status[u.id] === 'done' ? 'var(--muted)' : '#0d0d0d',
              border: 'none', borderRadius: 6, padding: '4px 12px',
              fontSize: 12, fontWeight: 800, cursor: status[u.id] ? 'default' : 'pointer',
            }}
          >
            {status[u.id] === 'inviting' ? '...'
              : status[u.id] === 'done'     ? t('added')
              : status[u.id] === 'error'    ? t('failed')
              : t('invite')}
          </button>
        </div>
      ))}
      {query.length >= 2 && !loading && results.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('noUsersFound')}</div>
      )}
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ slug, myUsername, myAvatarUrl, initialMessages }: {
  slug: string; myUsername: string; myAvatarUrl: string | null
  initialMessages: ChatMessage[]
}) {
  const t = useTranslations('groups')
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [draft, setDraft]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(async () => {
      const res  = await fetch(`/api/groups/${slug}/messages`)
      const data = await res.json()
      if (Array.isArray(data)) setMessages(data)
    }, 10_000)
    return () => clearInterval(id)
  }, [slug])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    const optimistic: ChatMessage = {
      id: Date.now().toString(),
      content: draft.trim(),
      createdAt: new Date().toISOString(),
      user: { username: myUsername, avatarUrl: myAvatarUrl },
    }
    setMessages(m => [optimistic, ...m])
    setDraft('')
    const res  = await fetch(`/api/groups/${slug}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: optimistic.content }),
    })
    if (res.ok) {
      const saved = await res.json()
      setMessages(m => m.map(msg => msg.id === optimistic.id ? saved : msg))
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {t('noMessages')}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <Link href={`/mint/${m.user.username}`} style={{ flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {m.user.avatarUrl
                  ? <img src={m.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)' }}>{m.user.username[0]?.toUpperCase()}</span>
                }
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                <Link href={`/mint/${m.user.username}`} style={{ fontSize: 12, fontWeight: 800, color: m.user.username === myUsername ? 'var(--gold)' : 'var(--white)' }}>
                  @{m.user.username}
                </Link>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.5, wordBreak: 'break-word' }}>{m.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <input
          className="form-input"
          placeholder={t('messagePlaceholder')}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          maxLength={1000}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()} style={{ flexShrink: 0 }}>
          {t('sendMessage')}
        </button>
      </form>
    </div>
  )
}

// ─── Join form ────────────────────────────────────────────────────────────────

function JoinForm({ slug, joinType, onJoined }: { slug: string; joinType: string; onJoined: () => void }) {
  const t = useTranslations('groups')
  const [code, setCode]   = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function join() {
    setError(null); setLoading(true)
    const body = joinType === 'invite_only' ? { inviteCode: code } : {}
    const res  = await fetch(`/api/groups/${slug}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setLoading(false); return }
    onJoined()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      {joinType === 'invite_only' && (
        <input
          className="form-input"
          placeholder={t('inviteCode')}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          style={{ maxWidth: 180, letterSpacing: '0.1em', fontWeight: 700 }}
          maxLength={10}
        />
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}
      <button className="btn btn-primary" onClick={join} disabled={loading || (joinType === 'invite_only' && !code)}>
        {loading ? t('joining') : t('joinGroup')}
      </button>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function GroupClient({
  slug, name, description, avatarUrl, joinType, inviteCode,
  maxMembers, memberCount, isMember, isOwner,
  userId, myUsername, myAvatarUrl,
  leaderboard, stats, initialMessages,
}: Props) {
  const t = useTranslations('groups')
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [joined, setJoined]       = useState(isMember)
  const [leaving, setLeaving]     = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'members' | 'chat'>('leaderboard')

  const myRank = leaderboard.findIndex(m => m.userId === userId) + 1

  async function leave() {
    setLeaving(true); setLeaveError(null)
    const res  = await fetch(`/api/groups/${slug}/leave`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setLeaveError(data.error ?? 'Failed'); setLeaving(false); return }
    if (data.deleted) startTransition(() => router.push('/groups'))
    else              startTransition(() => router.refresh())
  }

  function copyCode() {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
    borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
    color: active ? 'var(--gold)' : 'var(--muted)',
    fontWeight: active ? 700 : 600, fontSize: 13,
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: -1,
  })

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {avatarUrl && (
              <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--white)' }}>{name}</h1>
                {joinType === 'invite_only' && <span style={{ fontSize: 13, color: 'var(--muted)' }}>🔒</span>}
              </div>
              {description && <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)' }}>{description}</p>}
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12 }}>
                <span>{t('memberCount', { n: memberCount })}</span>
                {maxMembers && <span>{t('maxMembers', { n: maxMembers })}</span>}
                {joined && myRank > 0 && <span>{t('yourRankDisplay', { n: myRank })}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            {joined ? (
              <>
                {inviteCode && (
                  <button onClick={copyCode} className="btn btn-outline" style={{ fontSize: 12 }}>
                    {copied ? t('copied') : t('copyInviteCode')}
                  </button>
                )}
                <button
                  onClick={leave} disabled={leaving}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}
                >
                  {leaving ? t('leaving') : isOwner ? t('leaveDissolve') : t('leaveGroup')}
                </button>
                {leaveError && <div style={{ fontSize: 12, color: 'var(--red)' }}>{leaveError}</div>}
              </>
            ) : (
              <JoinForm slug={slug} joinType={joinType} onJoined={() => { setJoined(true); startTransition(() => router.refresh()) }} />
            )}
          </div>
        </div>
      </div>

      {/* ── Stats panel ── */}
      {joined && (
        <div className="stats-row" style={{ marginBottom: 28 }}>
          <div className="stat-box">
            <div className="stat-label">{t('statNetWorth')}</div>
            <div className="stat-value">{fmt(stats.totalNetWorth)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t('statAvgBalance')}</div>
            <div className="stat-value">{fmt(stats.avgBalance)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t('statMembers')}</div>
            <div className="stat-value">{memberCount}{maxMembers ? ` / ${maxMembers}` : ''}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">{t('statYourRank')}</div>
            <div className="stat-value" style={{ color: 'var(--gold)' }}>#{myRank > 0 ? myRank : '—'}</div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      {joined ? (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            <button style={tabStyle(activeTab === 'leaderboard')} onClick={() => setActiveTab('leaderboard')}>{t('tabLeaderboard')}</button>
            <button style={tabStyle(activeTab === 'members')}     onClick={() => setActiveTab('members')}>{t('tabMembers')}</button>
            <button style={tabStyle(activeTab === 'chat')}        onClick={() => setActiveTab('chat')}>{t('tabChat')}</button>
          </div>

          {/* Leaderboard tab */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {leaderboard.map((m, i) => (
                <Link
                  key={m.userId}
                  href={`/mint/${m.username}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', background: 'var(--bg2)',
                    border: `1px solid ${m.userId === userId ? 'rgba(200,169,110,0.4)' : 'var(--border)'}`,
                    borderRadius: 8, textDecoration: 'none', color: 'inherit', marginBottom: 4,
                  }}
                >
                  <span style={{
                    width: 24, textAlign: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0,
                    color: i === 0 ? 'var(--gold)' : i === 1 ? '#b0b8c8' : i === 2 ? '#c8935a' : 'var(--muted)',
                  }}>
                    {i + 1}
                  </span>

                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{m.username[0]?.toUpperCase()}</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: m.userId === userId ? 'var(--gold)' : 'var(--white)',
                    }}>
                      @{m.username}
                      {m.role === 'owner' && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>{t('roleOwner')}</span>}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--white)' }}>{fmt(m.balance)}</div>
                    {m.weeklyPct !== 0 && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: m.weeklyPct > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {m.weeklyPct > 0
                          ? t('weeklyPctPos', { pct: m.weeklyPct })
                          : t('weeklyPct', { pct: m.weeklyPct })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Members tab */}
          {activeTab === 'members' && (
            <div>
              {isOwner && (
                <div className="panel" style={{ marginBottom: 20 }}>
                  <div className="panel-title">{t('inviteMember')}</div>
                  <InvitePanel slug={slug} />
                  {inviteCode && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>{t('inviteCodeLabel')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.15em', color: 'var(--gold)' }}>{inviteCode}</code>
                        <button onClick={copyCode} className="btn btn-outline" style={{ fontSize: 11, padding: '3px 10px' }}>
                          {copied ? t('copiedShort') : t('copy')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {leaderboard.map(m => (
                  <div key={m.userId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: 'var(--bg2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {m.avatarUrl
                        ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{m.username[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <Link href={`/mint/${m.username}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', textDecoration: 'none' }}>
                        @{m.username}
                      </Link>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {m.role === 'owner' ? t('roleOwnerFull') : t('roleMember')} · {t('joinedAt', { time: formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true }) })}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', flexShrink: 0 }}>{fmt(m.balance)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat tab */}
          {activeTab === 'chat' && (
            <div style={{ maxWidth: 640 }}>
              <ChatPanel slug={slug} myUsername={myUsername} myAvatarUrl={myAvatarUrl} initialMessages={initialMessages} />
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          {t('joinPrompt')}
        </div>
      )}
    </div>
  )
}
