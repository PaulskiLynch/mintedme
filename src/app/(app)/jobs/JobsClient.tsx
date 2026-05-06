'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface ActiveAuction {
  id: string
  endsAt: string
  lowestBid: number | null
  bidCount: number
  myBid: number | null
}

interface JobRow {
  code: string
  title: string
  category: string
  minSalary: number
  maxSalary: number
  totalSlots: number
  heldSlots: number
  activeAuction: ActiveAuction | null
}

interface MyJob {
  jobCode: string
  monthlySalary: number
  startedAt: string
  lastPaidAt: string | null
}

interface Props {
  jobs:     JobRow[]
  myJob:    MyJob | null
  myJobTitle: string | null
  userId:   string | null
}

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const h = Math.floor(ms / 3600000)
  if (h < 24) return `${h}h left`
  return `${Math.floor(h / 24)}d ${h % 24}h left`
}

export default function JobsClient({ jobs, myJob, myJobTitle, userId }: Props) {
  const router = useRouter()
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState<JobRow | null>(null)
  const [bidValue, setBidValue]   = useState('')
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState('')
  const [quitBusy, setQuitBusy]   = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? jobs.filter(j => j.title.toLowerCase().includes(q) || j.category.toLowerCase().includes(q)) : jobs
  }, [jobs, search])

  const categories = useMemo(() => [...new Set(filtered.map(j => j.category))], [filtered])

  // Which job is the user currently bidding on
  const myBidJob = jobs.find(j => j.activeAuction?.myBid != null) ?? null

  function openModal(job: JobRow) {
    if (!userId) { router.push('/login'); return }
    setModal(job)
    setBidValue(job.activeAuction?.myBid?.toString() ?? job.activeAuction?.lowestBid?.toString() ?? job.maxSalary.toString())
    setError('')
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault()
    if (!modal) return
    setBusy(true); setError('')
    const res = await fetch('/api/jobs/activate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jobCode: modal.code, salaryBid: Number(bidValue) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setBusy(false); return }
    setModal(null); setBusy(false)
    router.refresh()
  }

  async function withdrawBid(jobCode: string) {
    setBusy(true); setError('')
    const res = await fetch('/api/jobs/activate', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jobCode }),
    })
    if (res.ok) router.refresh()
    setBusy(false)
  }

  async function quitJob() {
    setQuitBusy(true)
    const res = await fetch('/api/jobs', { method: 'DELETE' })
    if (res.ok) router.refresh()
    setQuitBusy(false)
  }

  const bidNum = Number(bidValue)
  const bidValid = modal && !isNaN(bidNum) && bidNum >= modal.minSalary && bidNum <= modal.maxSalary

  return (
    <div>
      {/* Current job */}
      {myJob && myJobTitle && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 4 }}>YOUR JOB</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{myJobTitle}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)', marginTop: 4 }}>${myJob.monthlySalary.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>/mo</span></div>
            </div>
            <button onClick={quitJob} disabled={quitBusy} className="btn btn-danger btn-sm">
              {quitBusy ? '...' : 'Quit'}
            </button>
          </div>
        </div>
      )}

      {/* Active bid */}
      {myBidJob && myBidJob.activeAuction && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 4 }}>YOUR ACTIVE BID</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{myBidJob.title}</div>
              <div style={{ fontSize: 13, color: 'var(--gold)', marginTop: 2 }}>
                ${myBidJob.activeAuction.myBid!.toLocaleString()}/mo bid
                {myBidJob.activeAuction.lowestBid !== null && myBidJob.activeAuction.myBid === myBidJob.activeAuction.lowestBid && (
                  <span style={{ marginLeft: 8, color: 'var(--green)', fontWeight: 700 }}>Lowest bid</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {myBidJob.activeAuction.bidCount} bidder{myBidJob.activeAuction.bidCount !== 1 ? 's' : ''} · {timeLeft(myBidJob.activeAuction.endsAt)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => openModal(myBidJob)} className="btn btn-outline btn-sm">Update bid</button>
              <button onClick={() => withdrawBid(myBidJob.code)} disabled={busy} className="btn btn-ghost btn-sm">Withdraw</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        className="form-input"
        placeholder="Search jobs by title or category..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 24 }}
      />

      {/* Job list */}
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 10 }}>
            {cat.toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.filter(j => j.category === cat).map(job => {
              const a         = job.activeAuction
              const isMine    = job.code === myJob?.jobCode
              const isBidding = a?.myBid != null
              const full      = job.heldSlots >= job.totalSlots
              const canAct    = !!userId && !myJob && !myBidJob
              const btnLabel  = isBidding ? 'Update bid' : a ? 'Join auction' : 'Activate'
              return (
                <div
                  key={job.code}
                  style={{
                    background: isMine ? 'var(--bg3)' : 'var(--bg2)',
                    border: `1px solid ${isMine ? 'var(--gold)' : a ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {job.title}
                        {isMine && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 900 }}>YOUR JOB</span>}
                        {isBidding && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)', fontWeight: 900 }}>BIDDING</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        ${job.minSalary.toLocaleString()} – ${job.maxSalary.toLocaleString()}/mo
                        <span style={{ marginLeft: 10, color: full ? '#e05a5a' : 'var(--muted)' }}>
                          {job.totalSlots - job.heldSlots} of {job.totalSlots} slots open
                        </span>
                      </div>
                      {a && (
                        <div style={{ marginTop: 6, fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                            {a.lowestBid ? `Lowest bid: $${a.lowestBid.toLocaleString()}` : 'No bids yet'}
                          </span>
                          <span style={{ color: 'var(--muted)' }}>{a.bidCount} bidder{a.bidCount !== 1 ? 's' : ''}</span>
                          <span style={{ color: 'var(--muted)' }}>{timeLeft(a.endsAt)}</span>
                        </div>
                      )}
                    </div>
                    {!isMine && (
                      <button
                        onClick={() => openModal(job)}
                        disabled={!canAct && !isBidding || full || busy}
                        className="btn btn-gold btn-sm"
                        style={{ whiteSpace: 'nowrap', opacity: (!canAct && !isBidding) || full ? 0.4 : 1 }}
                      >
                        {btnLabel}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>No jobs match your search.</div>
      )}

      {/* Activate modal */}
      {modal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal">
            <div className="modal-title">{modal.activeAuction ? 'Place bid' : 'Activate auction'}</div>
            <div className="modal-sub">{modal.title} · {modal.category}</div>

            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Salary range</div>
              <div style={{ fontWeight: 700 }}>${modal.minSalary.toLocaleString()} – ${modal.maxSalary.toLocaleString()}/mo</div>
              {modal.activeAuction && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, marginBottom: 2 }}>Current lowest bid</div>
                  <div style={{ fontWeight: 700, color: 'var(--gold)' }}>
                    {modal.activeAuction.lowestBid
                      ? `$${modal.activeAuction.lowestBid.toLocaleString()}/mo`
                      : 'No bids yet'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {modal.activeAuction.bidCount} bidder{modal.activeAuction.bidCount !== 1 ? 's' : ''} · {timeLeft(modal.activeAuction.endsAt)}
                  </div>
                </>
              )}
            </div>

            <form onSubmit={submitBid}>
              <div className="form-group">
                <label className="form-label">Your salary bid</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700 }}>$</span>
                  <input
                    className="form-input"
                    type="number"
                    min={modal.minSalary}
                    max={modal.maxSalary}
                    step={1000}
                    value={bidValue}
                    onChange={e => setBidValue(e.target.value)}
                    style={{ paddingLeft: 24 }}
                    required
                    autoFocus
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                  Lower bid = more likely to win, but lower monthly salary. Auction runs 3 days.
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" type="submit" disabled={busy || !bidValid}>
                  {busy ? '...' : modal.activeAuction?.myBid != null ? 'Update bid' : 'Place bid'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
