import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// POST /api/groups — create a group
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, joinType, maxMembers } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const baseSlug = toSlug(name.trim())
  if (!baseSlug) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })

  // Ensure unique slug
  let slug = baseSlug
  let attempt = 0
  while (await prisma.group.findUnique({ where: { slug } })) {
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const inviteCode = joinType === 'invite_only' ? randomCode() : null

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      joinType:    joinType === 'invite_only' ? 'invite_only' : 'open',
      inviteCode,
      maxMembers:  maxMembers ? Number(maxMembers) : null,
      createdById: session.user.id,
      members: {
        create: { userId: session.user.id, role: 'owner' }
      },
    },
  })

  return NextResponse.json({ slug: group.slug })
}
