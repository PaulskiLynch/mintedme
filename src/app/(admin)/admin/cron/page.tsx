'use client'

import { useState } from 'react'

export default function CronPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult]   = useState<{ log: string[]; ok: boolean; upkeepCharged?: number; upkeepDebted?: number; liquidated?: number; salaryPaid?: number; incomesPaid?: number; created?: number } | null>(null)
  const [error, setError]     = useState('')

  async function run() {
    setRunning(true); setResult(null); setError('')
    const res  = await fetch('/api/admin/cron', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setRunning(false); return }
    setResult(data)
    setRunning(false)
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Cron Runner</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
        Manually trigger the cron job: settle auctions, pay salaries, charge upkeep, pay business income.
      </div>

      <button
        onClick={run}
        disabled={running}
        style={{ padding: '12px 32px', background: running ? 'var(--bg3)' : 'var(--gold)', color: running ? 'var(--muted)' : '#000', fontWeight: 900, fontSize: 14, borderRadius: 8, border: 'none', cursor: running ? 'not-allowed' : 'pointer' }}
      >
        {running ? 'Running...' : 'Run Cron Now'}
      </button>

      {error && (
        <div style={{ marginTop: 20, color: 'var(--red)', fontWeight: 700 }}>{error}</div>
      )}

      {result && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Auctions Created',  value: result.created        ?? 0, colour: 'var(--gold)'  },
              { label: 'Upkeep Charged',    value: result.upkeepCharged  ?? 0, colour: 'var(--green)' },
              { label: 'Upkeep Debted',     value: result.upkeepDebted   ?? 0, colour: result.upkeepDebted ? 'var(--red)' : 'var(--muted)' },
              { label: 'Liquidations',      value: result.liquidated     ?? 0, colour: result.liquidated ? 'var(--red)' : 'var(--muted)'  },
              { label: 'Salaries Paid',     value: result.salaryPaid     ?? 0, colour: 'var(--gold)'  },
              { label: 'Business Incomes',  value: result.incomesPaid    ?? 0, colour: 'var(--gold)'  },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.colour }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 4 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.06em' }}>LOG</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8 }}>
            {result.log.length === 0
              ? <span style={{ color: 'var(--muted)' }}>No log output.</span>
              : result.log.map((line, i) => (
                  <div key={i} style={{ color: line.includes('error') ? 'var(--red)' : 'var(--white)' }}>{line}</div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
