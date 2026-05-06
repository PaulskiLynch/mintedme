import { prisma } from './db'

type TxClient = typeof prisma

export async function snapshotRanks(tx: TxClient, userIds: string[]) {
  if (!userIds.length) return

  // Compute each user's current rank based on balance + mint value
  const allUsers = await tx.user.findMany({
    where:   { isFrozen: false },
    select:  { id: true, balance: true, ownedEditions: { select: { lastSalePrice: true, item: { select: { benchmarkPrice: true } } } } },
    orderBy: { balance: 'desc' },
  })

  const withNetWorth = allUsers
    .map(u => ({
      id: u.id,
      netWorth: Number(u.balance) + u.ownedEditions.reduce(
        (s, e) => s + Number(e.lastSalePrice ?? e.item.benchmarkPrice),
        0,
      ),
    }))
    .sort((a, b) => b.netWorth - a.netWorth)

  for (const userId of userIds) {
    const rank = withNetWorth.findIndex(u => u.id === userId) + 1
    if (rank > 0) {
      await tx.user.update({ where: { id: userId }, data: { previousRank: rank } })
    }
  }
}
