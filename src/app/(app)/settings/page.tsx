import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, tagline: true, avatarUrl: true },
  })
  if (!user) redirect('/login')

  return (
    <div>
      <div className="page-title">Settings</div>
      <div className="page-sub">Update your profile and preferences.</div>
      <div style={{ marginTop: 28 }}>
        <SettingsClient
          username={user.username}
          tagline={user.tagline}
          avatarUrl={user.avatarUrl}
        />
      </div>
    </div>
  )
}
