import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const [session, t] = await Promise.all([auth(), getTranslations('groups')])
  if (!session?.user?.id) redirect('/login')

  const [myGroups, openGroups] = await Promise.all([
    prisma.group.findMany({
      where: { members: { some: { userId: session.user.id } } },
      include: {
        _count: { select: { members: true } },
        members: { where: { userId: session.user.id }, select: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.group.findMany({
      where: {
        joinType: 'open',
        members:  { none: { userId: session.user.id } },
      },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="page-title">{t('title')}</div>
          <div className="page-sub">{t('subtitle')}</div>
        </div>
        <Link href="/groups/new" className="btn btn-primary" style={{ flexShrink: 0, marginTop: 4 }}>
          {t('createGroup')}
        </Link>
      </div>

      {/* Your groups */}
      {myGroups.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 12 }}>{t('yourGroups')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myGroups.map(g => (
              <Link
                key={g.id}
                href={`/groups/${g.slug}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 10, textDecoration: 'none', color: 'inherit',
                  transition: 'border-color 0.15s',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--white)', marginBottom: 2 }}>{g.name}</div>
                  {g.description && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 400 }}>{g.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--white)' }}>{g._count.members}</div>
                    <div>{t('members')}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
                    background: g.members[0]?.role === 'owner' ? 'rgba(200,169,110,0.15)' : 'var(--bg3)',
                    color: g.members[0]?.role === 'owner' ? 'var(--gold)' : 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}>
                    {g.members[0]?.role === 'owner' ? t('roleOwnerFull').toUpperCase() : t('roleMember').toUpperCase()}
                  </div>
                  {g.joinType === 'invite_only' && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>🔒</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse open groups */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 12 }}>{t('openGroups')}</div>
        {openGroups.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
            {t('noOpenGroups')} <Link href="/groups/new" style={{ color: 'var(--gold)' }}>{t('createOne')}</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openGroups.map(g => (
              <Link
                key={g.id}
                href={`/groups/${g.slug}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 10, textDecoration: 'none', color: 'inherit',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--white)', marginBottom: 2 }}>{g.name}</div>
                  {g.description && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 400 }}>{g.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--white)' }}>{g._count.members}</div>
                    <div>{t('members')}</div>
                  </div>
                  <span className="btn btn-outline" style={{ fontSize: 12, padding: '5px 14px' }}>{t('join')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
