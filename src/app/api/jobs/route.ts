import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { JOB_CATALOGUE, slotsForJob } from '@/lib/jobs'

export async function GET() {
  const session = await auth()
  const userId  = session?.user?.id ?? null

  const [activeUsers, holdings, auctions, myJob, myActiveBid] = await Promise.all([
    prisma.user.count(),
    prisma.jobHolding.groupBy({ by: ['jobCode'], _count: { jobCode: true } }),
    prisma.jobAuction.findMany({
      where:   { status: 'active' },
      include: {
        bids:   { orderBy: { salaryBid: 'asc' }, select: { userId: true, salaryBid: true } },
        _count: { select: { bids: true } },
      },
    }),
    userId ? prisma.jobHolding.findUnique({ where: { userId } }) : null,
    userId
      ? prisma.jobBid.findFirst({
          where:   { userId, jobAuction: { status: 'active' } },
          include: { jobAuction: { select: { id: true, jobCode: true, endsAt: true } } },
        })
      : null,
  ])

  const holderMap  = Object.fromEntries(holdings.map(h => [h.jobCode, h._count.jobCode]))
  const auctionMap = Object.fromEntries(auctions.map(a => [a.jobCode, a]))

  const jobs = JOB_CATALOGUE.map(j => {
    const auction = auctionMap[j.code]
    const myBidHere = myActiveBid?.jobAuction.jobCode === j.code ? myActiveBid.salaryBid : null
    return {
      code:        j.code,
      title:       j.title,
      category:    j.category,
      minSalary:   j.minSalary,
      maxSalary:   j.maxSalary,
      totalSlots:  slotsForJob(j.baseSlotsPerThousand, activeUsers),
      heldSlots:   holderMap[j.code] ?? 0,
      activeAuction: auction ? {
        id:        auction.id,
        endsAt:    auction.endsAt.toISOString(),
        lowestBid: auction.bids[0]?.salaryBid ?? null,
        bidCount:  auction._count.bids,
        myBid:     myBidHere,
      } : null,
    }
  })

  return NextResponse.json({ jobs, myJob, myActiveBid })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.jobHolding.findUnique({ where: { userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'No active job' }, { status: 400 })

  await prisma.jobHolding.delete({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
