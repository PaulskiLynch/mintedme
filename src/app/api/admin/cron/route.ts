import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const secret  = process.env.CRON_SECRET ?? ''
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const res  = await fetch(`${baseUrl}/api/cron/auctions`, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
  const data = await res.json()
  return NextResponse.json(data)
}
