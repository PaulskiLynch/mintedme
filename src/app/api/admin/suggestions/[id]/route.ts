import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body   = await req.json()
  const { action } = body

  const sub = await prisma.creatorSubmission.findUnique({ where: { id } })
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sub.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 400 })

  if (action === 'reject') {
    await prisma.creatorSubmission.update({
      where: { id },
      data:  { status: 'rejected', adminNotes: body.adminNotes || null, reviewedBy: session.user.id, reviewedAt: new Date() },
    })
    await prisma.notification.create({
      data: {
        userId:  sub.creatorId,
        type:    'suggestion_rejected',
        message: `Your suggestion "${sub.itemName}" wasn't selected this time.${body.adminNotes ? ' Note: ' + body.adminNotes : ''}`,
        actionUrl: '/suggestions',
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    const { benchmarkPrice, rarityTier, totalSupply, imageUrl, description, seedEdition } = body
    if (!benchmarkPrice || !rarityTier || !totalSupply) {
      return NextResponse.json({ error: 'benchmarkPrice, rarityTier and totalSupply are required' }, { status: 400 })
    }

    const minimumBid = Math.round(Number(benchmarkPrice) * 0.10)

    try {
      const item = await prisma.$transaction(async (tx) => {
        const newItem = await tx.item.create({
          data: {
            name:           sub.itemName,
            category:       sub.category,
            description:    description || sub.description || null,
            rarityTier,
            imageUrl:       imageUrl || null,
            totalSupply:    Number(totalSupply),
            benchmarkPrice: Number(benchmarkPrice),
            minimumBid,
            isApproved:     true,
            itemStatus:     'active',
          },
        })

        if (seedEdition) {
          await tx.itemEdition.create({ data: { itemId: newItem.id, editionNumber: 1 } })
        }

        await tx.creatorSubmission.update({
          where: { id },
          data:  {
            status:      'approved',
            linkedItemId: newItem.id,
            reviewedBy:  session.user.id,
            reviewedAt:  new Date(),
          },
        })

        const discountPrice = Math.round(Number(benchmarkPrice) * 0.5)
        await tx.notification.create({
          data: {
            userId:    sub.creatorId,
            type:      'suggestion_approved',
            message:   `Your suggestion "${sub.itemName}" was approved! You can buy it at 50% off — $${discountPrice.toLocaleString()}.`,
            actionUrl: `/item/${newItem.id}`,
          },
        })

        return newItem
      })
      return NextResponse.json({ ok: true, itemId: item.id })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
