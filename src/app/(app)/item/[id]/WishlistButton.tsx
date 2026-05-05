'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  itemId: string
  userId: string | null
  initialWishlisted: boolean
  initialCount: number
}

export default function WishlistButton({ itemId, userId, initialWishlisted, initialCount }: Props) {
  const router = useRouter()
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [count, setCount]           = useState(initialCount)
  const [busy, setBusy]             = useState(false)

  async function toggle() {
    if (!userId) { router.push('/login'); return }
    setBusy(true)
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    })
    if (res.ok) {
      const json = await res.json()
      setWishlisted(json.wishlisted)
      setCount(c => json.wishlisted ? c + 1 : Math.max(0, c - 1))
    }
    setBusy(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: wishlisted ? 'var(--bg3)' : 'transparent',
        border: `1px solid ${wishlisted ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 700,
        color: wishlisted ? 'var(--gold)' : 'var(--muted)',
        cursor: busy ? 'default' : 'pointer',
        width: '100%',
        marginTop: 8,
      }}
    >
      <span>{wishlisted ? '👀 Watching' : '👀 Watch asset'}</span>
      {count > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>
          {count} player{count !== 1 ? 's' : ''}
        </span>
      )}
    </button>
  )
}
