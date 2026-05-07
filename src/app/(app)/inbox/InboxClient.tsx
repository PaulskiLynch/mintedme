'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useTranslations } from 'next-intl'

interface CounterOffer {
  id:        string
  amount:    string
  message:   string | null
  status:    string
  expiresAt: string
  createdAt: string
}

interface Thread {
  id:           string
  amount:       string
  message:      string | null
  status:       string
  expiresAt:    string
  createdAt:    string
  edition: {
    id:       string
    itemName: string
    imageUrl: string | null
  }
  counter:      CounterOffer | null
  buyerUsername?: string
}

interface Props {
  buyerThreads:  Thread[]
  sellerThreads: Thread[]
}

const STATUS_COLOUR: Record<string, string> = {
  pending:   'var(--gold)',
  countered: '#7bb',
  accepted:  'var(--green)',
  declined:  'var(--red)',
  expired:   'var(--muted)',
}

function amt(s: string) { return `$${Number(s).toLocaleString()}` }

export default function InboxClient({ buyerThreads, sellerThreads }: Props) {
  const t = useTranslations('inbox')
  const router = useRouter()
  const [tab, setTab]       = useState<'received' | 'sent'>('received')
  const [busy, setBusy]     = useState('')
  const [counter, setCounter] = useState<{ offerId: string; itemName: string; buyerOffer: string } | null>(null)
  const [counterAmt, setCounterAmt] = useState('')
  const [counterMsg, setCounterMsg] = useState('')

  const pendingReceived = sellerThreads.filter(t =>
    t.status === 'pending' && !t.counter
  ).length

  async function act(offerId: string, action: string, extra?: { counterAmount?: number; message?: string }) {
    setBusy(offerId + action)
    const res = await fetch(`/api/offers/${offerId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    setBusy('')
    setCounter(null)
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Something went wrong')
      return
    }
    router.refresh()
  }

  const tabStyle = (v: typeof tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: 'none', background: tab === v ? 'var(--gold)' : 'var(--bg3)',
    color: tab === v ? '#000' : 'var(--muted)',
  })

  const btn = (bg: string, fg = '#fff'): React.CSSProperties => ({
    padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 6,
    border: 'none', cursor: 'pointer', background: bg, color: fg,
  })

  const statusLabel: Record<string, string> = {
    pending:   t('status.pending'),
    countered: t('status.countered'),
    accepted:  t('status.accepted'),
    declined:  t('status.declined'),
    expired:   t('status.expired'),
  }

  function OfferRow({ label, amount, message, time, highlight }: { label: string; amount: string; message?: string | null; time: string; highlight?: boolean }) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingLeft: 8 }}>
        <div style={{ width: 2, alignSelf: 'stretch', background: highlight ? 'var(--gold)' : 'var(--border)', borderRadius: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
            <span style={{ fontWeight: 900, fontSize: 15, color: highlight ? 'var(--gold)' : 'var(--white)' }}>{amt(amount)}</span>
          </div>
          {message && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>&ldquo;{message}&rdquo;</div>}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{formatDistanceToNow(new Date(time), { addSuffix: true })}</div>
        </div>
      </div>
    )
  }

  function ThreadCard({ thread, myRole }: { thread: Thread; myRole: 'buyer' | 'seller' }) {
    const { id, amount, message, status, expiresAt, createdAt, edition, counter, buyerUsername } = thread

    const counterPending = counter?.status === 'pending'
    const isResolved     = ['accepted', 'declined', 'expired'].includes(counter?.status ?? status)
    const finalStatus    = counter?.status ?? status

    const myTurn = myRole === 'seller'
      ? status === 'pending' && !counter
      : counterPending

    const isBusy = busy.startsWith(counter?.id ?? id) || busy.startsWith(id)

    return (
      <div style={{
        background: 'var(--bg2)', borderRadius: 10,
        border: `1px solid ${myTurn ? 'var(--gold-dim, #6b4c0a)' : 'var(--border)'}`,
        padding: 16, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {edition.imageUrl && (
            <img src={edition.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <Link href={`/item/${edition.id}`} style={{ fontWeight: 800, fontSize: 15, color: 'var(--white)', textDecoration: 'none' }}>
                  {edition.itemName}
                </Link>
                {myRole === 'seller' && buyerUsername && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{t('from', { username: buyerUsername })}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {myTurn && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', background: 'rgba(212,160,23,0.15)', padding: '2px 7px', borderRadius: 10, letterSpacing: '0.05em' }}>
                    {t('yourMove')}
                  </span>
                )}
                {isResolved && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOUR[finalStatus] ?? 'var(--muted)' }}>
                    {statusLabel[finalStatus] ?? finalStatus.toUpperCase()}
                  </span>
                )}
                {!myTurn && !isResolved && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t('waiting')}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: myTurn ? 14 : 0 }}>
              <OfferRow
                label={myRole === 'buyer' ? t('offer.yourOffer') : t('offer.theyOffered', { username: buyerUsername ?? 'buyer' })}
                amount={amount}
                message={message}
                time={createdAt}
                highlight={myRole === 'seller' && status === 'pending' && !counter}
              />
              {counter && (
                <OfferRow
                  label={myRole === 'seller' ? t('offer.yourCounter') : t('offer.counterOffer')}
                  amount={counter.amount}
                  message={counter.message}
                  time={counter.createdAt}
                  highlight={myRole === 'buyer' && counterPending}
                />
              )}
            </div>

            {myRole === 'seller' && status === 'pending' && !counter && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={btn('var(--gold)', '#000')} disabled={isBusy}
                  onClick={() => act(id, 'accept')}>
                  {busy === id + 'accept' ? '…' : t('actions.accept', { amount: amt(amount) })}
                </button>
                <button style={btn('var(--bg3)', 'var(--white)')} disabled={isBusy}
                  onClick={() => { setCounter({ offerId: id, itemName: edition.itemName, buyerOffer: amount }); setCounterAmt(''); setCounterMsg('') }}>
                  {t('actions.counter')}
                </button>
                <button style={btn('rgba(239,68,68,0.15)', 'var(--red)')} disabled={isBusy}
                  onClick={() => act(id, 'decline')}>
                  {busy === id + 'decline' ? '…' : t('actions.decline')}
                </button>
              </div>
            )}

            {myRole === 'buyer' && counterPending && counter && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={btn('var(--gold)', '#000')} disabled={isBusy}
                  onClick={() => act(counter.id, 'accept')}>
                  {busy === counter.id + 'accept' ? '…' : t('actions.accept', { amount: amt(counter.amount) })}
                </button>
                <button style={btn('rgba(239,68,68,0.15)', 'var(--red)')} disabled={isBusy}
                  onClick={() => act(counter.id, 'decline')}>
                  {busy === counter.id + 'decline' ? '…' : t('actions.decline')}
                </button>
              </div>
            )}

            {myTurn && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                {t('expires', { time: formatDistanceToNow(new Date(counter?.expiresAt ?? expiresAt), { addSuffix: true }) })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const received = sellerThreads
  const sent     = buyerThreads

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="page-title">{t('title')}</div>
          <div className="page-sub">{t('subtitle')}</div>
        </div>
        {pendingReceived > 0 && (
          <span style={{ background: 'var(--gold)', color: '#000', fontWeight: 800, fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>
            {t('pending', { n: pendingReceived })}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle('received')} onClick={() => setTab('received')}>
          {t('tabs.received')}{pendingReceived > 0 ? ` (${pendingReceived})` : ` (${received.length})`}
        </button>
        <button style={tabStyle('sent')} onClick={() => setTab('sent')}>
          {t('tabs.sent')} ({sent.length})
        </button>
      </div>

      {tab === 'received' && (
        received.length === 0
          ? <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center', fontWeight: 700 }}>{t('emptyReceived')}</div>
          : received.map(thread => <ThreadCard key={thread.id} thread={thread} myRole="seller" />)
      )}

      {tab === 'sent' && (
        sent.length === 0
          ? <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center', fontWeight: 700 }}>{t('emptySent')}</div>
          : sent.map(thread => <ThreadCard key={thread.id} thread={thread} myRole="buyer" />)
      )}

      {counter && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setCounter(null) }}>
          <div className="modal">
            <div className="modal-title">{t('counterModal.title')}</div>
            <div className="modal-sub">{t('counterModal.subtitle', { item: counter.itemName, amount: amt(counter.buyerOffer) })}</div>
            <div className="form-group">
              <label className="form-label">{t('counterModal.amountLabel')}</label>
              <input className="form-input" type="number" min="1"
                value={counterAmt} onChange={e => setCounterAmt(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{t('counterModal.messageLabel')}</label>
              <input className="form-input" type="text" maxLength={200}
                value={counterMsg} onChange={e => setCounterMsg(e.target.value)}
                placeholder={t('counterModal.messagePlaceholder')} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-gold" disabled={!!busy || !counterAmt}
                onClick={() => act(counter.offerId, 'counter', { counterAmount: Number(counterAmt), message: counterMsg || undefined })}>
                {busy ? t('counterModal.sending') : t('counterModal.send')}
              </button>
              <button className="btn btn-ghost" onClick={() => setCounter(null)}>{t('counterModal.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
