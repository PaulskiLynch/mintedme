'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface ActiveAuction {
  id: string; endsAt: string
  lowestBid: number | null; bidCount: number; myBid: number | null
}

interface JobRow {
  code: string; title: string; category: string; iconIndex: number
  minSalary: number; maxSalary: number
  isTaken: boolean
  activeAuction: ActiveAuction | null
}

interface MyJob {
  jobCode: string; monthlySalary: number; startedAt: string; lastPaidAt: string | null
}

interface Props {
  jobs:              JobRow[]
  myJob:             MyJob | null
  myJobTitle:        string | null
  myJobIconIndex:    number | null
  userId:            string | null
  refreshesAt:       string
  totalUsers:        number
}

function timeLeft(iso: string, t: ReturnType<typeof useTranslations>): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return t('timeEnded')
  const h = Math.floor(ms / 3600000)
  if (h < 24) return t('timeHoursLeft', { h })
  return t('timeDaysLeft', { d: Math.floor(h / 24), h: h % 24 })
}

export default function JobsClient({ jobs, myJob, myJobTitle, myJobIconIndex, userId, refreshesAt, totalUsers }: Props) {
  const t      = useTranslations('jobs')
  const router = useRouter()
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState<JobRow | null>(null)
  const [bidValue, setBidValue] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [quitBusy, setQuitBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? jobs.filter(j => j.title.toLowerCase().includes(q) || j.category.toLowerCase().includes(q)) : jobs
  }, [jobs, search])

  const myBidJob = jobs.find(j => j.activeAuction?.myBid != null) ?? null

  function openModal(job: JobRow) {
    if (!userId) { router.push('/login'); return }
    setModal(job)
    setBidValue(job.activeAuction?.myBid?.toString() ?? job.maxSalary.toString())
    setError('')
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault()
    if (!modal) return
    setBusy(true); setError('')
    const res = await fetch('/api/jobs/activate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobCode: modal.code, salaryBid: Number(bidValue) }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setBusy(false); return }
    setModal(null); setBusy(false); router.refresh()
  }

  async function withdrawBid(jobCode: string) {
    setBusy(true)
    const res = await fetch('/api/jobs/activate', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobCode }),
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

  const bidNum   = Number(bidValue)
  const bidValid = modal && !isNaN(bidNum) && bidNum >= modal.minSalary && bidNum <= modal.maxSalary

  const nextRefresh = (() => {
    const ms = new Date(refreshesAt).getTime() - Date.now()
    const h  = Math.floor(ms / 3600000)
    const m  = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })()

  return (
    <div>
      {/* Current job */}
      {myJob && myJobTitle && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 4 }}>{t('yourJobBadge')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {myJobIconIndex && (
                <Image src={`/jobs/job${myJobIconIndex}.png`} alt="" width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} />
              )}
              <div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{myJobTitle}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)', marginTop: 4 }}>
                ${myJob.monthlySalary.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>{t('perMonth')}</span>
              </div>
              </div>
            </div>
            <button onClick={quitJob} disabled={quitBusy} className="btn btn-danger btn-sm">
              {quitBusy ? '...' : t('quit')}
            </button>
          </div>
        </div>
      )}

      {/* Active bid */}
      {myBidJob?.activeAuction && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 4 }}>{t('yourActiveBid')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{myBidJob.title}</div>
              <div style={{ fontSize: 13, color: 'var(--gold)', marginTop: 2 }}>
                ${myBidJob.activeAuction.myBid!.toLocaleString()}{t('perMonth')}
                {myBidJob.activeAuction.lowestBid === myBidJob.activeAuction.myBid && (
                  <span style={{ marginLeft: 8, color: 'var(--green)', fontWeight: 700 }}>{t('lowestBid')}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {t('bidders', { n: myBidJob.activeAuction.bidCount })} · {timeLeft(myBidJob.activeAuction.endsAt, t)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => openModal(myBidJob)} className="btn btn-outline btn-sm">{t('updateBid')}</button>
              <button onClick={() => withdrawBid(myBidJob.code)} disabled={busy} className="btn btn-ghost btn-sm">{t('withdraw')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Search + refresh hint */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {t('rotatesIn', { time: nextRefresh })}
        </div>
      </div>

      {/* Job list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(job => {
          const a         = job.activeAuction
          const isMine    = job.code === myJob?.jobCode
          const isBidding = a?.myBid != null
          const canAct    = !!userId && !myJob && !myBidJob
          const taken     = job.isTaken && !isMine

          return (
            <div
              key={job.code}
              style={{
                background: isMine ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${isMine ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 16px',
                opacity: taken && !isMine ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Image
                  src={`/jobs/job${job.iconIndex}.png`}
                  alt=""
                  width={40}
                  height={40}
                  style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0, opacity: taken && !isMine ? 0.4 : 1 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {job.title}
                    {isMine    && <span style={{ fontSize: 11, color: 'var(--gold)',  fontWeight: 900 }}>{t('yourJobBadge')}</span>}
                    {isBidding && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 900 }}>{t('biddingBadge')}</span>}
                    {taken     && <span style={{ fontSize: 11, color: 'var(--red)',   fontWeight: 900 }}>{t('takenBadge')}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>${job.minSalary.toLocaleString()} – ${job.maxSalary.toLocaleString()}{t('perMonth')}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>{job.category}</span>
                    {!taken && !isMine && <span style={{ color: 'var(--green)', fontWeight: 700 }}>{t('slotOpen')}</span>}
                  </div>
                  {a && !taken && (
                    <div style={{ marginTop: 6, fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                        {a.lowestBid ? t('lowestBidValue', { amount: a.lowestBid.toLocaleString() }) : t('noBids')}
                      </span>
                      <span style={{ color: 'var(--muted)' }}>{t('bidders', { n: a.bidCount })}</span>
                      <span style={{ color: 'var(--muted)' }}>{timeLeft(a.endsAt, t)}</span>
                    </div>
                  )}
                </div>
                {!isMine && !taken && (
                  <button
                    onClick={() => openModal(job)}
                    disabled={(!canAct && !isBidding) || busy}
                    className="btn btn-gold btn-sm"
                    style={{ whiteSpace: 'nowrap', opacity: (!canAct && !isBidding) ? 0.4 : 1 }}
                  >
                    {isBidding ? t('updateBid') : a ? t('joinAuction') : t('bid')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>{t('noResults')}</div>
      )}

      {/* Scarcity note */}
      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        {Math.floor(totalUsers / 10) * 5 < 40
          ? t('unlockNeeded', { n: Math.floor(totalUsers / 10) * 5 + 5 - (jobs.length) })
          : t('allUnlocked')}
      </div>

      {/* Bid modal */}
      {modal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Image src={`/jobs/job${modal.iconIndex}.png`} alt="" width={52} height={52} style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              <div>
                <div className="modal-title" style={{ margin: 0 }}>{modal.activeAuction ? t('placeBid') : t('startAuction')}</div>
                <div className="modal-sub" style={{ margin: 0 }}>{modal.title} · {modal.category}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('salaryRange')}</div>
              <div style={{ fontWeight: 700 }}>${modal.minSalary.toLocaleString()} – ${modal.maxSalary.toLocaleString()}{t('perMonth')}</div>
              {modal.activeAuction && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, marginBottom: 2 }}>{t('currentLowest')}</div>
                  <div style={{ fontWeight: 700, color: 'var(--gold)' }}>
                    {modal.activeAuction.lowestBid
                      ? `$${modal.activeAuction.lowestBid.toLocaleString()}${t('perMonth')}`
                      : t('noBids')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {t('bidders', { n: modal.activeAuction.bidCount })} · {timeLeft(modal.activeAuction.endsAt, t)}
                  </div>
                </>
              )}
            </div>

            <form onSubmit={submitBid}>
              <div className="form-group">
                <label className="form-label">{t('bidLabel')}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700 }}>$</span>
                  <input
                    className="form-input" type="number"
                    min={modal.minSalary} max={modal.maxSalary} step={1000}
                    value={bidValue} onChange={e => setBidValue(e.target.value)}
                    style={{ paddingLeft: 24 }} required autoFocus
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{t('auctionNote')}</div>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" type="submit" disabled={busy || !bidValid}>
                  {busy ? '...' : modal.activeAuction?.myBid != null ? t('updateBid') : t('placeBid')}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setModal(null)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
