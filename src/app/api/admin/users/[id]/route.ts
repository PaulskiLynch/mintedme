import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logAdminAction } from '@/lib/adminLog'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { username, email, tagline, avatarUrl, password, balance, isAdmin, isFrozen, isEstablished } = await req.json()

  try {
    const before = await prisma.user.findUnique({
      where: { id }, select: { username: true, email: true, tagline: true, isAdmin: true, isFrozen: true, isEstablished: true, balance: true },
    })

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

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_user_edit',
      targetType:  'user',
      targetId:    id,
      before:      before ? { ...before, balance: before.balance.toString() } : null,
      after:       { username: updated.username, email: updated.email, balance: updated.balance.toString() },
    })

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
  const { action, reason } = body

  if (action === 'adjust_balance') {
    const { delta } = body as { delta?: number }
    if (typeof delta !== 'number' || isNaN(delta)) {
      return NextResponse.json({ error: 'Invalid delta' }, { status: 400 })
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Reason required for balance adjustments' }, { status: 400 })
    }
    try {
      const before  = await prisma.user.findUnique({ where: { id }, select: { balance: true } })
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
          description: `Admin balance adjustment: ${delta > 0 ? '+' : ''}${delta.toLocaleString()} — ${reason}`,
        },
      })
      await logAdminAction({
        adminUserId: session.user.id!,
        action:      'admin_balance_adjust',
        targetType:  'user',
        targetId:    id,
        before:      { balance: before?.balance.toString() },
        after:       { balance: updated.balance.toString(), delta },
        reason,
      })
      return NextResponse.json({ ok: true, balance: updated.balance.toString() })
    } catch {
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
  }

  if (action === 'freeze') {
    if (!reason?.trim()) return NextResponse.json({ error: 'Reason required to freeze a user' }, { status: 400 })
    try {
      await prisma.user.update({ where: { id }, data: { isFrozen: true } })
      await logAdminAction({ adminUserId: session.user.id!, action: 'admin_user_freeze', targetType: 'user', targetId: id, before: { isFrozen: false }, after: { isFrozen: true }, reason })
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
  }

  if (action === 'unfreeze') {
    try {
      await prisma.user.update({ where: { id }, data: { isFrozen: false } })
      await logAdminAction({ adminUserId: session.user.id!, action: 'admin_user_unfreeze', targetType: 'user', targetId: id, before: { isFrozen: true }, after: { isFrozen: false } })
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
  }

  if (action === 'make_admin') {
    try {
      await prisma.user.update({ where: { id }, data: { isAdmin: true } })
      await logAdminAction({ adminUserId: session.user.id!, action: 'admin_grant_admin', targetType: 'user', targetId: id, before: { isAdmin: false }, after: { isAdmin: true } })
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
  }

  if (action === 'remove_admin') {
    try {
      await prisma.user.update({ where: { id }, data: { isAdmin: false } })
      await logAdminAction({ adminUserId: session.user.id!, action: 'admin_revoke_admin', targetType: 'user', targetId: id, before: { isAdmin: true }, after: { isAdmin: false } })
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
  }

  if (action === 'mark_established') {
    try {
      await prisma.user.update({ where: { id }, data: { isEstablished: true } })
      await logAdminAction({ adminUserId: session.user.id!, action: 'admin_mark_established', targetType: 'user', targetId: id, before: { isEstablished: false }, after: { isEstablished: true } })
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Prevent self-delete
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        username: true,
        email: true,
        _count: {
          select: {
            ownedEditions: true,
            bids:          true,
            offersAsBuyer: true,
            ownerships:    true,
          },
        },
      },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const hasActivity = user._count.ownedEditions > 0
      || user._count.bids > 0
      || user._count.offersAsBuyer > 0
      || user._count.ownerships > 0

    if (hasActivity) {
      return NextResponse.json({
        error: `Cannot delete @${user.username} — they have active editions, bids, or trade history. Freeze the account instead.`,
      }, { status: 409 })
    }

    // Safe to delete: clean up related records first, then the user
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.watchedItem.deleteMany({ where: { userId: id } }),
      prisma.wishlist.deleteMany({ where: { userId: id } }),
      prisma.feedEvent.deleteMany({ where: { userId: id } }),
      prisma.feedLike.deleteMany({ where: { userId: id } }),
      prisma.feedComment.deleteMany({ where: { userId: id } }),
      prisma.transaction.deleteMany({ where: { OR: [{ toUserId: id }, { fromUserId: id }] } }),
      prisma.user.delete({ where: { id } }),
    ])

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_user_delete',
      targetType:  'user',
      targetId:    id,
      after:       { username: user.username, email: user.email },
      reason:      'Admin hard delete',
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
