import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { maxEditions } from '@/lib/supply'

const VALID_CATEGORIES = ['cars', 'yachts', 'watches', 'art', 'fashion', 'jets', 'mansions', 'collectibles', 'businesses']
const VALID_CLASSES    = ['essential', 'premium', 'elite', 'grail', 'unique']
const USER_MAX_CLASS   = 'grail'
const CLASS_ORDER      = ['essential', 'premium', 'elite', 'grail', 'unique']

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, category, class: itemClass, imageUrl, referencePrice, hasOwnershipCost, ownershipCostPct } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!VALID_CATEGORIES.includes(category))
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  if (!VALID_CLASSES.includes(itemClass))
    return NextResponse.json({ error: 'Invalid class' }, { status: 400 })
  if (!referencePrice || isNaN(Number(referencePrice)) || Number(referencePrice) <= 0)
    return NextResponse.json({ error: 'Valid reference price is required' }, { status: 400 })

  // Non-admins cannot submit unique
  if (itemClass === 'unique' && !session.user.isAdmin)
    return NextResponse.json({ error: 'Only admins can create unique items' }, { status: 403 })

  // Non-admins capped at grail
  if (!session.user.isAdmin && CLASS_ORDER.indexOf(itemClass) > CLASS_ORDER.indexOf(USER_MAX_CLASS))
    return NextResponse.json({ error: 'Class not available' }, { status: 403 })

  const userCount  = await prisma.user.count()
  const maxSupply  = maxEditions(itemClass, userCount)

  const item = await prisma.item.create({
    data: {
      name:             name.trim().slice(0, 80),
      description:      description?.trim().slice(0, 300) || null,
      category,
      class:            itemClass,
      imageUrl:         imageUrl?.trim() || null,
      referencePrice:   Number(referencePrice),
      hasOwnershipCost: Boolean(hasOwnershipCost),
      ownershipCostPct: hasOwnershipCost && ownershipCostPct ? Number(ownershipCostPct) : null,
      totalSupply:      maxSupply,
      isApproved:       false,
      isFrozen:         false,
      creatorId:        session.user.id,
    },
  })

  return NextResponse.json({ ok: true, itemId: item.id })
}
