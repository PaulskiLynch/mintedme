import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.user.update({ where: { id: session.user.id }, data: { lastSeenAt: new Date() } })
  return NextResponse.json({ ok: true })
}
