'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  itemId:      string
  totalSupply: number
  minted:      number
  owned:       number
  unowned:     number
}

export default function MintEditionsPanel({ itemId, totalSupply, minted, owned, unowned }: Props) {
  const router  = useRouter()
  const remaining = totalSupply - minted
  const [count, setCount]   = useState(Math.min(1, remaining))
  const [busy, setBusy]     = useState(false)
  const [result, setResult] = useState('')
  const [error, setError]   = useState('')

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)',
    fontSize: 13, boxSizing: 'border-box',
  }

  async function mint() {
    setError(''); setResult('')
    setBusy(true)
    const res  = await fetch(`/api/admin/items/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mint', count }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    setResult(`Minted editions #${data.startFrom}–#${data.endAt} (${data.created} new)`)
    router.refresh()
  }

  return (
    <div style={{ marginTop: 32, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 16 }}>MINT EDITIONS</div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        {[
          { label: 'Minted',    value: minted,    sub: `of ${totalSupply} cap`, colour: 'var(--white)'  },
          { label: 'Owned',     value: owned,      sub: 'by users',              colour: owned > 0 ? 'var(--green)' : 'var(--muted)' },
          { label: 'Unowned',   value: unowned,    sub: 'in system pool',        colour: unowned > 0 ? 'var(--gold)' : 'var(--muted)'  },
          { label: 'Remaining', value: remaining,  sub: 'can still mint',        colour: remaining > 0 ? 'var(--white)' : 'var(--muted)' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.colour }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginTop: 2 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {remaining <= 0 ? (
        <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
          Supply cap reached — increase Total Supply in the form above to mint more.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 140px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 4 }}>HOW MANY</div>
            <input
              style={inp}
              type="number"
              min={1}
              max={remaining}
              value={count}
              onChange={e => setCount(Math.max(1, Math.min(remaining, Number(e.target.value))))}
            />
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>max {remaining}</div>
          </div>
          <button
            onClick={mint}
            disabled={busy || count < 1}
            style={{
              padding: '8px 24px', background: busy ? 'var(--bg3)' : 'var(--gold)',
              color: busy ? 'var(--muted)' : '#000',
              fontWeight: 900, fontSize: 13, borderRadius: 6, border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer', height: 36,
            }}
          >
            {busy ? 'Minting…' : `Mint ${count} edition${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {result && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>{result}</div>}
      {error  && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)',   fontWeight: 700 }}>{error}</div>}
    </div>
  )
}
