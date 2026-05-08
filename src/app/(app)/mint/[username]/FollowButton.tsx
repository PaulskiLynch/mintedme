'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  targetUserId:    string
  initialFollowing: boolean
  initialCount:    number
  userId:          string | null
}

export default function FollowButton({ targetUserId, initialFollowing, initialCount, userId }: Props) {
  const t      = useTranslations('mint')
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [count,     setCount]     = useState(initialCount)
  const [busy,      setBusy]      = useState(false)

  async function toggle() {
    if (!userId) { router.push('/login'); return }
    setBusy(true)
    const res = await fetch('/api/follow', {
      method:  following ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ targetUserId }),
    })
    if (res.ok) {
      setFollowing(f => !f)
      setCount(c => following ? c - 1 : c + 1)
    }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={toggle}
        disabled={busy}
        className={following ? 'btn btn-outline btn-sm' : 'btn btn-gold btn-sm'}
        style={{ minWidth: 90 }}
      >
        {busy ? '…' : following ? t('followingBtn') : t('follow')}
      </button>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        {t('followerCount', { n: count })}
      </span>
    </div>
  )
}
