import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

// POST /api/groups/[slug]/invite  — owner invites a user by username
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const { username } = await req.json()
  if (!username?.trim()) return NextResponse.json({ error: 'Username required' }, { status: 400 })

  const group = await prisma.group.findUnique({ where: { slug } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only owners can directly invite
  const myMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  })
  if (!myMembership || myMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can invite members' }, { status: 403 })
  }

  const target = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.id === session.user.id) return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: target.id } },
  })
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  if (group.maxMembers) {
    const count = await prisma.groupMember.count({ where: { groupId: group.id } })
    if (count >= group.maxMembers) return NextResponse.json({ error: 'Group is full' }, { status: 409 })
  }

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: target.id, role: 'member' },
  })

  // Notify the invited user
  await prisma.notification.create({
    data: {
      userId:    target.id,
      type:      'group_invite',
      message:   `You've been added to the group "${group.name}"`,
      actionUrl: `/groups/${group.slug}`,
    },
  })

  return NextResponse.json({ ok: true, username: target.username })
}

// GET /api/groups/[slug]/invite?q=username  — search users not yet in group
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase()
  if (!q || q.length < 2) return NextResponse.json([])

  const group = await prisma.group.findUnique({
    where: { slug },
    include: { members: { select: { userId: true } } },
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const memberIds = group.members.map(m => m.userId)

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q, mode: 'insensitive' },
      id: { notIn: memberIds },
    },
    select: { id: true, username: true, avatarUrl: true },
    take: 8,
  })

  return NextResponse.json(users)
}
