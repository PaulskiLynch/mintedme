import { prisma } from '@/lib/db'
import AdminSuggestionsClient from './AdminSuggestionsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSuggestionsPage() {
  const submissions = await prisma.creatorSubmission.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    include: {
      creator: { select: { username: true } },
      linkedItem: { select: { id: true, name: true } },
    },
  })

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Product Suggestions</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        {submissions.filter(s => s.status === 'pending').length} pending
      </div>
      <AdminSuggestionsClient
        submissions={submissions.map(s => ({
          id:          s.id,
          itemName:    s.itemName,
          category:    s.category,
          description: s.description,
          status:      s.status,
          adminNotes:  s.adminNotes,
          createdAt:   s.createdAt.toISOString(),
          creator:     { username: s.creator.username },
          linkedItem:  s.linkedItem,
        }))}
      />
    </div>
  )
}
