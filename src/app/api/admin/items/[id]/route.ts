import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

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
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json()

  const data =
    action === 'approve'   ? { isApproved: true,  isFrozen: false } :
    action === 'reject'    ? { isApproved: false } :
    action === 'freeze'    ? { isFrozen: true  } :
    action === 'unfreeze'  ? { isFrozen: false } :
    null

  if (!data) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  try {
    await prisma.item.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
