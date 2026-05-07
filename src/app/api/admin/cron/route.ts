import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logAdminAction } from '@/lib/adminLog'

export async function POST() {
  const session = await auth()
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const secret  = process.env.CRON_SECRET ?? ''
  // VERCEL_URL is injected automatically by Vercel for every deployment.
  // NEXTAUTH_URL is typically set to http://localhost:3000 and must not be used server-side on Vercel.
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL ?? 'http://localhost:3000')

  const res  = await fetch(`${baseUrl}/api/cron/auctions`, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
  const data = await res.json()

  await logAdminAction({
    adminUserId: session.user.id!,
    action:      'admin_cron_run',
    targetType:  'cron',
    after:       { ok: res.ok, log: data.log?.slice(0, 10) },
  })

  return NextResponse.json(data)
}
