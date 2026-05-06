import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json()

  if (action === 'adjust_balance') {
    const { delta } = await req.json().catch(() => ({})) as { delta?: number }
    if (typeof delta !== 'number' || isNaN(delta)) {
      return NextResponse.json({ error: 'Invalid delta' }, { status: 400 })
    }
    try {
      const updated = await prisma.user.update({
        where: { id },
        data:  { balance: { increment: delta } },
        select: { balance: true },
      })
      await prisma.transaction.create({
        data: {
          toUserId:    delta > 0 ? id : null,
          fromUserId:  delta < 0 ? id : null,
          amount:      Math.abs(delta),
          type:        'admin_adjustment',
          description: `Admin balance adjustment: ${delta > 0 ? '+' : ''}${delta.toLocaleString()}`,
        },
      })
      return NextResponse.json({ ok: true, balance: updated.balance.toString() })
    } catch {
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
  }

  const data =
    action === 'freeze'           ? { isFrozen: true  } :
    action === 'unfreeze'         ? { isFrozen: false } :
    action === 'make_admin'       ? { isAdmin: true   } :
    action === 'remove_admin'     ? { isAdmin: false  } :
    action === 'mark_established' ? { isEstablished: true } :
    null

  if (!data) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  try {
    await prisma.user.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
