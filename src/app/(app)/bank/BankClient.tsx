'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { calcMonthlyPayment, STANDARD_PRODUCTS, STARTER_PRODUCT } from '@/lib/loans'

interface LoanRow {
  id: string; loanType: string; assetCategory: string
  principal: number; outstanding: number; monthlyPayment: number
  termMonths: number; paidMonths: number; missedPayments: number; status: string
  nextPaymentAt: string; editionId: string; editionName: string; editionImage: string | null; isAtRisk: boolean
}

interface EligibleItem {
  editionId: string; name: string; imageUrl: string | null; assetCategory: string
  productName: string; maxLoan: number; maxRate: number; termMonths: number
  starterOk: boolean; starterMax: number
}

interface Props {
  loans:         LoanRow[]
  eligibleItems: EligibleItem[]
  balance:       number
  monthlyIncome: number
  paymentRoom:   number
}

export default function BankClient({ loans, eligibleItems, balance, monthlyIncome, paymentRoom }: Props) {
  const t      = useTranslations('bank')
  const router = useRouter()

  const [selected,   setSelected]   = useState<EligibleItem | null>(null)
  const [useStarter, setUseStarter] = useState(false)
  const [amount,     setAmount]     = useState(0)
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState('')
  const [repayBusy,  setRepayBusy]  = useState<string | null>(null)

  const product     = selected ? (useStarter && selected.starterOk ? STARTER_PRODUCT : STANDARD_PRODUCTS[selected.assetCategory]) : null
  const maxLoan     = selected ? (useStarter && selected.starterOk ? selected.starterMax : selected.maxLoan) : 0
  const monthlyPmt  = product && amount > 0 ? calcMonthlyPayment(amount, product.monthlyRate, product.termMonths) : 0
  const totalCost   = monthlyPmt * (product?.termMonths ?? 0)
  const affordable  = monthlyPmt <= paymentRoom

  function selectItem(item: EligibleItem) {
    setSelected(item)
    setUseStarter(false)
    setAmount(Math.floor(item.maxLoan * 0.5))
    setError('')
  }

  async function applyLoan(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !product) return
    setBusy(true); setError('')
    const res = await fetch('/api/loans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId: selected.editionId, loanType: useStarter ? 'starter' : 'standard', amount }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setBusy(false); return }
    setSelected(null); setBusy(false); router.refresh()
  }

  async function repayLoan(loanId: string) {
    setRepayBusy(loanId)
    const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Failed'); setRepayBusy(null); return }
    setRepayBusy(null); router.refresh()
  }

  return (
    <div>
      {/* Active loans */}
      {loans.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 12 }}>{t('activeLoans')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loans.map(loan => {
              const monthsLeft = loan.termMonths - loan.paidMonths
              const pct        = Math.round((loan.paidMonths / loan.termMonths) * 100)
              const canRepay   = balance >= loan.outstanding
              return (
                <div key={loan.id} style={{
                  background: 'var(--bg2)',
                  border: `1px solid ${loan.isAtRisk ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {loan.editionName}
                        {loan.isAtRisk && <span style={{ fontSize: 11, background: '#3a0000', color: 'var(--red)', padding: '2px 8px', borderRadius: 12, fontWeight: 900 }}>{t('atRisk')}</span>}
                        {loan.loanType === 'starter' && <span style={{ fontSize: 11, background: '#001a2e', color: '#5599ff', padding: '2px 8px', borderRadius: 12, fontWeight: 900 }}>{t('starter')}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                        ${loan.outstanding.toLocaleString()} {t('outstanding')} · ${loan.monthlyPayment.toLocaleString()}{t('perMonth')} · {monthsLeft} {t('monthsLeft')}
                      </div>
                      {loan.missedPayments > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 3, fontWeight: 700 }}>
                          {t('missedPayments', { n: loan.missedPayments })}
                        </div>
                      )}
                      {/* Progress bar */}
                      <div style={{ marginTop: 10, background: 'var(--bg3)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: 'var(--gold)', height: '100%', borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{pct}% {t('repaid')}</div>
                    </div>
                    <button
                      onClick={() => repayLoan(loan.id)}
                      disabled={!canRepay || repayBusy === loan.id || loan.status !== 'active'}
                      className="btn btn-outline btn-sm"
                      style={{ whiteSpace: 'nowrap', opacity: canRepay ? 1 : 0.4 }}
                    >
                      {repayBusy === loan.id ? '...' : t('repayNow', { amount: loan.outstanding.toLocaleString() })}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Apply for a new loan */}
      {eligibleItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 12 }}>{t('applyTitle')}</div>

          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {eligibleItems.map(item => (
                <div
                  key={item.editionId}
                  onClick={() => selectItem(item)}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt="" width={44} height={44} style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {item.productName} · {t('upTo', { amount: item.maxLoan.toLocaleString() })} · {Math.round(item.maxRate * 100 * 100) / 100}%{t('perMonthRate')} · {item.termMonths} {t('months')}
                    </div>
                    {item.starterOk && (
                      <div style={{ fontSize: 11, color: '#5599ff', marginTop: 2, fontWeight: 700 }}>{t('starterAvailable')}</div>
                    )}
                  </div>
                  <span style={{ color: 'var(--gold)', fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {product?.name} · {Math.round((product?.monthlyRate ?? 0) * 100 * 100) / 100}%{t('perMonthRate')} · {product?.termMonths} {t('months')}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>{t('change')}</button>
              </div>

              {selected.starterOk && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button
                    className={`btn btn-sm ${!useStarter ? 'btn-gold' : 'btn-ghost'}`}
                    onClick={() => { setUseStarter(false); setAmount(Math.floor(selected.maxLoan * 0.5)) }}
                  >{t('standard')}</button>
                  <button
                    className={`btn btn-sm ${useStarter ? 'btn-gold' : 'btn-ghost'}`}
                    onClick={() => { setUseStarter(true); setAmount(Math.floor(selected.starterMax * 0.5)) }}
                  >{t('starter')}</button>
                </div>
              )}

              <form onSubmit={applyLoan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">{t('loanAmount')}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 700 }}>$</span>
                    <input
                      type="number"
                      className="form-input"
                      min={1000}
                      max={maxLoan}
                      step={1000}
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      style={{ paddingLeft: 24 }}
                      required
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {t('maxLoan', { amount: maxLoan.toLocaleString() })}
                  </div>
                </div>

                {amount > 0 && product && (
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>{t('monthlyPayment')}</span>
                      <span style={{ fontWeight: 900, color: affordable ? 'var(--green)' : 'var(--red)' }}>${monthlyPmt.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>{t('totalRepayable')}</span>
                      <span style={{ fontWeight: 700 }}>${totalCost.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>{t('totalInterest')}</span>
                      <span style={{ fontWeight: 700, color: 'var(--muted)' }}>${(totalCost - amount).toLocaleString()}</span>
                    </div>
                    {!affordable && (
                      <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                        {t('affordabilityWarn', { room: paymentRoom.toLocaleString() })}
                      </div>
                    )}
                  </div>
                )}

                {error && <div className="form-error">{error}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-gold" disabled={busy || amount < 1000 || amount > maxLoan}>
                    {busy ? '...' : t('applyBtn')}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>{t('cancel')}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {eligibleItems.length === 0 && loans.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
          {t('noEligible')}
        </div>
      )}

      {/* Loan products table */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 12 }}>{t('productsTitle')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{t('colAsset')}</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{t('colMaxLtv')}</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{t('colRate')}</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{t('colTerm')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(STANDARD_PRODUCTS).map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--muted)' }}>{Math.round(p.maxLtv * 100)}%</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--gold)', fontWeight: 700 }}>{p.monthlyRate * 100}%</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--muted)' }}>{p.termMonths} mo</td>
                </tr>
              ))}
              <tr style={{ background: '#001a2e' }}>
                <td style={{ padding: '9px 10px', fontWeight: 700, color: '#5599ff' }}>{STARTER_PRODUCT.name}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#5599ff' }}>{Math.round(STARTER_PRODUCT.maxLtv * 100)}%</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#5599ff', fontWeight: 700 }}>{STARTER_PRODUCT.monthlyRate * 100}%</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#5599ff' }}>{STARTER_PRODUCT.termMonths} mo</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{t('productsNote')}</div>
        </div>
      </div>
    </div>
  )
}
