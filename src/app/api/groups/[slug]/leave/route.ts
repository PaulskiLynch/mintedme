import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const group = await prisma.group.findUnique({ where: { slug } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 409 })

  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } })

  if (membership.role === 'owner') {
    if (memberCount === 1) {
      // Last member — delete the group entirely
      await prisma.$transaction([
        prisma.groupMember.delete({ where: { groupId_userId: { groupId: group.id, userId: session.user.id } } }),
        prisma.group.delete({ where: { id: group.id } }),
      ])
      return NextResponse.json({ deleted: true })
    }
    // Transfer ownership to oldest non-owner member
    const next = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId: { not: session.user.id } },
      orderBy: { joinedAt: 'asc' },
    })
    if (next) {
      await prisma.groupMember.update({
        where: { groupId_userId: { groupId: next.groupId, userId: next.userId } },
        data: { role: 'owner' },
      })
    }
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  })

  return NextResponse.json({ ok: true })
}
