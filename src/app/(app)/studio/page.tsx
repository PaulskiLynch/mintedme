import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import StudioClient from './StudioClient'

export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const submissions = await prisma.item.findMany({
    where: { creatorId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, category: true, rarityTier: true,
      isApproved: true, isFrozen: true, createdAt: true, imageUrl: true,
      _count: { select: { editions: true } },
    },
  })

  return (
    <div>
      <div className="page-title">Studio</div>
      <div className="page-sub">Craft items for the marketplace. All submissions require admin approval.</div>
      <StudioClient
        isAdmin={session.user.isAdmin ?? false}
        submissions={submissions.map((s: typeof submissions[0]) => ({
          id:         s.id,
          name:       s.name,
          category:   s.category,
          rarityTier: s.rarityTier,
          isApproved: s.isApproved,
          isFrozen:   s.isFrozen,
          imageUrl:   s.imageUrl,
          editions:   s._count.editions,
          createdAt:  s.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
