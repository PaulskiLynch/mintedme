'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id:        string
  type:      string
  message:   string
  isRead:    boolean
  actionUrl: string | null
  createdAt: string
}

interface Props {
  initial: Notification[]
}

const TYPE_ICON: Record<string, string> = {
  offer_accepted:  '✅',
  offer_declined:  '❌',
  offer_countered: '↩️',
  offer_received:  '💌',
  auction_won:     '🏆',
  outbid:          '⚠️',
  auction_ended:   '⏱',
  group_invite:    '◍',
}

export default function NotificationsClient({ initial }: Props) {
  const t = useTranslations('notifications')
  const [items, setItems] = useState(initial)

  const newItems     = items.filter(n => !n.isRead)
  const earlierItems = items.filter(n => n.isRead)

  async function deleteOne(id: string) {
    setItems(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  }

  async function clearAll() {
    setItems([])
    await fetch('/api/notifications', { method: 'DELETE' })
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
        {t('empty')}
      </div>
    )
  }

  return (
    <div>
      {newItems.length > 0 && (
        <Section label={t('newSection', { n: newItems.length })} items={newItems} onDelete={deleteOne} isNew />
      )}
      {earlierItems.length > 0 && (
        <Section
          label={t('earlierSection')}
          items={earlierItems}
          onDelete={deleteOne}
          isNew={false}
          style={{ marginTop: newItems.length > 0 ? 28 : 0 }}
        />
      )}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={clearAll}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
        >
          {t('clearAll')}
        </button>
      </div>
    </div>
  )
}

function Section({
  label, items, onDelete, isNew, style,
}: {
  label:    string
  items:    Notification[]
  onDelete: (id: string) => void
  isNew:    boolean
  style?:   React.CSSProperties
}) {
  const t = useTranslations('notifications')
  return (
    <div style={style}>
      <div style={{ fontSize: 11, fontWeight: 900, color: isNew ? 'var(--gold)' : 'var(--muted)', letterSpacing: '0.1em', marginBottom: 10 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(n => (
          <NotificationRow key={n.id} n={n} isNew={isNew} onDelete={onDelete} dismissLabel={t('dismiss')} viewLabel={t('view')} />
        ))}
      </div>
    </div>
  )
}

function NotificationRow({
  n, isNew, onDelete, dismissLabel, viewLabel,
}: {
  n:            Notification
  isNew:        boolean
  onDelete:     (id: string) => void
  dismissLabel: string
  viewLabel:    string
}) {
  const [offsetX, setOffsetX]   = useState(0)
  const [swiping, setSwiping]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const touchStartX             = useRef<number | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setSwiping(false)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < -4) {
      setSwiping(true)
      setOffsetX(Math.max(delta, -80))
    }
  }

  function onTouchEnd() {
    if (offsetX < -56) {
      setDeleting(true)
      onDelete(n.id)
    } else {
      setOffsetX(0)
    }
    setSwiping(false)
    touchStartX.current = null
  }

  if (deleting) return null

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
      {/* Delete zone revealed by swipe */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
        background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10,
      }}>
        <span style={{ fontSize: 18, color: '#fff' }}>🗑</span>
      </div>

      {/* Card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform:  `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          background: isNew ? 'var(--bg2)' : 'var(--bg2)',
          border:     `1px solid ${isNew ? 'rgba(200,169,110,0.35)' : 'var(--border)'}`,
          borderLeft: isNew ? '3px solid var(--gold)' : '1px solid var(--border)',
          borderRadius: 10,
          padding:    '13px 14px',
          display:    'flex',
          gap:        12,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[n.type] ?? '🔔'}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: isNew ? 700 : 400, lineHeight: 1.4 }}>{n.message}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </div>
        </div>

        {n.actionUrl && (
          <Link
            href={n.actionUrl}
            className="btn btn-gold btn-sm"
            style={{ flexShrink: 0, fontSize: 12, padding: '5px 12px' }}
          >
            {viewLabel}
          </Link>
        )}

        <button
          onClick={() => { setDeleting(true); onDelete(n.id) }}
          style={{
            flexShrink: 0, background: 'none', border: 'none',
            color: 'var(--border)', fontSize: 16, cursor: 'pointer', padding: '4px 6px',
            lineHeight: 1, borderRadius: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--border)')}
          title={dismissLabel}
        >
          ×
        </button>
      </div>
    </div>
  )
}
