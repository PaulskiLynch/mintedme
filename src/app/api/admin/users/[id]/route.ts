import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { username, email, tagline, avatarUrl, password, balance, isAdmin, isFrozen, isEstablished } = await req.json()

  try {
    const data: Record<string, unknown> = {}
    if (username  !== undefined) data.username  = username.toLowerCase().trim()
    if (email     !== undefined) data.email     = email.toLowerCase().trim()
    if (tagline   !== undefined) data.tagline   = tagline || null
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null
    if (isAdmin   !== undefined) data.isAdmin   = isAdmin
    if (isFrozen  !== undefined) data.isFrozen  = isFrozen
    if (isEstablished !== undefined) data.isEstablished = isEstablished
    if (balance   !== undefined) data.balance   = Number(balance)
    if (password)                data.passwordHash = await bcrypt.hash(password, 12)

    const updated = await prisma.user.update({ where: { id }, data, select: { id: true, username: true, email: true, balance: true } })
    return NextResponse.json({ ok: true, user: updated })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) return NextResponse.json({ error: 'Username or email already taken' }, { status: 400 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { action } = body

  if (action === 'adjust_balance') {
    const { delta } = body as { delta?: number }
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
