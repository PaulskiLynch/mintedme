import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const {
    name, inspirationName, description, category, rarityTier, imageUrl,
    totalSupply, benchmarkPrice, horsepower, topSpeed, zeroToHundred,
    businessType, businessRiskTier, propertyTier, aircraftType,
    isOfficial, isApproved, isFrozen, itemStatus,
  } = body

  const minimumBid = Math.round(Number(benchmarkPrice) * 0.10)

  try {
    const before = await prisma.item.findUnique({
      where: { id },
      select: { name: true, benchmarkPrice: true, rarityTier: true, itemStatus: true, isApproved: true, isFrozen: true },
    })

    await prisma.item.update({
      where: { id },
      data: {
        name,
        inspirationName:  inspirationName  || null,
        description:      description      || null,
        category,
        rarityTier,
        imageUrl:         imageUrl         || null,
        totalSupply:      Number(totalSupply),
        benchmarkPrice:   Number(benchmarkPrice),
        minimumBid,
        horsepower:       horsepower       ? Number(horsepower)      : null,
        topSpeed:         topSpeed         ? Number(topSpeed)        : null,
        zeroToHundred:    zeroToHundred    ? Number(zeroToHundred)   : null,
        businessType:     businessType     || null,
        businessRiskTier: businessRiskTier || null,
        propertyTier:     propertyTier     || null,
        aircraftType:     aircraftType     || null,
        isOfficial:       !!isOfficial,
        isApproved:       !!isApproved,
        isFrozen:         !!isFrozen,
        itemStatus:       itemStatus       || 'active',
      },
    })

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_item_edit',
      targetType:  'item',
      targetId:    id,
      before:      before ? { ...before, benchmarkPrice: before.benchmarkPrice.toString() } : null,
      after:       { name, category, rarityTier, benchmarkPrice: Number(benchmarkPrice), itemStatus, isApproved: !!isApproved, isFrozen: !!isFrozen },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { action, reason } = body

  if (action === 'mint') {
    const { count } = body
    if (!count || count < 1) return NextResponse.json({ error: 'count must be ≥ 1' }, { status: 400 })

    try {
      const item = await prisma.item.findUnique({ where: { id }, select: { totalSupply: true, name: true } })
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const existing = await prisma.itemEdition.count({ where: { itemId: id } })
      const remaining = item.totalSupply - existing
      if (remaining <= 0) return NextResponse.json({ error: 'Supply cap already reached' }, { status: 400 })

      const toCreate = Math.min(count, remaining)
      const maxEdition = await prisma.itemEdition.findFirst({
        where: { itemId: id }, orderBy: { editionNumber: 'desc' }, select: { editionNumber: true },
      })
      const startFrom = (maxEdition?.editionNumber ?? 0) + 1

      await prisma.itemEdition.createMany({
        data: Array.from({ length: toCreate }, (_, i) => ({ itemId: id, editionNumber: startFrom + i })),
      })

      await logAdminAction({
        adminUserId: session.user.id!,
        action:      'admin_item_mint',
        targetType:  'item',
        targetId:    id,
        after:       { minted: toCreate, editions: `#${startFrom}–#${startFrom + toCreate - 1}`, item: item.name },
      })

      return NextResponse.json({ ok: true, created: toCreate, startFrom, endAt: startFrom + toCreate - 1 })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  if (action === 'freeze') {
    if (!reason?.trim()) return NextResponse.json({ error: 'Reason required to freeze an item' }, { status: 400 })
    try {
      await prisma.item.update({ where: { id }, data: { isFrozen: true } })
      await logAdminAction({ adminUserId: session.user.id!, action: 'admin_item_freeze', targetType: 'item', targetId: id, before: { isFrozen: false }, after: { isFrozen: true }, reason })
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
  }

  if (action === 'unfreeze') {
    try {
      await prisma.item.update({ where: { id }, data: { isFrozen: false } })
      await logAdminAction({ adminUserId: session.user.id!, action: 'admin_item_unfreeze', targetType: 'item', targetId: id, before: { isFrozen: true }, after: { isFrozen: false } })
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
  }

  if (action === 'push_auction') {
    const AUCTION_DURATION_MS = 24 * 60 * 60 * 1000
    try {
      const item = await prisma.item.findUnique({
        where:  { id },
        select: { name: true, benchmarkPrice: true, rarityTier: true, totalSupply: true, isApproved: true },
      })
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (!item.isApproved) return NextResponse.json({ error: 'Approve the item before pushing to auction' }, { status: 400 })

      // Find an unowned, available edition
      let edition = await prisma.itemEdition.findFirst({
        where: { itemId: id, currentOwnerId: null, isInAuction: false, isFrozen: false },
      })

      // If none exists, mint one if supply allows
      if (!edition) {
        const existingCount = await prisma.itemEdition.count({ where: { itemId: id } })
        if (existingCount >= item.totalSupply) {
          return NextResponse.json({ error: 'All editions owned — no supply available to auction' }, { status: 400 })
        }
        const maxEdition = await prisma.itemEdition.findFirst({
          where: { itemId: id }, orderBy: { editionNumber: 'desc' }, select: { editionNumber: true },
        })
        edition = await prisma.itemEdition.create({
          data: { itemId: id, editionNumber: (maxEdition?.editionNumber ?? 0) + 1 },
        })
      }

      const startingBid = Math.round(Number(item.benchmarkPrice) * 0.10)
      const endsAt      = new Date(Date.now() + AUCTION_DURATION_MS)

      const auction = await prisma.$transaction(async (tx) => {
        const a = await tx.auction.create({
          data: {
            editionId:       edition!.id,
            sellerId:        null,
            minimumBid:      startingBid,
            benchmarkPrice:  Number(item.benchmarkPrice),
            rarityTier:      item.rarityTier,
            status:          'active',
            startsAt:        new Date(),
            endsAt,
            isSystemAuction: true,
          },
        })
        await tx.itemEdition.update({ where: { id: edition!.id }, data: { isInAuction: true } })
        return a
      })

      await logAdminAction({
        adminUserId: session.user.id!,
        action:      'admin_item_push_auction',
        targetType:  'item',
        targetId:    id,
        after:       { auctionId: auction.id, item: item.name, startingBid, endsAt: endsAt.toISOString() },
      })

      return NextResponse.json({ ok: true, auctionId: auction.id })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  const data =
    action === 'approve'  ? { isApproved: true,  isFrozen: false } :
    action === 'reject'   ? { isApproved: false } :
    null

  if (!data) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  try {
    await prisma.item.update({ where: { id }, data })
    await logAdminAction({
      adminUserId: session.user.id!,
      action:      action === 'approve' ? 'admin_item_approve' : 'admin_item_reject',
      targetType:  'item',
      targetId:    id,
      after:       data,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
