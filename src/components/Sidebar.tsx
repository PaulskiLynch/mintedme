'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  username: string
  balance: string
  isAdmin?: boolean
  unreadCount?: number
}

const NAV = [
  { href: '/feed',          label: 'Feed',          icon: '◎' },
  { href: '/marketplace',   label: 'Market',         icon: '◈' },
  { href: '/auctions',      label: 'Auctions',       icon: '⏱' },
  { href: '/jobs',          label: 'Jobs',           icon: '◑' },
  { href: '/leaderboard',   label: 'Leaderboard',    icon: '▲' },
  { href: '/mint',          label: 'My Mint',        icon: '◆' },
  { href: '/inbox',         label: 'Inbox',          icon: '✉' },
  { href: '/notifications', label: 'Notifications',  icon: '🔔' },
]

const MOBILE_NAV = [
  { href: '/feed',          label: 'Feed',    icon: '◎' },
  { href: '/marketplace',   label: 'Market',  icon: '◈' },
  { href: '/leaderboard',   label: 'Ranks',   icon: '▲' },
  { href: '/mint',          label: 'Mint',    icon: '◆' },
  { href: '/notifications', label: 'Alerts',  icon: '🔔' },
]

export default function Sidebar({ username, balance, isAdmin = false, unreadCount = 0 }: Props) {
  const path = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Link href="/feed" className="sidebar-logo" style={{ display: 'block' }}>
          <img src="/logo.png" alt="MilliBux" style={{ width: 120, height: 'auto', display: 'block' }} />
        </Link>

        <div className="sidebar-user">
          <div className="sidebar-username">@{username}</div>
          <div className="sidebar-balance">${Number(balance).toLocaleString()}</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`nav-link${path.startsWith(n.href) ? ' active' : ''}`}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              {n.label}
              {n.href === '/notifications' && unreadCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#e05a5a', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 900, padding: '1px 6px' }}>{unreadCount}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/wallet" className={`nav-link${path.startsWith('/wallet') ? ' active' : ''}`}>
            <span style={{ fontSize: 16 }}>◎</span>
            Wallet
          </Link>
          <Link href="/settings" className="nav-link">
            <span style={{ fontSize: 16 }}>⚙</span>
            Settings
          </Link>
          {isAdmin && (
            <Link href="/admin" className="nav-link" style={{ color: 'var(--gold)' }}>
              <span style={{ fontSize: 16 }}>★</span>
              Admin
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <img src="/logo.png" alt="MilliBux" className="mobile-logo" style={{ height: 32, width: 'auto' }} />
        <span className="mobile-balance">${Number(balance).toLocaleString()}</span>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {MOBILE_NAV.map(n => (
          <Link key={n.href} href={n.href} className={`mobile-nav-item${path.startsWith(n.href) ? ' active' : ''}`}>
            <span className="mobile-nav-icon">{n.icon}</span>
            <span className="mobile-nav-label">{n.label}</span>
            {n.href === '/notifications' && unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 6, right: '50%', transform: 'translateX(8px)', background: '#e05a5a', color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 900, padding: '1px 4px' }}>{unreadCount}</span>
            )}
          </Link>
        ))}
      </nav>
    </>
  )
}
