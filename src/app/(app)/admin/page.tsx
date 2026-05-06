import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/feed')

  const [users, items, suggestions, reports, auctionCount, userCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { balance: 'desc' },
      take: 200,
      select: {
        id: true, username: true, email: true, balance: true, debtAmount: true,
        isAdmin: true, isFrozen: true, isEstablished: true,
        createdAt: true, lastSeenAt: true,
        _count: { select: { ownedEditions: true, bids: true } },
      },
    }),
    prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        id: true, name: true, category: true, rarityTier: true, benchmarkPrice: true,
        isApproved: true, isFrozen: true, isOfficial: true, itemStatus: true,
        totalSupply: true, createdAt: true,
        _count: { select: { editions: true } },
      },
    }),
    prisma.creatorSubmission.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { username: true } } },
    }),
    prisma.report.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { username: true } },
        edition: { include: { item: { select: { name: true } } } },
      },
      take: 50,
    }),
    prisma.auction.count({ where: { status: 'active' } }),
    prisma.user.count(),
  ])

  const stats = {
    users: userCount,
    items: items.length,
    activeAuctions: auctionCount,
    pendingSuggestions: suggestions.length,
    pendingReports: reports.length,
    frozenItems: items.filter(i => i.isFrozen).length,
    frozenUsers: users.filter(u => u.isFrozen).length,
  }

  return (
    <AdminClient
      stats={stats}
      users={users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        balance: u.balance.toString(),
        debtAmount: u.debtAmount.toString(),
        isAdmin: u.isAdmin,
        isFrozen: u.isFrozen,
        isEstablished: u.isEstablished,
        createdAt: u.createdAt.toISOString(),
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
        editionCount: u._count.ownedEditions,
        bidCount: u._count.bids,
      }))}
      items={items.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        rarityTier: i.rarityTier,
        benchmarkPrice: i.benchmarkPrice.toString(),
        isApproved: i.isApproved,
        isFrozen: i.isFrozen,
        isOfficial: i.isOfficial,
        itemStatus: i.itemStatus,
        totalSupply: i.totalSupply,
        editionCount: i._count.editions,
        createdAt: i.createdAt.toISOString(),
      }))}
      suggestions={suggestions.map(s => ({
        id: s.id,
        itemName: s.itemName,
        category: s.category,
        description: s.description ?? '',
        creatorUsername: s.creator.username,
        createdAt: s.createdAt.toISOString(),
      }))}
      reports={reports.map(r => ({
        id: r.id,
        reason: r.reason,
        description: r.description ?? '',
        reporterUsername: r.reporter.username,
        itemName: r.edition?.item.name ?? null,
        editionId: r.editionId ?? null,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  )
}
