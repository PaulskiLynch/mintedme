import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'
import { JOB_BY_CODE } from '@/lib/jobs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json()

  if (action === 'cancel_auction') {
    const auction = await prisma.jobAuction.findUnique({ where: { id } })
    if (!auction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (auction.status !== 'active') return NextResponse.json({ error: 'Only active auctions can be cancelled' }, { status: 400 })

    await prisma.jobAuction.update({ where: { id }, data: { status: 'settled' } })

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_job_auction_cancel',
      targetType:  'cron',
      targetId:    id,
      before:      { status: 'active', jobCode: auction.jobCode },
      after:       { status: 'settled' },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'terminate_holding') {
    const holding = await prisma.jobHolding.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    })
    if (!holding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const jobDef = JOB_BY_CODE[holding.jobCode]

    await prisma.jobHolding.delete({ where: { id } })

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_job_holding_terminate',
      targetType:  'user',
      targetId:    holding.userId,
      after:       { username: holding.user.username, jobCode: holding.jobCode, title: jobDef?.title },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
