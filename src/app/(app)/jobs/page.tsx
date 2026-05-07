import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { JOB_BY_CODE, dailyShuffledJobs, activeJobCount } from '@/lib/jobs'
import JobsClient from './JobsClient'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const session = await auth()
  const userId  = session?.user?.id ?? null

  const [userCount, holdings, auctions, myJob, myActiveBid] = await Promise.all([
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

  const activeCount  = activeJobCount(userCount)
  const activeJobs   = dailyShuffledJobs().slice(0, activeCount)
  const holderMap    = Object.fromEntries(holdings.map(h => [h.jobCode, h._count.jobCode]))
  const auctionMap   = Object.fromEntries(auctions.map(a => [a.jobCode, a]))
  const totalHeld    = holdings.reduce((sum, h) => sum + h._count.jobCode, 0)
  const openSlots    = activeCount - totalHeld

  const jobs = activeJobs.map(j => {
    const auction   = auctionMap[j.code]
    const myBidHere = myActiveBid?.jobAuction.jobCode === j.code ? myActiveBid.salaryBid : null
    return {
      code:     j.code,
      title:    j.title,
      category: j.category,
      minSalary: j.minSalary,
      maxSalary: j.maxSalary,
      isTaken:  (holderMap[j.code] ?? 0) >= 1,
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

  // Next refresh: tomorrow midnight (when the daily shuffle resets)
  const now       = new Date()
  const tomorrow  = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const refreshesAt = tomorrow.toISOString()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Jobs</h1>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>{activeCount} of {40} roles today</div>
          <div>Rotates daily · 1 slot each</div>
        </div>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
        Bid via reverse auction — lowest salary bid wins. One job at a time, paid monthly.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{activeCount}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>TODAY&apos;S ROLES</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{totalHeld}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>FILLED</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: openSlots > 0 ? 'var(--green)' : 'var(--red)' }}>{openSlots}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>OPEN</div>
        </div>
      </div>

      <JobsClient
        jobs={jobs}
        myJob={myJob ? { jobCode: myJob.jobCode, monthlySalary: myJob.monthlySalary, startedAt: myJob.startedAt.toISOString(), lastPaidAt: myJob.lastPaidAt?.toISOString() ?? null } : null}
        myJobTitle={myJobTitle}
        userId={userId}
        refreshesAt={refreshesAt}
        totalUsers={userCount}
      />
    </div>
  )
}
