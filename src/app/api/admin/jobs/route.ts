import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'
import { JOB_BY_CODE } from '@/lib/jobs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { jobCode, endsAt } = await req.json()
  if (!jobCode || !endsAt) return NextResponse.json({ error: 'jobCode and endsAt required' }, { status: 400 })

  const jobDef = JOB_BY_CODE[jobCode]
  if (!jobDef) return NextResponse.json({ error: 'Unknown job code' }, { status: 400 })

  const endsAtDate = new Date(endsAt)
  if (isNaN(endsAtDate.getTime()) || endsAtDate <= new Date()) {
    return NextResponse.json({ error: 'endsAt must be a future date' }, { status: 400 })
  }

  try {
    const auction = await prisma.jobAuction.create({
      data: { jobCode, endsAt: endsAtDate },
    })

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_job_auction_create',
      targetType:  'cron',
      targetId:    auction.id,
      after:       { jobCode, title: jobDef.title, endsAt },
    })

    return NextResponse.json({ ok: true, id: auction.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
