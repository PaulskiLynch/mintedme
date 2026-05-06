'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface JobRow {
  code: string
  title: string
  category: string
  minSalary: number
  maxSalary: number
  totalSlots: number
  heldSlots: number
}

interface Props {
  jobs: JobRow[]
  myJobCode: string | null
}

export default function JobActions({ jobs, myJobCode }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function apply(jobCode: string) {
    setLoading(jobCode)
    setError(null)
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Apply failed')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  async function quit() {
    setLoading('quit')
    setError(null)
    try {
      const res = await fetch('/api/jobs', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Quit failed')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  const categories = [...new Set(jobs.map(j => j.category))]

  return (
    <div>
      {error && (
        <div style={{ background: '#2a1010', border: '1px solid #e05a5a44', borderRadius: 8, padding: '10px 14px', color: '#e05a5a', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {myJobCode && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={quit}
            disabled={loading === 'quit'}
            className="btn"
            style={{ fontSize: 13, padding: '8px 18px', opacity: loading === 'quit' ? 0.5 : 1 }}
          >
            {loading === 'quit' ? 'Quitting…' : 'Quit current job'}
          </button>
        </div>
      )}

      {categories.map(cat => {
        const catJobs = jobs.filter(j => j.category === cat)
        return (
          <div key={cat} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 10 }}>
              {cat.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catJobs.map(job => {
                const available = job.totalSlots - job.heldSlots
                const isMine    = job.code === myJobCode
                const full      = available <= 0
                const disabled  = !!myJobCode || full || !!loading
                return (
                  <div
                    key={job.code}
                    style={{
                      background: isMine ? 'var(--bg3)' : 'var(--bg2)',
                      border: `1px solid ${isMine ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {job.title}
                        {isMine && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 900 }}>YOUR JOB</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        ${job.minSalary.toLocaleString()} – ${job.maxSalary.toLocaleString()} / month
                        <span style={{ marginLeft: 12, color: full ? '#e05a5a' : 'var(--muted)' }}>
                          {available} of {job.totalSlots} open
                        </span>
                      </div>
                    </div>
                    {!isMine && (
                      <button
                        onClick={() => apply(job.code)}
                        disabled={disabled}
                        className="btn btn-gold"
                        style={{ fontSize: 12, padding: '6px 14px', opacity: disabled ? 0.4 : 1, whiteSpace: 'nowrap' }}
                      >
                        {loading === job.code ? 'Applying…' : full ? 'Full' : 'Apply'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
