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
  { href: '/feed',        label: 'Feed',        icon: '◎' },
  { href: '/marketplace', label: 'Marketplace',  icon: '◈' },
  { href: '/mint',        label: 'My Mint',      icon: '◆' },
  { href: '/studio',      label: 'Studio',       icon: '✦' },
]

export default function Sidebar({ username, balance, isAdmin = false, unreadCount = 0 }: Props) {
  const path = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">MINTED</div>

      <div className="sidebar-user">
        <div className="sidebar-username">@{username}</div>
        <div className="sidebar-balance">${Number(balance).toLocaleString()}</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`nav-link${path.startsWith(n.href) ? ' active' : ''}`}
          >
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <Link href="/inbox" className={`nav-link${path.startsWith('/inbox') ? ' active' : ''}`}>
          <span style={{ fontSize: 16 }}>🔔</span>
          Inbox
          {unreadCount > 0 && (
            <span style={{ marginLeft: 'auto', background: '#e05a5a', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 900, padding: '1px 6px' }}>
              {unreadCount}
            </span>
          )}
        </Link>
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
  )
}
