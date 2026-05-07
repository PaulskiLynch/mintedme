import { prisma } from '@/lib/db'
import AdminReportsClient from './AdminReportsClient'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: {
      reporter: { select: { username: true } },
      edition:  { select: { editionNumber: true, isFrozen: true, item: { select: { name: true } } } },
    },
  })

  const pending = reports.filter(r => r.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Reports</div>
        {pending > 0 && (
          <span style={{ background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 20 }}>
            {pending} pending
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        User-submitted reports on listed items
      </div>
      <AdminReportsClient reports={reports.map(r => ({
        id:            r.id,
        reporterId:    r.reporterId,
        reporterName:  r.reporter.username,
        editionId:     r.editionId,
        editionNum:    r.edition?.editionNumber ?? null,
        itemName:      r.edition?.item.name ?? null,
        editionFrozen: r.edition?.isFrozen ?? false,
        reason:        r.reason,
        description:   r.description,
        status:        r.status,
        createdAt:     r.createdAt.toISOString(),
      }))} />
    </div>
  )
}
