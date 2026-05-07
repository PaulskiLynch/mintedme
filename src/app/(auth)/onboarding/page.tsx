'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function OnboardingPage() {
  const router = useRouter()
  const t = useTranslations('onboarding')

  const [tagline, setTagline] = useState('')
  const [saving, setSaving]   = useState(false)

  const TAGS = [
    t('tags.collector'),
    t('tags.hustler'),
    t('tags.yacht'),
    t('tags.art'),
    t('tags.car'),
    t('tags.fashion'),
    t('tags.realEstate'),
    t('tags.watch'),
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/me/tagline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagline }),
    })
    router.push('/marketplace')
  }

  return (
    <div className="onboard-wrap">
      <div className="onboard-box">
        <div className="onboard-million">$1,000,000</div>
        <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700, marginBottom: 24 }}>
          {t('added')}
        </div>
        <h2 className="onboard-h2">{t('question')}</h2>
        <p className="onboard-sub">{t('subtitle')}</p>

        <form onSubmit={handleSubmit}>
          <input
            className="form-input"
            style={{ textAlign: 'center', fontSize: 17, padding: '14px 16px' }}
            placeholder={t('placeholder')}
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            maxLength={140}
            autoFocus
          />

          <div className="onboard-tags">
            {TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                className={`onboard-tag${tagline === tag ? ' selected' : ''}`}
                onClick={() => setTagline(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            className="btn btn-gold btn-full"
            type="submit"
            disabled={saving}
            style={{ marginTop: 32, padding: '14px 0', fontSize: 16 }}
          >
            {saving ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
