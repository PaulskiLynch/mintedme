import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tagline } = await req.json()
  await prisma.user.update({ where: { id: session.user.id }, data: { tagline } })
  return NextResponse.json({ ok: true })
}
