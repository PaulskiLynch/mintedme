import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import InboxClient from './InboxClient'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const [incoming, outgoing] = await Promise.all([
    prisma.offer.findMany({
      where: { edition: { currentOwnerId: userId }, status: 'pending' },
      include: {
        buyer:   { select: { username: true } },
        edition: { include: { item: { select: { name: true, imageUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.offer.findMany({
      where: { buyerId: userId },
      include: {
        edition: { include: { item: { select: { name: true, imageUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  return (
    <InboxClient
      incoming={incoming.map((o: typeof incoming[0]) => ({ ...o, amount: o.amount.toString(), expiresAt: o.expiresAt.toISOString(), createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(), edition: { ...o.edition, lastSalePrice: o.edition.lastSalePrice?.toString() ?? null, listedPrice: o.edition.listedPrice?.toString() ?? null, highestOffer: o.edition.highestOffer?.toString() ?? null } }))}
      outgoing={outgoing.map((o: typeof outgoing[0]) => ({ ...o, amount: o.amount.toString(), expiresAt: o.expiresAt.toISOString(), createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(), edition: { ...o.edition, lastSalePrice: o.edition.lastSalePrice?.toString() ?? null, listedPrice: o.edition.listedPrice?.toString() ?? null, highestOffer: o.edition.highestOffer?.toString() ?? null } }))}
    />
  )
}
