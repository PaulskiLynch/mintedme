'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'

interface Props {
  username:     string
  balance:      string
  isAdmin?:     boolean
  unreadCount?: number
}

const NAV = [
  { href: '/feed',          key: 'feed'          },
  { href: '/marketplace',   key: 'market'        },
  { href: '/auctions',      key: 'auctions'      },
  { href: '/jobs',          key: 'jobs'          },
  { href: '/groups',        key: 'groups'        },
  { href: '/leaderboard',   key: 'leaderboard'   },
  { href: '/mint',          key: 'myMint'        },
  { href: '/inbox',         key: 'inbox'         },
  { href: '/notifications', key: 'notifications' },
  { href: '/suggestions',   key: 'suggest'       },
  { href: '/admin',         key: 'admin'         },
] as const

const NAV_ICONS: Record<string, string> = {
  feed: '◎', market: '◈', auctions: '⏱', jobs: '◑', groups: '◍',
  leaderboard: '▲', myMint: '◆', inbox: '✉', notifications: '🔔',
  suggest: '💡', admin: '★',
}

const MOBILE_NAV_PRIMARY = [
  { href: '/feed',        key: 'feed'   },
  { href: '/marketplace', key: 'market' },
  { href: '/jobs',        key: 'jobs'   },
  { href: '/mint',        key: 'mint'   },
] as const

const MOBILE_NAV_PRIMARY_ICONS: Record<string, string> = {
  feed: '◎', market: '◈', jobs: '◑', mint: '◆',
}

const MOBILE_NAV_MORE = [
  { href: '/auctions',      key: 'auctions'      },
  { href: '/groups',        key: 'groups'        },
  { href: '/leaderboard',   key: 'leaderboard'   },
  { href: '/inbox',         key: 'inbox'         },
  { href: '/notifications', key: 'notifications' },
  { href: '/suggestions',   key: 'suggest'       },
  { href: '/wallet',        key: 'wallet'        },
  { href: '/settings',      key: 'settings'      },
  { href: '/admin',         key: 'admin'         },
] as const

const MOBILE_NAV_MORE_ICONS: Record<string, string> = {
  auctions: '⏱', groups: '◍', leaderboard: '▲', inbox: '✉',
  notifications: '🔔', suggest: '💡', wallet: '◉', settings: '⚙', admin: '★',
}

export default function Sidebar({ username, balance, isAdmin = false, unreadCount = 0 }: Props) {
  const path = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const [moreOpen, setMoreOpen] = useState(false)

  const moreActive = MOBILE_NAV_MORE.some(n => path.startsWith(n.href)) ||
    (isAdmin && path.startsWith('/admin'))

  function navTo(href: string) {
    setMoreOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Link href="/feed" className="sidebar-logo" style={{ display: 'block' }}>
          <img src="/logo.png" alt="MilliBux" style={{ width: 120, height: 'auto', display: 'block' }} />
        </Link>

        <div className="sidebar-user">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sidebar-username">@{username}</div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', padding: '2px 0', fontWeight: 600, letterSpacing: '0.04em' }}
              title={t('signOut')}
            >
              {t('signOut')}
            </button>
          </div>
          <div className="sidebar-balance">${Number(balance).toLocaleString()}</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.filter(n => n.key !== 'admin' || isAdmin).map(n => (
            <Link key={n.href} href={n.href} className={`nav-link${path.startsWith(n.href) ? ' active' : ''}`}>
              <span style={{ fontSize: 16 }}>{NAV_ICONS[n.key]}</span>
              {t(n.key)}
              {n.href === '/notifications' && unreadCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#e05a5a', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 900, padding: '1px 6px' }}>{unreadCount}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/wallet" className={`nav-link${path.startsWith('/wallet') ? ' active' : ''}`}>
            <span style={{ fontSize: 16 }}>◎</span>
            {t('wallet')}
          </Link>
          <Link href="/settings" className="nav-link">
            <span style={{ fontSize: 16 }}>⚙</span>
            {t('settings')}
          </Link>
          <div style={{ padding: '8px 4px 4px' }}>
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <Link href="/feed" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="MilliBux" className="mobile-logo" />
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <span className="mobile-balance">${Number(balance).toLocaleString()}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>@{username}</span>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {MOBILE_NAV_PRIMARY.map(n => (
          <Link key={n.href} href={n.href} className={`mobile-nav-item${path.startsWith(n.href) ? ' active' : ''}`}>
            <span className="mobile-nav-icon">{MOBILE_NAV_PRIMARY_ICONS[n.key]}</span>
            <span className="mobile-nav-label">{t(n.key)}</span>
          </Link>
        ))}

        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`mobile-nav-item${moreActive ? ' active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}
        >
          <span className="mobile-nav-icon">≡</span>
          <span className="mobile-nav-label">{t('more')}</span>
          {unreadCount > 0 && !path.startsWith('/notifications') && (
            <span style={{ position: 'absolute', top: 6, right: '50%', transform: 'translateX(8px)', background: '#e05a5a', color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 900, padding: '1px 4px' }}>{unreadCount}</span>
          )}
        </button>
      </nav>

      {/* More drawer */}
      {moreOpen && (
        <>
          <div
            onClick={() => setMoreOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }}
          />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 64, zIndex: 200,
            background: 'var(--bg2)', borderTop: '1px solid var(--border)',
            borderRadius: '16px 16px 0 0',
            padding: '12px 0 8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '0 8px' }}>
              {MOBILE_NAV_MORE.filter(n => n.key !== 'admin' || isAdmin).map(n => (
                <button
                  key={n.href}
                  onClick={() => navTo(n.href)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4, padding: '12px 4px', border: 'none', borderRadius: 10, cursor: 'pointer',
                    background: path.startsWith(n.href) ? 'var(--bg3)' : 'transparent',
                    color: path.startsWith(n.href) ? 'var(--gold)' : 'var(--muted)',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{MOBILE_NAV_MORE_ICONS[n.key]}</span>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{t(n.key)}</span>
                  {n.href === '/notifications' && unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: 8, right: '50%', transform: 'translateX(14px)', background: '#e05a5a', color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 900, padding: '1px 4px' }}>{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <LanguageSwitcher compact />
            </div>
          </div>
        </>
      )}
    </>
  )
}
