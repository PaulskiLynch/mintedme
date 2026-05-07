import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const group = await prisma.group.findUnique({ where: { slug } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  })
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  if (group.joinType === 'invite_only') {
    const { inviteCode } = await req.json().catch(() => ({}))
    if (!inviteCode || inviteCode !== group.inviteCode) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
    }
  }

  if (group.maxMembers) {
    const count = await prisma.groupMember.count({ where: { groupId: group.id } })
    if (count >= group.maxMembers) return NextResponse.json({ error: 'Group is full' }, { status: 409 })
  }

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.user.id, role: 'member' },
  })

  return NextResponse.json({ ok: true })
}
