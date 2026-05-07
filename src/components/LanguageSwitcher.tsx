'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

const LOCALES = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'pl', flag: '🇵🇱' },
]

interface Props {
  compact?: boolean
}

export default function LanguageSwitcher({ compact }: Props) {
  const locale = useLocale()
  const router = useRouter()

  function setLocale(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {LOCALES.map(l => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          title={l.code.toUpperCase()}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        compact ? 0 : 4,
            padding:    compact ? '3px 7px' : '4px 10px',
            borderRadius: 6,
            fontSize:   compact ? 11 : 12,
            fontWeight: 700,
            letterSpacing: '0.05em',
            cursor:     'pointer',
            background: locale === l.code ? 'var(--gold)' : 'transparent',
            color:      locale === l.code ? '#0d0d0d'     : 'var(--muted)',
            border:     `1px solid ${locale === l.code ? 'var(--gold)' : 'var(--border)'}`,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: compact ? 12 : 14 }}>{l.flag}</span>
          {!compact && <span>{l.code.toUpperCase()}</span>}
        </button>
      ))}
    </div>
  )
}
