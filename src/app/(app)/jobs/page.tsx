import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { JOB_CATALOGUE, JOB_BY_CODE, slotsForJob } from '@/lib/jobs'
import { UPKEEP_CYCLE_DAYS } from '@/lib/upkeep'
import JobActions from './JobActions'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const session = await auth()

  const [activeUsers, holdings, myJob] = await Promise.all([
    prisma.user.count(),
    prisma.jobHolding.groupBy({ by: ['jobCode'], _count: { jobCode: true } }),
    session?.user?.id
      ? prisma.jobHolding.findUnique({ where: { userId: session.user.id } })
      : null,
  ])

  const holderMap = Object.fromEntries(holdings.map(h => [h.jobCode, h._count.jobCode]))
  const totalHeld = holdings.reduce((sum, h) => sum + h._count.jobCode, 0)
  const totalSlots = JOB_CATALOGUE.reduce((sum, j) => sum + slotsForJob(j.baseSlotsPerThousand, activeUsers), 0)

  const jobs = JOB_CATALOGUE.map(j => ({
    code:       j.code,
    title:      j.title,
    category:   j.category,
    minSalary:  j.minSalary,
    maxSalary:  j.maxSalary,
    totalSlots: slotsForJob(j.baseSlotsPerThousand, activeUsers),
    heldSlots:  holderMap[j.code] ?? 0,
  }))

  const myJobDef = myJob ? JOB_BY_CODE[myJob.jobCode] : null

  const nextPayDay = myJob
    ? new Date((myJob.lastPaidAt ?? myJob.startedAt).getTime() + UPKEEP_CYCLE_DAYS * 24 * 60 * 60 * 1000)
    : null
  const daysToPayday = nextPayDay
    ? Math.max(0, Math.ceil((nextPayDay.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Jobs</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
        Hold one job at a time. Salary is paid monthly directly to your wallet.
      </p>

      {/* Stats bar */}
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

      {/* Current job card */}
      {myJobDef && myJob && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 6 }}>YOUR CURRENT JOB</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{myJobDef.title}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{myJobDef.category}</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>MONTHLY SALARY</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>${myJob.monthlySalary.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>NEXT PAYDAY</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {daysToPayday === 0 ? 'Today' : `${daysToPayday}d`}
              </div>
            </div>
          </div>
        </div>
      )}

      {!session?.user?.id && (
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Sign in to apply for a job.</p>
      )}

      <JobActions jobs={jobs} myJobCode={myJob?.jobCode ?? null} />
    </div>
  )
}
