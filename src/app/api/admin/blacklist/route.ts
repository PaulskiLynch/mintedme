import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logAdminAction } from '@/lib/adminLog'

export async function GET() {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const entries = await prisma.blockedEmail.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { value, reason } = await req.json()
  if (!value?.trim()) return NextResponse.json({ error: 'Value required' }, { status: 400 })

  const normalised = value.trim().toLowerCase()

  try {
    const entry = await prisma.blockedEmail.create({
      data: { value: normalised, reason: reason?.trim() || null },
    })
    await logAdminAction({
      adminUserId: session.user.id!,
      action:      'admin_blacklist_add',
      after:       { value: normalised, reason },
    })
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: 'Already blacklisted or invalid value.' }, { status: 400 })
  }
}
