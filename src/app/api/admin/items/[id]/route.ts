import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

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
