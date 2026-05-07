import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

const MEDALS = ['🥇', '🥈', '🥉']

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toLocaleString()}`
}

export default async function LeaderboardPage() {
  const [session, t] = await Promise.all([auth(), getTranslations('leaderboard')])
  if (!session?.user?.id) redirect('/login')

  const users = await prisma.user.findMany({
    where:  { isFrozen: false },
    select: {
      id:            true,
      username:      true,
      avatarUrl:     true,
      balance:       true,
      isEstablished: true,
      previousRank:  true,
      _count: { select: { ownedEditions: { where: { isFrozen: false } } } },
      ownedEditions: {
        where:  { isFrozen: false },
        select: { lastSalePrice: true, item: { select: { minimumBid: true } } },
      },
    },
  })

  const ranked = users
    .map(u => {
      const mintValue = u.ownedEditions.reduce(
        (s: number, e: { lastSalePrice: { toString(): string } | null; item: { minimumBid: { toString(): string } } }) =>
          s + Number(e.lastSalePrice ?? e.item.minimumBid),
        0,
      )
      const netWorth = Number(u.balance) + mintValue
      return { ...u, mintValue, netWorth, balance: Number(u.balance) }
    })
    .sort((a, b) => b.netWorth - a.netWorth)
    .map((u, i) => {
      const currentRank  = i + 1
      const prev         = u.previousRank
      const rankDelta    = prev ? prev - currentRank : null
      return { ...u, currentRank, rankDelta }
    })

  const myRow = ranked.findIndex(u => u.id === session.user.id)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="page-title">{t('title')}</div>
        <div className="page-sub">{t('subtitle', { n: ranked.length })}</div>
      </div>

      {/* Current user callout */}
      {myRow >= 0 && (
        <div style={{ background: '#1a1500', border: '1px solid var(--gold-dim)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>{t('yourRank')} </span>
            <span style={{ fontWeight: 900, color: 'var(--gold)', fontSize: 18 }}>#{myRow + 1}</span>
            <span style={{ color: 'var(--muted)' }}> {t('of')} {ranked.length}</span>
            {ranked[myRow].rankDelta !== null && ranked[myRow].rankDelta !== 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 800, color: (ranked[myRow].rankDelta ?? 0) > 0 ? 'var(--green)' : 'var(--red)' }}>
                {(ranked[myRow].rankDelta ?? 0) > 0
                  ? t('movedUp',   { n: ranked[myRow].rankDelta })
                  : t('movedDown', { n: Math.abs(ranked[myRow].rankDelta ?? 0) })}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {t('netWorth')} <span style={{ color: 'var(--white)', fontWeight: 700 }}>{fmt(ranked[myRow].netWorth)}</span>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ranked.map((u) => {
          const isMe  = u.id === session.user.id
          const i     = u.currentRank - 1
          const delta = u.rankDelta
          const moveColour = delta === null ? 'transparent'
                           : delta > 0     ? 'var(--green)'
                           : delta < 0     ? 'var(--red)'
                           : 'var(--muted)'
          const moveLabel = delta === null ? ''
                          : delta > 0     ? `↑${delta}`
                          : delta < 0     ? `↓${Math.abs(delta)}`
                          : '→'
          return (
            <Link
              key={u.id}
              href={`/mint/${u.username}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: isMe ? '#1a1500' : 'var(--bg2)',
                border: `1px solid ${isMe ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Rank + movement */}
              <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                {i < 3 ? (
                  <span style={{ fontSize: 22 }}>{MEDALS[i]}</span>
                ) : (
                  <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--muted)' }}>#{i + 1}</span>
                )}
                {moveLabel && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: moveColour, marginTop: 2 }}>{moveLabel}</div>
                )}
              </div>

              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'var(--gold)' }}>
                {u.avatarUrl
                  ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : u.username[0].toUpperCase()
                }
              </div>

              {/* Name + badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{u.username}
                  {isMe && <span style={{ fontSize: 10, background: 'var(--gold)', color: '#000', fontWeight: 800, padding: '1px 6px', borderRadius: 4, marginLeft: 8 }}>{t('you')}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {t('items', { n: u._count.ownedEditions })}
                  {u.isEstablished && <span style={{ marginLeft: 8, color: 'var(--green)' }}>{t('established')}</span>}
                </div>
              </div>

              {/* Stats */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: isMe ? 'var(--gold)' : 'var(--white)' }}>
                  {fmt(u.netWorth)}
                </div>
                <div className="lb-breakdown" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {t('breakdown', { cash: fmt(u.balance), mint: fmt(u.mintValue) })}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
