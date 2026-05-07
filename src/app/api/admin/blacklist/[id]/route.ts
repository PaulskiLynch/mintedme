import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  try {
    const entry = await prisma.blockedEmail.delete({ where: { id } })
    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_blacklist_remove',
      after:       { value: entry.value },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
