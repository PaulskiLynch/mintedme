import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json()

  const report = await prisma.report.findUnique({
    where: { id },
    include: { edition: { include: { item: { select: { name: true } } } } },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'dismiss') {
    await prisma.report.update({
      where: { id },
      data: { status: 'reviewed', reviewedBy: session.user.id, reviewedAt: new Date() },
    })
    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_report_dismiss',
      targetType:  'item',
      targetId:    report.editionId ?? undefined,
      after:       { reportId: id, reason: report.reason },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'freeze_edition') {
    if (!report.editionId) return NextResponse.json({ error: 'Report has no linked edition' }, { status: 400 })

    await prisma.$transaction([
      prisma.itemEdition.update({ where: { id: report.editionId }, data: { isFrozen: true } }),
      prisma.report.update({
        where: { id },
        data: { status: 'reviewed', reviewedBy: session.user.id, reviewedAt: new Date() },
      }),
    ])

    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_report_freeze_edition',
      targetType:  'item',
      targetId:    report.editionId,
      after:       { reportId: id, reason: report.reason, item: report.edition?.item.name },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
