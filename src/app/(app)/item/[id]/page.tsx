import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { maxEditions } from '@/lib/supply'
import { monthlyUpkeep, upkeepDaysRemaining } from '@/lib/upkeep'
import { businessGrossIncome, businessUpkeepCost, businessNetIncome, businessIncomeDaysRemaining, TIER_LABELS } from '@/lib/business'
import { PROPERTY_TIER_DEFS, monthlyPropertyUpkeep, monthlyPropertyAppreciation, monthlyPropertyNet } from '@/lib/property'
import ItemActions from './ItemActions'
import WishlistButton from './WishlistButton'

export const dynamic = 'force-dynamic'

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const edition = await prisma.itemEdition.findUnique({
    where: { id },
    include: {
      item: true,
      currentOwner: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } },
      offers: {
        where: { status: 'pending' },
        include: { buyer: { select: { username: true } } },
        orderBy: { amount: 'desc' },
        take: 10,
      },
      ownerships: {
        include: { owner: { select: { username: true } } },
        orderBy: { purchaseDate: 'desc' },
        take: 10,
      },
    },
  })
  if (!edition) notFound()

  if (edition.item.hasIncome) {
    prisma.itemView.create({ data: { editionId: id, userId: session?.user?.id ?? undefined } }).catch(() => {})
  }

  const item    = edition.item
  const isOwner = session?.user?.id === edition.currentOwnerId

  const [userData, wishlistEntry, ownerRareCount, wishlistCount, claimedCount, mySuggestion] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { balance: true } })
      : null,
    session?.user?.id
      ? prisma.wishlist.findUnique({ where: { userId_itemId: { userId: session.user.id, itemId: item.id } } })
      : null,
    edition.currentOwnerId
      ? prisma.itemEdition.count({
          where: { currentOwnerId: edition.currentOwnerId, item: { rarityTier: { in: ['Exotic', 'Legendary', 'Mythic'] } } },
        })
      : Promise.resolve(0),
    prisma.wishlist.count({ where: { itemId: item.id } }),
    prisma.itemEdition.count({ where: { itemId: item.id, currentOwnerId: { not: null } } }),
    session?.user?.id
      ? prisma.creatorSubmission.findFirst({
          where: { creatorId: session.user.id, linkedItemId: item.id, status: 'approved', discountUsed: false },
        })
      : Promise.resolve(null),
  ])

  const discountPrice = mySuggestion ? Math.round(Number(item.benchmarkPrice) * 0.5) : null

  const topOffer = edition.offers[0]?.amount?.toString() ?? null

  const [userCount, mintedCount] = await Promise.all([
    prisma.user.count(),
    prisma.itemEdition.count({ where: { itemId: item.id } }),
  ])
  const allowedEditions  = Math.min(item.totalSupply, maxEditions(item.rarityTier, userCount))
  const supplyLocked     = !!edition.currentOwnerId && mintedCount >= allowedEditions
  const availableNow     = Math.max(0, allowedEditions - claimedCount)
  const upkeep           = monthlyUpkeep(item.rarityTier, Number(item.benchmarkPrice))
  const daysUntilCharge  = upkeepDaysRemaining(
    edition.lastUpkeepAt ?? null,
    edition.lastSaleDate ?? null,
    edition.createdAt,
  )

  // Trend: % diff between benchmark and last sale price
  const trendPct = edition.lastSalePrice
    ? Number((((Number(item.benchmarkPrice) - Number(edition.lastSalePrice)) / Number(edition.lastSalePrice)) * 100).toFixed(1))
    : null

  const bTier = item.businessRiskTier ?? null
  const bGross  = bTier ? businessGrossIncome(bTier, Number(item.benchmarkPrice))  : 0
  const bUpkeep = bTier ? businessUpkeepCost(bTier, Number(item.benchmarkPrice))   : 0
  const bNet    = bTier ? businessNetIncome(bTier, Number(item.benchmarkPrice))     : 0
  const bDays   = bTier ? businessIncomeDaysRemaining(edition.lastIncomeAt ?? null, edition.lastSaleDate ?? null, edition.createdAt) : 0

  const pTier      = item.propertyTier ?? null
  const pDef       = pTier ? PROPERTY_TIER_DEFS[pTier as keyof typeof PROPERTY_TIER_DEFS] : null
  const pUpkeep    = pTier ? monthlyPropertyUpkeep(pTier, Number(item.benchmarkPrice))    : 0
  const pAppreciation = pTier ? monthlyPropertyAppreciation(pTier, Number(item.benchmarkPrice)) : 0
  const pNet       = pTier ? monthlyPropertyNet(pTier, Number(item.benchmarkPrice))       : 0

  const activeAuction = edition.isInAuction
    ? await prisma.auction.findFirst({
        where: { editionId: id, status: 'active' },
        select: { id: true, minimumBid: true, endsAt: true, _count: { select: { bids: true } } },
      })
    : null

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/marketplace" style={{ color: 'var(--muted)', fontSize: 13 }}>← Marketplace</Link>
      </div>

      <div className="item-detail">
        {/* Left: image + stats + history */}
        <div>
          <div className="item-detail-img">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.name} />
              : item.businessRiskTier
              ? (() => {
                  const BIZ: Record<string, { bg: string; icon: string; label: string }> = {
                    safe:     { bg: 'linear-gradient(135deg, #1a2e1a 0%, #0d1f0d 100%)', icon: '🏦', label: 'Safe'     },
                    growth:   { bg: 'linear-gradient(135deg, #1a1f2e 0%, #0d1220 100%)', icon: '📈', label: 'Growth'   },
                    risky:    { bg: 'linear-gradient(135deg, #2e1a10 0%, #200d08 100%)', icon: '🎲', label: 'Risky'    },
                    prestige: { bg: 'linear-gradient(135deg, #2a1f0a 0%, #1c1408 100%)', icon: '👑', label: 'Prestige' },
                  }
                  const s = BIZ[item.businessRiskTier] ?? BIZ.safe
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: s.bg, gap: 12 }}>
                      <div style={{ fontSize: 56 }}>{s.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.12em' }}>{s.label.toUpperCase()} TIER BUSINESS</div>
                    </div>
                  )
                })()
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>No image</div>
            }
          </div>
          {item.description && (
            <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{item.description}</p>
          )}

          {/* Performance stats */}
          {(item.horsepower || item.topSpeed || item.zeroToHundred) && (
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {item.horsepower && (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--white)' }}>{item.horsepower.toLocaleString()}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 2 }}>HP</div>
                </div>
              )}
              {item.topSpeed && (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--white)' }}>{item.topSpeed}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 2 }}>KM/H</div>
                </div>
              )}
              {item.zeroToHundred && (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--white)' }}>{Number(item.zeroToHundred).toFixed(1)}s</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 2 }}>0–100</div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 14 }}>Edition History</h3>
            {edition.ownerships.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No sales yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {edition.ownerships.map((o: typeof edition.ownerships[0]) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>
                      <Link href={`/mint/${o.owner.username}`} style={{ fontWeight: 700, color: 'var(--white)' }}>@{o.owner.username}</Link>
                      {' '}via {o.transferType}
                    </span>
                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                      {o.purchasePrice ? '$' + Number(o.purchasePrice).toLocaleString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: action box */}
        <div>
          <div className="item-action-box">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span className={`class-badge class-${item.rarityTier.toLowerCase()}`}>{item.rarityTier}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.category}</span>
              {bTier && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--bg3)', borderRadius: 4, padding: '2px 7px', letterSpacing: '0.05em' }}>
                  {TIER_LABELS[bTier as keyof typeof TIER_LABELS]} Business
                </span>
              )}
              {pDef && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--bg3)', borderRadius: 4, padding: '2px 7px', letterSpacing: '0.05em' }}>
                  {pDef.emoji} {pDef.label}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{item.name}</h1>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {(item.rarityTier === 'Custom' || item.rarityTier === 'Banger')
                ? '1 of 1 · Unique edition'
                : `Edition #${edition.editionNumber} of ${item.totalSupply}`}
            </div>

            {edition.isListed && edition.listedPrice ? (
              <div className="item-price-big">${Number(edition.listedPrice).toLocaleString()}</div>
            ) : edition.lastSalePrice ? (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>LAST SOLD</div>
                <div className="item-price-big">${Number(edition.lastSalePrice).toLocaleString()}</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>TRUE VALUE</div>
                <div className="item-price-big">${Number(item.benchmarkPrice).toLocaleString()}</div>
              </div>
            )}

            <div className="item-owner-link" style={{ marginBottom: 16 }}>
              {edition.currentOwner
                ? <>Owned by <Link href={`/mint/${edition.currentOwner.username}`}>@{edition.currentOwner.username}</Link></>
                : 'Owned by MilliBux'}
            </div>

            {activeAuction && (
              <Link href={`/auction/${activeAuction.id}`} className="btn btn-gold btn-full btn-lg" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', marginBottom: 16 }}>
                Live auction · {activeAuction._count.bids} bid{activeAuction._count.bids !== 1 ? 's' : ''} · Place sealed bid →
              </Link>
            )}

            <ItemActions
              editionId={edition.id}
              itemId={item.id}
              itemName={item.name}
              rarityTier={item.rarityTier}
              isOwner={isOwner}
              isListed={edition.isListed}
              listedPrice={edition.listedPrice?.toString() ?? null}
              isInAuction={edition.isInAuction}
              isFrozen={edition.isFrozen}
              userId={session?.user?.id ?? null}
              userBalance={userData?.balance?.toString() ?? null}
              currentOwnerId={edition.currentOwnerId}
              ownerUsername={edition.currentOwner?.username ?? null}
              ownerLastSeenAt={edition.currentOwner?.lastSeenAt?.toISOString() ?? null}
              ownerRareCount={ownerRareCount}
              minimumBid={item.minimumBid.toString()}
              benchmarkPrice={item.benchmarkPrice.toString()}
              lastSalePrice={edition.lastSalePrice?.toString() ?? null}
              topOffer={topOffer}
              monthlyUpkeep={upkeep}
              daysUntilCharge={daysUntilCharge}
              supplyLocked={supplyLocked}
              availableNow={availableNow}
              alreadyClaimed={claimedCount}
              totalEver={item.totalSupply}
              watcherCount={wishlistCount}
              pendingOfferCount={edition.offers.length}
              trendPct={trendPct}
              businessRiskTier={bTier}
              businessGross={bGross}
              businessUpkeep={bUpkeep}
              businessNet={bNet}
              businessDaysToIncome={bDays}
              discountPrice={discountPrice}
              propertyTier={pTier}
              propertyDef={pDef ? { label: pDef.label, emoji: pDef.emoji, prestige: pDef.prestige } : null}
              propertyUpkeep={pUpkeep}
              propertyAppreciation={pAppreciation}
              propertyNet={pNet}
            />

            {!isOwner && (
              <WishlistButton
                itemId={item.id}
                userId={session?.user?.id ?? null}
                initialWishlisted={!!wishlistEntry}
                initialCount={wishlistCount}
              />
            )}

            {isOwner && edition.offers.length > 0 && (
              <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Incoming Offers ({edition.offers.length})</div>
                {edition.offers.map((o: typeof edition.offers[0]) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>@{o.buyer.username}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 900 }}>${Number(o.amount).toLocaleString()}</span>
                  </div>
                ))}
                <Link href="/inbox" style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                  Manage offers in Inbox →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
