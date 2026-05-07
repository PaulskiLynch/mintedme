import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, username, password, inviteCode } = await req.json()
    if (!email || !username || !password) {
      return NextResponse.json({ error: 'All fields required.' }, { status: 400 })
    }

    // Email blacklist — check full address and @domain
    const emailLower  = email.trim().toLowerCase()
    const emailDomain = '@' + (emailLower.split('@')[1] ?? '')
    const blocked = await prisma.blockedEmail.findFirst({
      where: { value: { in: [emailLower, emailDomain] } },
    })
    if (blocked) {
      return NextResponse.json({ error: 'This email address is not permitted.' }, { status: 403 })
    }

    const requiredCode = process.env.INVITE_CODE
    if (requiredCode) {
      if (!inviteCode || inviteCode.trim().toUpperCase() !== requiredCode.trim().toUpperCase()) {
        return NextResponse.json({ error: 'Invalid invite code.' }, { status: 403 })
      }
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3-30 characters, letters/numbers/underscores only.' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
    })
    if (existing) {
      return NextResponse.json({ error: existing.email === email.toLowerCase() ? 'Email already in use.' : 'Username taken.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
      },
    })

    await prisma.transaction.create({
      data: {
        toUserId:    user.id,
        amount:      1000000,
        type:        'starting_bonus',
        description: 'Welcome to MilliBux — your $1,000,000 starting balance.',
      },
    })

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
