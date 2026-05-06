import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: 200, background: 'var(--bg2)', borderRight: '1px solid var(--border)', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gold)' }}>ADMIN</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>MilliBux</div>
        </div>
        {[
          { href: '/admin',             label: 'Overview'     },
          { href: '/admin/items',       label: 'Items'        },
          { href: '/admin/items/new',   label: '+ New Item'   },
          { href: '/admin/users',       label: 'Users'        },
          { href: '/admin/auctions',    label: 'Auctions'     },
          { href: '/admin/transactions',label: 'Transactions' },
          { href: '/admin/suggestions', label: 'Suggestions'  },
          { href: '/admin/cron',        label: 'Cron Runner'  },
        ].map(({ href, label }) => (
          <Link key={href} href={href} style={{ display: 'block', padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'var(--white)', textDecoration: 'none' }}
            className="admin-nav-link">
            {label}
          </Link>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
          <Link href="/" style={{ display: 'block', padding: '10px 20px', fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back to app
          </Link>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
