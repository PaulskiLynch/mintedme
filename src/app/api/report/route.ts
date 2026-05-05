import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { editionId, reason, description } = await req.json()
  if (!editionId || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await prisma.report.create({
    data: { reporterId: session.user.id, editionId, reason, description: description || null },
  })

  return NextResponse.json({ ok: true })
}
