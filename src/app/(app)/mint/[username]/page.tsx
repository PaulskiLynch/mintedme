import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { businessNetIncome, TIER_LABELS } from '@/lib/business'
import { monthlyPropertyUpkeep } from '@/lib/property'
import { monthlyAircraftUpkeep } from '@/lib/aircraft'
import { monthlyUpkeep } from '@/lib/upkeep'
import { JOB_BY_CODE } from '@/lib/jobs'
import FollowButton from './FollowButton'
import AdminMintPanel from './AdminMintPanel'

export const dynamic = 'force-dynamic'

export default async function MintProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const session = await auth()

  const user = await prisma.user.findUnique({
    where:   { username: username.toLowerCase() },
    include: {
      ownedEditions: {
        where:   { isFrozen: false },
        include: {
          item: { select: { id: true, name: true, category: true, rarityTier: true, imageUrl: true, businessRiskTier: true, propertyTier: true, aircraftType: true, benchmarkPrice: true } },
          _count: { select: { offers: { where: { status: 'pending' } } } },
        },
        orderBy: { lastSalePrice: 'desc' },
      },
      _count: { select: { createdItems: true } },
      job:    true,
    },
  })
  if (!user) notFound()

  const isOwn    = session?.user?.id === user.id
  const isAdmin  = session?.user?.isAdmin ?? false
  const viewerId = session?.user?.id ?? null

  const [followerCount, followingCount, followRecord, reverseFollowRecord] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId:  user.id } }),
    viewerId && !isOwn
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } })
      : null,
    viewerId && !isOwn
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: viewerId } } })
      : null,
  ])

  const isFollowing = !!followRecord
  const isMutual    = isFollowing && !!reverseFollowRecord

  // Income calculations
  const monthlyJobIncome = user.job?.monthlySalary ?? 0
  const monthlyBizIncome = user.ownedEditions.reduce((sum, e) => {
    if (!e.item.businessRiskTier) return sum
    return sum + businessNetIncome(e.item.businessRiskTier, Number(e.item.benchmarkPrice))
  }, 0)
  const totalMonthlyIncome = monthlyJobIncome + monthlyBizIncome

  const mintValue = user.ownedEditions.reduce((sum, e) => sum + Number(e.lastSalePrice ?? 0), 0)
  const netWorth  = Number(user.balance) + mintValue

  const jobDef = user.job ? JOB_BY_CODE[user.job.jobCode] : null

  const byCategory: Record<string, typeof user.ownedEditions> = {}
  for (const e of user.ownedEditions) {
    const cat = e.item.category
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(e)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'var(--gold)', flexShrink: 0 }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : user.username[0].toUpperCase()
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>@{user.username}</h1>
          {user.tagline && <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 4 }}>{user.tagline}</div>}

          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {user.isEstablished && <span style={{ fontSize: 11, background: '#1e2a15', color: 'var(--green)', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>ESTABLISHED TRADER</span>}
            {user._count.createdItems > 0 && <span style={{ fontSize: 11, background: '#1e1a0a', color: 'var(--gold)', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>CREATOR</span>}
            {isMutual && <span style={{ fontSize: 11, background: 'rgba(100,160,220,0.12)', color: '#7ab8e8', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>🤝 Mutual</span>}
          </div>

          {/* Follow counts */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--white)' }}>{followerCount.toLocaleString()}</span> followers
            </span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--white)' }}>{followingCount.toLocaleString()}</span> following
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {isOwn ? (
            <Link href="/settings" className="btn btn-outline btn-sm">Edit Mint</Link>
          ) : (
            <FollowButton
              targetUserId={user.id}
              initialFollowing={isFollowing}
              initialCount={followerCount}
              userId={viewerId}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: jobDef ? 16 : 32 }}>
        <div className="stat-box">
          <div className="stat-label">Balance</div>
          <div className="stat-value">${Number(user.balance).toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Mint Value</div>
          <div className="stat-value">${mintValue.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">${netWorth.toLocaleString()}</div>
        </div>
        {totalMonthlyIncome > 0 ? (
          <div className="stat-box">
            <div className="stat-label">Monthly Income</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>+${totalMonthlyIncome.toLocaleString()}</div>
          </div>
        ) : (
          <div className="stat-box">
            <div className="stat-label">Items</div>
            <div className="stat-value">{user.ownedEditions.length}</div>
          </div>
        )}
      </div>

      {/* Job card */}
      {jobDef && user.job && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 2 }}>EMPLOYED</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{jobDef.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{jobDef.category}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em' }}>MONTHLY SALARY</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>${user.job.monthlySalary.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Admin mint editor */}
      {isAdmin && (
        <AdminMintPanel
          profileUserId={user.id}
          editions={user.ownedEditions.map(e => ({
            id:            e.id,
            editionNumber: e.editionNumber,
            item: {
              id:        e.item.id,
              name:      e.item.name,
              imageUrl:  e.item.imageUrl,
              category:  e.item.category,
              rarityTier: e.item.rarityTier,
            },
          }))}
        />
      )}

      {/* Items by category */}
      {user.ownedEditions.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          {isOwn ? 'Your Mint is empty. Head to the Marketplace.' : 'This Mint is empty. Sad millionaire noises.'}
        </div>
      ) : (
        <div>
          {Object.entries(byCategory).map(([cat, editions]) => (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 12 }}>{cat}</div>
              <div className="items-grid">
                {editions.map(e => {
                  const bench = Number(e.item.benchmarkPrice)
                  const bNet = e.item.businessRiskTier
                    ? businessNetIncome(e.item.businessRiskTier, bench) : 0
                  const pUpkeep = e.item.propertyTier
                    ? monthlyPropertyUpkeep(e.item.propertyTier, bench) : 0
                  const aUpkeep = e.item.aircraftType
                    ? monthlyAircraftUpkeep(e.item.aircraftType, bench) : 0
                  const carUpkeep = (!e.item.businessRiskTier && !e.item.propertyTier && !e.item.aircraftType)
                    ? monthlyUpkeep(e.item.rarityTier, bench) : 0

                  let subLine: { text: string; colour: string }
                  if (bNet > 0) {
                    subLine = { text: `+$${bNet.toLocaleString()}/mo`, colour: 'var(--green)' }
                  } else if (e.item.propertyTier) {
                    subLine = pUpkeep > 0
                      ? { text: `−$${pUpkeep.toLocaleString()}/mo upkeep`, colour: 'var(--red)' }
                      : { text: 'No upkeep', colour: 'var(--muted)' }
                  } else if (aUpkeep > 0) {
                    subLine = { text: `−$${aUpkeep.toLocaleString()}/mo upkeep`, colour: 'var(--red)' }
                  } else if (carUpkeep > 0) {
                    subLine = { text: `−$${carUpkeep.toLocaleString()}/mo upkeep`, colour: 'var(--red)' }
                  } else {
                    const price = e.isListed && e.listedPrice ? Number(e.listedPrice) : Number(e.lastSalePrice ?? 0)
                    subLine = price > 0
                      ? { text: `$${price.toLocaleString()}`, colour: 'var(--white)' }
                      : { text: '—', colour: 'var(--muted)' }
                  }

                  let badgeTop = 6
                  return (
                    <Link key={e.id} href={`/item/${e.id}`} style={{ textDecoration: 'none' }}>
                      <div className={`item-card tier-${e.item.rarityTier.toLowerCase()}`} style={{ position: 'relative' }}>
                        {isOwn && e._count.offers > 0 && (() => { badgeTop = 6; return (
                          <span style={{ position: 'absolute', top: badgeTop, right: 6, background: 'var(--gold)', color: '#000', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, zIndex: 2 }}>OFFER</span>
                        ) })()}
                        {e.isListed && (() => { const t = isOwn && e._count.offers > 0 ? 26 : 6; return (
                          <span style={{ position: 'absolute', top: t, right: 6, background: '#1a3a10', color: 'var(--green)', fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4, zIndex: 2 }}>LISTED</span>
                        ) })()}
                        {e.item.businessRiskTier && (
                          <span style={{ position: 'absolute', top: 6, left: 6, background: '#1e2a15', color: 'var(--green)', fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4, zIndex: 2 }}>
                            {TIER_LABELS[e.item.businessRiskTier as keyof typeof TIER_LABELS]?.toUpperCase()}
                          </span>
                        )}
                        <div className="item-card-img">
                          {e.item.imageUrl
                            ? <img src={e.item.imageUrl} alt={e.item.name} />
                            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>No image</div>
                          }
                        </div>
                        <div className="item-card-body">
                          <div className="item-card-name">{e.item.name}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: subLine.colour }}>{subLine.text}</div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
