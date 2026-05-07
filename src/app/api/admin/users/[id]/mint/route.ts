import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'

// GET /api/admin/users/[id]/mint?q=search
// Returns items matching the query, with edition availability info
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const items = await prisma.item.findMany({
    where: {
      name: { contains: q, mode: 'insensitive' },
      isActive: true,
    },
    select: {
      id:       true,
      name:     true,
      imageUrl: true,
      category: true,
      rarityTier: true,
      editions: {
        where: { currentOwnerId: null, isFrozen: false, isInAuction: false },
        select: { id: true, editionNumber: true },
        orderBy: { editionNumber: 'asc' },
        take: 1,
      },
      _count: {
        select: {
          editions: { where: { currentOwnerId: null, isFrozen: false, isInAuction: false } },
        },
      },
    },
    take: 20,
  })

  // Also check if any edition of this item is already owned by this user
  const userEditionItemIds = await prisma.itemEdition.findMany({
    where: { currentOwnerId: id },
    select: { item: { select: { id: true } } },
  })
  const userItemIdSet = new Set(userEditionItemIds.map(e => e.item.id))

  return NextResponse.json(items.map(item => ({
    id:         item.id,
    name:       item.name,
    imageUrl:   item.imageUrl,
    category:   item.category,
    rarityTier: item.rarityTier,
    available:  item._count.editions,
    nextEdition: item.editions[0] ?? null,
    alreadyOwned: userItemIdSet.has(item.id),
  })))
}

// PATCH /api/admin/users/[id]/mint
// { action: 'assign', editionId } — give edition to this user
// { action: 'remove', editionId } — take edition from this user (back to unowned)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: targetUserId } = await params
  const { action, editionId } = await req.json()

  if (!editionId) return NextResponse.json({ error: 'editionId required' }, { status: 400 })

  try {
    if (action === 'assign') {
      const edition = await prisma.itemEdition.findUnique({
        where: { id: editionId },
        include: { item: { select: { name: true } } },
      })
      if (!edition) return NextResponse.json({ error: 'Edition not found' }, { status: 404 })

      const previousOwnerId = edition.currentOwnerId

      await prisma.$transaction([
        // End previous ownership record if any
        ...(previousOwnerId ? [
          prisma.ownership.updateMany({
            where: { editionId, endedAt: null },
            data:  { endedAt: new Date() },
          }),
        ] : []),
        // Assign to target user
        prisma.itemEdition.update({
          where: { id: editionId },
          data: {
            currentOwnerId: targetUserId,
            isListed:       false,
            listedPrice:    null,
          },
        }),
        // Create new ownership record
        prisma.ownership.create({
          data: {
            editionId,
            ownerId:      targetUserId,
            transferType: 'admin_grant',
          },
        }),
      ])

      await logAdminAction({
        adminUserId: session.user.id!,
        action:      'admin_user_edit',
        targetType:  'user',
        targetId:    targetUserId,
        before:      { editionId, previousOwnerId },
        after:       { editionId, newOwnerId: targetUserId, item: edition.item.name },
        reason:      'Admin mint assignment',
      })

      return NextResponse.json({ ok: true })
    }

    if (action === 'remove') {
      const edition = await prisma.itemEdition.findUnique({
        where: { id: editionId },
        include: { item: { select: { name: true } } },
      })
      if (!edition) return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
      if (edition.currentOwnerId !== targetUserId) {
        return NextResponse.json({ error: 'Edition not owned by this user' }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.ownership.updateMany({
          where: { editionId, endedAt: null },
          data:  { endedAt: new Date() },
        }),
        prisma.itemEdition.update({
          where: { id: editionId },
          data: {
            currentOwnerId: null,
            isListed:       false,
            listedPrice:    null,
            highestOffer:   null,
          },
        }),
        // Expire any open offers on this edition
        prisma.offer.updateMany({
          where: { editionId, status: 'pending' },
          data:  { status: 'expired' },
        }),
      ])

      await logAdminAction({
        adminUserId: session.user.id!,
        action:      'admin_user_edit',
        targetType:  'user',
        targetId:    targetUserId,
        before:      { editionId, ownerId: targetUserId, item: edition.item.name },
        after:       { editionId, ownerId: null },
        reason:      'Admin mint removal',
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
