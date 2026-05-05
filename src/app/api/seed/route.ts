import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// This route only handles data reset. Use `npx tsx scripts/seed.ts` to seed.
export async function POST(req: NextRequest) {
  const key = req.headers.get('x-seed-key')
  if (key !== process.env.SEED_KEY) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { reset } = await req.json().catch(() => ({ reset: false }))
  if (!reset) return NextResponse.json({ error: 'Pass reset:true to wipe data. Use scripts/seed.ts to seed.' }, { status: 400 })

  try {
    await prisma.auctionMessage.deleteMany()
    await prisma.feedLike.deleteMany()
    await prisma.feedComment.deleteMany()
    await prisma.feedEvent.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.priceHistory.deleteMany()
    await prisma.ownership.deleteMany()
    await prisma.bid.deleteMany()
    await prisma.auction.deleteMany()
    await prisma.offer.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.watchedItem.deleteMany()
    await prisma.itemEdition.deleteMany()
    await prisma.item.deleteMany()
    return NextResponse.json({ ok: true, message: 'Data cleared. Run scripts/seed.ts to reseed.' })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
