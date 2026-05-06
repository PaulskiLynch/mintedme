import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { JOB_CATALOGUE, JOB_BY_CODE, slotsForJob } from '@/lib/jobs'
import JobsClient from './JobsClient'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
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
  const totalHeld  = holdings.reduce((sum, h) => sum + h._count.jobCode, 0)
  const totalSlots = JOB_CATALOGUE.reduce((sum, j) => sum + slotsForJob(j.baseSlotsPerThousand, activeUsers), 0)

  const jobs = JOB_CATALOGUE.map(j => {
    const auction    = auctionMap[j.code]
    const myBidHere  = myActiveBid?.jobAuction.jobCode === j.code ? myActiveBid.salaryBid : null
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

  const myJobTitle = myJob ? (JOB_BY_CODE[myJob.jobCode]?.title ?? null) : null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Jobs</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
        Bid on jobs via reverse auction — lowest salary bid wins. Hold one job at a time, paid monthly.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{totalSlots.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>TOTAL SLOTS</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{totalHeld.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>FILLED</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{(totalSlots - totalHeld).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>OPEN</div>
        </div>
      </div>

      {!userId && (
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Sign in to bid on a job.</p>
      )}

      <JobsClient
        jobs={jobs}
        myJob={myJob ? { jobCode: myJob.jobCode, monthlySalary: myJob.monthlySalary, startedAt: myJob.startedAt.toISOString(), lastPaidAt: myJob.lastPaidAt?.toISOString() ?? null } : null}
        myJobTitle={myJobTitle}
        userId={userId}
      />
    </div>
  )
}
