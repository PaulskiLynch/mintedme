import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { price } = await req.json()
  if (!price || price <= 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  const edition = await prisma.itemEdition.findUnique({ where: { id } })
  if (!edition || edition.currentOwnerId !== session.user.id) return NextResponse.json({ error: 'Not your item' }, { status: 403 })
  if (edition.isInAuction)    return NextResponse.json({ error: 'Item is in auction' }, { status: 400 })
  if (edition.hasActiveLoan)  return NextResponse.json({ error: 'Item is used as loan collateral' }, { status: 400 })
  await prisma.itemEdition.update({ where: { id }, data: { isListed: true, listedPrice: price } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const edition = await prisma.itemEdition.findUnique({ where: { id } })
  if (!edition || edition.currentOwnerId !== session.user.id) return NextResponse.json({ error: 'Not your item' }, { status: 403 })
  await prisma.itemEdition.update({ where: { id }, data: { isListed: false, listedPrice: null } })
  return NextResponse.json({ ok: true })
}
