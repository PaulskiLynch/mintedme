import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username, tagline, avatarUrl } = await req.json()

  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim().length < 3)
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
      return NextResponse.json({ error: 'Username can only contain letters, numbers and underscores' }, { status: 400 })

    const existing = await prisma.user.findFirst({
      where: { username: username.trim().toLowerCase(), NOT: { id: session.user.id } },
    })
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(username  !== undefined && { username:  username.trim().toLowerCase() }),
      ...(tagline   !== undefined && { tagline:   tagline.trim().slice(0, 120) || null }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl.trim() || null }),
    },
    select: { username: true, tagline: true, avatarUrl: true },
  })

  return NextResponse.json({ ok: true, user: updated })
}
