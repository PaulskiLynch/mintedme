import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { username, email, password, tagline, balance } = await req.json()
  if (!username || !email || !password) {
    return NextResponse.json({ error: 'username, email and password are required' }, { status: 400 })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        tagline: tagline || null,
        balance: balance ? Number(balance) : 1_000_000,
      },
      select: { id: true, username: true, email: true },
    })
    return NextResponse.json({ ok: true, user })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Username or email already taken' }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
