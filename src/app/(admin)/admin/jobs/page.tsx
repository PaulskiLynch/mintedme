import { prisma } from '@/lib/db'
import { JOB_BY_CODE } from '@/lib/jobs'
import AdminJobsClient from './AdminJobsClient'

export const dynamic = 'force-dynamic'

export default async function AdminJobsPage() {
  const [auctions, holdings] = await Promise.all([
    prisma.jobAuction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        bids:   { select: { id: true } },
        winner: { select: { username: true } },
      },
    }),
    prisma.jobHolding.findMany({
      orderBy: { startedAt: 'desc' },
      include: { user: { select: { username: true } } },
    }),
  ])

  const activeAuctions = auctions.filter(a => a.status === 'active').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Jobs</div>
        {activeAuctions > 0 && (
          <span style={{ background: 'var(--gold)', color: '#000', fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 20 }}>
            {activeAuctions} live
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        {holdings.length} employees · {auctions.filter(a => a.status === 'active').length} open auctions
      </div>
      <AdminJobsClient
        auctions={auctions.map(a => ({
          id:           a.id,
          jobCode:      a.jobCode,
          title:        JOB_BY_CODE[a.jobCode]?.title ?? a.jobCode,
          category:     JOB_BY_CODE[a.jobCode]?.category ?? '—',
          status:       a.status,
          bidCount:     a.bids.length,
          winnerName:   a.winner?.username ?? null,
          winnerSalary: a.winnerSalary,
          endsAt:       a.endsAt.toISOString(),
          createdAt:    a.createdAt.toISOString(),
        }))}
        holdings={holdings.map(h => ({
          id:            h.id,
          userId:        h.userId,
          username:      h.user.username,
          jobCode:       h.jobCode,
          title:         JOB_BY_CODE[h.jobCode]?.title ?? h.jobCode,
          category:      JOB_BY_CODE[h.jobCode]?.category ?? '—',
          monthlySalary: h.monthlySalary,
          startedAt:     h.startedAt.toISOString(),
          lastPaidAt:    h.lastPaidAt?.toISOString() ?? null,
        }))}
      />
    </div>
  )
}
