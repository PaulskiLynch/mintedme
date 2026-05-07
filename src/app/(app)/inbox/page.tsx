import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import InboxClient from './InboxClient'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const editionSelect = {
    id:   true,
    item: { select: { name: true, imageUrl: true } },
  }

  // Root offers I sent as buyer
  const buyerRoots = await prisma.offer.findMany({
    where: { buyerId: userId, counterOfferId: null },
    include: { edition: { select: editionSelect } },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  // Root offers on my editions as seller
  const sellerRoots = await prisma.offer.findMany({
    where: { edition: { currentOwnerId: userId }, counterOfferId: null, buyerId: { not: userId } },
    include: {
      buyer:   { select: { username: true } },
      edition: { select: editionSelect },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  // Fetch all counter offers in one query using the FK (counterOfferId → root offer id).
  // This is more reliable than traversing the Prisma self-relation reverse side.
  const allRootIds = [
    ...buyerRoots.map(o => o.id),
    ...sellerRoots.map(o => o.id),
  ]

  const counterOffers = allRootIds.length > 0
    ? await prisma.offer.findMany({
        where: { counterOfferId: { in: allRootIds } },
        select: {
          id:            true,
          counterOfferId: true,
          amount:        true,
          message:       true,
          status:        true,
          expiresAt:     true,
          createdAt:     true,
        },
      })
    : []

  const counterMap = new Map(counterOffers.map(c => [c.counterOfferId!, c]))

  function serCounter(rootId: string) {
    const c = counterMap.get(rootId)
    if (!c) return null
    return {
      id:        c.id,
      amount:    c.amount.toString(),
      message:   c.message,
      status:    c.status,
      expiresAt: c.expiresAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    }
  }

  const buyerThreads = buyerRoots.map(o => ({
    id:        o.id,
    amount:    o.amount.toString(),
    message:   o.message,
    status:    o.status,
    expiresAt: o.expiresAt.toISOString(),
    createdAt: o.createdAt.toISOString(),
    edition: {
      id:       o.edition.id,
      itemName: o.edition.item.name,
      imageUrl: o.edition.item.imageUrl,
    },
    counter: serCounter(o.id),
  }))

  const sellerThreads = sellerRoots.map(o => ({
    id:        o.id,
    amount:    o.amount.toString(),
    message:   o.message,
    status:    o.status,
    expiresAt: o.expiresAt.toISOString(),
    createdAt: o.createdAt.toISOString(),
    edition: {
      id:       o.edition.id,
      itemName: o.edition.item.name,
      imageUrl: o.edition.item.imageUrl,
    },
    counter:       serCounter(o.id),
    buyerUsername: o.buyer.username,
  }))

  return <InboxClient buyerThreads={buyerThreads} sellerThreads={sellerThreads} />
}
