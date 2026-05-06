import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    name, inspirationName, description, category, rarityTier, imageUrl,
    totalSupply, benchmarkPrice, horsepower, topSpeed, zeroToHundred,
    businessType, businessRiskTier, propertyTier, aircraftType,
    isOfficial, isApproved, itemStatus, seedEdition,
  } = body

  if (!name || !category || !rarityTier || !totalSupply || !benchmarkPrice) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const minimumBid = Math.round(Number(benchmarkPrice) * 0.10)

  try {
    const item = await prisma.item.create({
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
        horsepower:       horsepower       ? Number(horsepower)    : null,
        topSpeed:         topSpeed         ? Number(topSpeed)      : null,
        zeroToHundred:    zeroToHundred    ? Number(zeroToHundred) : null,
        businessType:     businessType     || null,
        businessRiskTier: businessRiskTier || null,
        propertyTier:     propertyTier     || null,
        aircraftType:     aircraftType     || null,
        isOfficial:       !!isOfficial,
        isApproved:       isApproved !== false,
        itemStatus:       itemStatus        || 'active',
      },
    })

    if (seedEdition) {
      await prisma.itemEdition.create({
        data: { itemId: item.id, editionNumber: 1 },
      })
    }

    return NextResponse.json({ ok: true, id: item.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
