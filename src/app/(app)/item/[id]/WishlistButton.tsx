'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  itemId: string
  userId: string | null
  initialWishlisted: boolean
}

export default function WishlistButton({ itemId, userId, initialWishlisted }: Props) {
  const router = useRouter()
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [busy, setBusy] = useState(false)

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
        gap: 6,
        background: wishlisted ? 'var(--bg3)' : 'transparent',
        border: `1px solid ${wishlisted ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 700,
        color: wishlisted ? 'var(--gold)' : 'var(--muted)',
        cursor: busy ? 'default' : 'pointer',
        width: '100%',
        justifyContent: 'center',
        marginTop: 8,
      }}
    >
      {wishlisted ? '★ On wishlist' : '☆ Add to wishlist'}
    </button>
  )
}
