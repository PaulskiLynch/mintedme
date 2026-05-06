import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submissions = await prisma.creatorSubmission.findMany({
    where:   { creatorId: session.user.id },
    include: { linkedItem: { select: { id: true, name: true, imageUrl: true, benchmarkPrice: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ submissions })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemName, category, description } = await req.json()
  if (!itemName?.trim() || !category?.trim()) {
    return NextResponse.json({ error: 'Item name and category are required' }, { status: 400 })
  }

  // Limit: max 3 pending suggestions at a time
  const pending = await prisma.creatorSubmission.count({
    where: { creatorId: session.user.id, status: 'pending' },
  })
  if (pending >= 3) {
    return NextResponse.json({ error: 'You can have at most 3 pending suggestions at a time' }, { status: 400 })
  }

  const submission = await prisma.creatorSubmission.create({
    data: {
      creatorId:   session.user.id,
      itemName:    itemName.trim(),
      category:    category.trim(),
      description: description?.trim() || null,
    },
  })
  return NextResponse.json({ ok: true, id: submission.id })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const sub = await prisma.creatorSubmission.findUnique({ where: { id } })
  if (!sub || sub.creatorId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sub.status !== 'pending') return NextResponse.json({ error: 'Can only withdraw pending suggestions' }, { status: 400 })

  await prisma.creatorSubmission.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
