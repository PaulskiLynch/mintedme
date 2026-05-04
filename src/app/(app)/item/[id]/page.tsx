import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { maxEditions } from '@/lib/supply'
import ItemActions from './ItemActions'

export const dynamic = 'force-dynamic'

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const edition = await prisma.itemEdition.findUnique({
    where: { id },
    include: {
      item: true,
      currentOwner: { select: { id: true, username: true, avatarUrl: true } },
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

  const item = edition.item
  const isOwner  = session?.user?.id === edition.currentOwnerId
  const userData = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { balance: true } })
    : null

  const topOffer     = edition.offers[0]?.amount?.toString() ?? null

  // Supply calculation
  const [userCount, mintedCount] = await Promise.all([
    prisma.user.count(),
    prisma.itemEdition.count({ where: { itemId: item.id } }),
  ])
  const allowedEditions = Math.min(item.totalSupply, maxEditions(item.class, userCount))
  const supplyLocked    = !edition.currentOwnerId && mintedCount >= allowedEditions
  const supplyInfo      = `${mintedCount} minted · ${allowedEditions} unlocked · ${item.totalSupply.toLocaleString()} max supply`

  const activeAuction = edition.isInAuction
    ? await prisma.auction.findFirst({ where: { editionId: id, status: 'active' }, select: { id: true, currentBid: true, startingBid: true, endsAt: true } })
    : null

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/marketplace" style={{ color: 'var(--muted)', fontSize: 13 }}>← Marketplace</Link>
      </div>

      <div className="item-detail">
        {/* Left: image */}
        <div>
          <div className="item-detail-img">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                No image
              </div>
            )}
          </div>
          {item.description && (
            <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{item.description}</p>
          )}

          {/* Ownership history */}
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 14 }}>Edition History</h3>
            {edition.ownerships.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No sales yet. Be the first owner.</div>
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
              <span className={`class-badge class-${item.class}`}>{item.class}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.category}</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{item.name}</h1>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Edition #{edition.editionNumber} of {item.totalSupply}
            </div>

            <div className="item-price-big">
              {edition.isListed && edition.listedPrice
                ? '$' + Number(edition.listedPrice).toLocaleString()
                : item.referencePrice
                ? '$' + Number(item.referencePrice).toLocaleString()
                : 'Make an offer'}
            </div>

            {topOffer && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                Highest offer: <span style={{ color: 'var(--green)', fontWeight: 700 }}>${Number(topOffer).toLocaleString()}</span>
              </div>
            )}

            <div className="item-owner-link">
              {edition.currentOwner
                ? <>Owned by <Link href={`/mint/${edition.currentOwner.username}`}>@{edition.currentOwner.username}</Link></>
                : 'Available — no owner yet'}
            </div>

            {activeAuction && (
              <Link href={`/auction/${activeAuction.id}`} className="btn btn-gold btn-full btn-lg" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', marginBottom: 12 }}>
                Live auction — ${Number(activeAuction.currentBid ?? activeAuction.startingBid).toLocaleString()} →
              </Link>
            )}

            {item.hasOwnershipCost && item.ownershipCostPct && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                Ownership cost: {(Number(item.ownershipCostPct) * 100).toFixed(1)}%/week
              </div>
            )}

            <ItemActions
              editionId={edition.id}
              itemId={item.id}
              itemName={item.name}
              isOwner={isOwner}
              isListed={edition.isListed}
              listedPrice={edition.listedPrice?.toString() ?? null}
              isInAuction={edition.isInAuction}
              isFrozen={edition.isFrozen}
              userId={session?.user?.id ?? null}
              userBalance={userData?.balance?.toString() ?? null}
              currentOwnerId={edition.currentOwnerId}
              referencePrice={item.referencePrice?.toString() ?? null}
              supplyLocked={supplyLocked}
              supplyInfo={supplyInfo}
            />

            {/* Active offers (owner view) */}
            {isOwner && edition.offers.length > 0 && (
              <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Incoming Offers</div>
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
