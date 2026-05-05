import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { maxEditions } from '@/lib/supply'

const VALID_CATEGORIES = ['cars', 'yachts', 'watches', 'art', 'fashion', 'jets', 'mansions', 'collectibles', 'businesses']
const VALID_RARITIES   = ['Common', 'Rare', 'Exotic', 'Legendary', 'Mythic']

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, category, rarityTier, imageUrl, suggestedPrice } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!VALID_CATEGORIES.includes(category))
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  if (!VALID_RARITIES.includes(rarityTier))
    return NextResponse.json({ error: 'Invalid rarity tier' }, { status: 400 })
  if (!suggestedPrice || isNaN(Number(suggestedPrice)) || Number(suggestedPrice) <= 0)
    return NextResponse.json({ error: 'Valid suggested price is required' }, { status: 400 })

  // Non-admins cannot create Legendary or Mythic items
  if (['Legendary', 'Mythic'].includes(rarityTier) && !session.user.isAdmin)
    return NextResponse.json({ error: 'Only admins can create Legendary or Mythic items' }, { status: 403 })

  const benchmark  = Number(suggestedPrice)
  const minimumBid = Math.round(benchmark * 0.1)
  const userCount  = await prisma.user.count()
  const maxSupply  = maxEditions(rarityTier, userCount)

  const item = await prisma.item.create({
    data: {
      name:           name.trim().slice(0, 80),
      description:    description?.trim().slice(0, 300) || null,
      category,
      rarityTier,
      imageUrl:       imageUrl?.trim() || null,
      benchmarkPrice: benchmark,
      minimumBid,
      totalSupply:    maxSupply,
      isApproved:     false,
      isFrozen:       false,
      isOfficial:     false,
      creatorId:      session.user.id,
    },
  })

  return NextResponse.json({ ok: true, itemId: item.id })
}
