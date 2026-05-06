import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SuggestionsClient from './SuggestionsClient'

export const dynamic = 'force-dynamic'

export default async function SuggestionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const submissions = await prisma.creatorSubmission.findMany({
    where:   { creatorId: session.user.id },
    include: { linkedItem: { select: { id: true, name: true, imageUrl: true, benchmarkPrice: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-title">Product Suggestions</div>
      <div className="page-sub">
        Suggest a car or business to add to MilliBux. If your suggestion is selected, you get to buy it at 50% off.
      </div>
      <SuggestionsClient
        submissions={submissions.map(s => ({
          id:          s.id,
          itemName:    s.itemName,
          category:    s.category,
          description: s.description,
          status:      s.status,
          adminNotes:  s.adminNotes,
          createdAt:   s.createdAt.toISOString(),
          discountUsed: s.discountUsed,
          linkedItem: s.linkedItem ? {
            id:             s.linkedItem.id,
            name:           s.linkedItem.name,
            imageUrl:       s.linkedItem.imageUrl,
            benchmarkPrice: s.linkedItem.benchmarkPrice.toString(),
          } : null,
        }))}
      />
    </div>
  )
}
