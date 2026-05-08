import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getTranslations } from 'next-intl/server'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [session, t] = await Promise.all([auth(), getTranslations('settings')])
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, tagline: true, avatarUrl: true },
  })
  if (!user) redirect('/login')

  return (
    <div>
      <div className="page-title">{t('title')}</div>
      <div className="page-sub">{t('subtitle')}</div>
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
