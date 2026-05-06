import { prisma } from '@/lib/db'
import AdminAuditClient from './AdminAuditClient'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { admin: { select: { username: true } } },
  })

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Audit Log</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        {logs.length} entries (last 500) · every admin mutation is recorded here
      </div>
      <AdminAuditClient entries={logs.map(l => ({
        id:            l.id,
        adminUsername: l.admin.username,
        action:        l.action,
        targetType:    l.targetType,
        targetId:      l.targetId,
        beforeJson:    l.beforeJson,
        afterJson:     l.afterJson,
        reason:        l.reason,
        createdAt:     l.createdAt.toISOString(),
      }))} />
    </div>
  )
}
