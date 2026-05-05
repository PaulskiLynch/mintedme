import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Called by Vercel Cron daily. Also callable manually for testing.
// Vercel sets CRON_SECRET; check it to prevent public triggering.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const BASE_YIELD_PCT = 0.0005 // 0.05% of referencePrice per run

  // All editions of income-bearing items that have a current owner
  const editions = await prisma.itemEdition.findMany({
    where: {
      item: { hasIncome: true },
      currentOwnerId: { not: null },
      isFrozen: false,
    },
    include: {
      item:         { select: { name: true, minimumBid: true, incomePerView: true, category: true } },
      currentOwner: { select: { id: true, isFrozen: true } },
    },
  })

  let totalPaid = 0
  let editionsProcessed = 0

  for (const edition of editions) {
    if (!edition.currentOwner || edition.currentOwner.isFrozen) continue

    const since = edition.lastIncomeAt ?? edition.createdAt

    // Count views since last payout
    const viewCount = await prisma.itemView.count({
      where: { editionId: edition.id, createdAt: { gt: since } },
    })

    // Delete processed views to keep table lean
    await prisma.itemView.deleteMany({
      where: { editionId: edition.id, createdAt: { lte: now } },
    })

    const refPrice  = Number(edition.item.minimumBid)
    const perView   = Number(edition.item.incomePerView ?? 0)
    const baseYield = refPrice * BASE_YIELD_PCT
    const viewIncome = viewCount * perView
    const income = Math.round(baseYield + viewIncome)

    if (income <= 0) continue

    // Credit owner and record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: edition.currentOwner.id },
        data: { balance: { increment: income } },
      }),
      prisma.transaction.create({
        data: {
          toUserId:    edition.currentOwner.id,
          editionId:   edition.id,
          amount:      income,
          type:        'income',
          description: `Income from ${edition.item.name} (${viewCount} views)`,
        },
      }),
      prisma.itemEdition.update({
        where: { id: edition.id },
        data: { lastIncomeAt: now },
      }),
    ])

    // Post to feed if income is notable (> $500)
    if (income >= 500) {
      await prisma.feedEvent.create({
        data: {
          userId:    edition.currentOwner.id,
          editionId: edition.id,
          eventType: 'income',
          amount:    income,
          isVisible: true,
          metadata: {
            title:       `${edition.item.name} generated $${income.toLocaleString()} income`,
            description: viewCount > 0
              ? `${viewCount} views drove passive earnings.`
              : 'Passive income from ownership.',
            viewCount,
            category: edition.item.category,
          },
        },
      })
    }

    totalPaid += income
    editionsProcessed++
  }

  return NextResponse.json({ ok: true, editionsProcessed, totalPaid })
}
