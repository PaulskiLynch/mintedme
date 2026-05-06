import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { monthlyUpkeep } from '@/lib/upkeep'
import { businessNetIncome } from '@/lib/business'
import { monthlyPropertyUpkeep, monthlyPropertyAppreciation } from '@/lib/property'
import { monthlyAircraftUpkeep } from '@/lib/aircraft'

export const dynamic = 'force-dynamic'

const TYPE_META: Record<string, { label: string; flow: 'in' | 'out' | 'debt' | 'neutral' }> = {
  primary_purchase:  { label: 'Bought from MilliBux',   flow: 'out'   },
  purchase:          { label: 'Purchase',                flow: 'out'   },
  sale:              { label: 'Sale',                    flow: 'in'    },
  auction_win:       { label: 'Auction win',             flow: 'out'   },
  auction_sale:      { label: 'Auction sale',            flow: 'in'    },
  creator_earning:   { label: 'Creator royalty',         flow: 'in'    },
  upkeep:            { label: 'Monthly upkeep',          flow: 'out'   },
  upkeep_debt:       { label: 'Upkeep debt recorded',   flow: 'debt'  },
  salary:            { label: 'Monthly salary',          flow: 'in'    },
  business_income:   { label: 'Business income',         flow: 'in'    },
  liquidation_credit:{ label: 'Liquidation surplus',    flow: 'in'    },
  admin_adjustment:  { label: 'Admin adjustment',        flow: 'neutral'},
  offer_accept:      { label: 'Offer accepted',          flow: 'in'    },
  starting_bonus:    { label: 'Starting bonus',          flow: 'in'    },
}

const FLOW_COLOUR = { in: 'var(--green)', out: 'var(--red)', debt: '#e08030', neutral: 'var(--gold)' }
const FLOW_SIGN   = { in: '+', out: '−', debt: '−', neutral: '±' }

export default async function WalletPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, jobHolding, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        username:   true,
        balance:    true,
        debtAmount: true,
        ownedEditions: {
          where: { isFrozen: false },
          select: {
            id:            true,
            isInAuction:   true,
            lastSalePrice: true,
            item: {
              select: {
                name:            true,
                rarityTier:      true,
                benchmarkPrice:  true,
                minimumBid:      true,
                businessRiskTier: true,
                propertyTier:    true,
                aircraftType:    true,
              },
            },
          },
        },
      },
    }),
    prisma.jobHolding.findUnique({
      where:  { userId: session.user.id },
      select: { monthlySalary: true },
    }),
    prisma.transaction.findMany({
      where:   { OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }] },
      orderBy: { createdAt: 'desc' },
      take:    100,
      include: {
        edition: { include: { item: { select: { name: true, imageUrl: true, businessRiskTier: true } } } },
        fromUser: { select: { username: true } },
        toUser:   { select: { username: true } },
      },
    }),
  ])

  if (!user) redirect('/login')

  const mintValue = user.ownedEditions.reduce(
    (sum, e) => sum + Number(e.lastSalePrice ?? e.item.minimumBid),
    0,
  )
  const netWorth  = Number(user.balance) + mintValue
  const debt      = Number(user.debtAmount)

  // Monthly cash flow
  const carEditions      = user.ownedEditions.filter(e => !e.item.businessRiskTier && !e.item.propertyTier && !e.item.aircraftType)
  const bizEditions      = user.ownedEditions.filter(e =>  e.item.businessRiskTier)
  const propEditions     = user.ownedEditions.filter(e =>  e.item.propertyTier)
  const aircraftEditions = user.ownedEditions.filter(e =>  e.item.aircraftType)
  const monthlyCost      = carEditions.reduce((s, e) => s + monthlyUpkeep(e.item.rarityTier, Number(e.item.benchmarkPrice)), 0)
                         + propEditions.reduce((s, e) => s + monthlyPropertyUpkeep(e.item.propertyTier!, Number(e.item.benchmarkPrice)), 0)
                         + aircraftEditions.reduce((s, e) => s + monthlyAircraftUpkeep(e.item.aircraftType!, Number(e.item.benchmarkPrice)), 0)
  const monthlyIncome    = bizEditions.reduce((s, e) => s + businessNetIncome(e.item.businessRiskTier!, Number(e.item.benchmarkPrice)), 0)
  const monthlyPaperGain = propEditions.reduce((s, e) => s + monthlyPropertyAppreciation(e.item.propertyTier!, Number(e.item.benchmarkPrice)), 0)
  const monthlySalary = jobHolding?.monthlySalary ?? 0
  const monthlyNet    = monthlyIncome + monthlySalary - monthlyCost

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-title">Wallet</div>

      {/* Debt warning */}
      {debt > 0 && (
        <div style={{ marginBottom: 24, padding: '16px 20px', background: '#2a1010', border: '1px solid #6a2020', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--red)', marginBottom: 4 }}>
                Negative Equity — ${debt.toLocaleString()} outstanding
              </div>
              <div style={{ fontSize: 13, color: '#c07070', lineHeight: 1.5 }}>
                Your upkeep bills exceeded your balance. Your cheapest items have been placed in liquidation auctions to cover the debt. Any surplus from sales is returned to your balance.
              </div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--red)', flexShrink: 0 }}>
              −${debt.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Balance stats */}
      <div className="stats-row" style={{ marginBottom: 28 }}>
        <div className="stat-box">
          <div className="stat-label">Cash Balance</div>
          <div className="stat-value">${Number(user.balance).toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Mint Value</div>
          <div className="stat-value">${mintValue.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">${netWorth.toLocaleString()}</div>
        </div>
      </div>

      {/* Monthly cash flow */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 14 }}>MONTHLY CASH FLOW</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {monthlySalary > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>Job salary</span>
              <span style={{ fontWeight: 700, color: 'var(--green)' }}>+${monthlySalary.toLocaleString()}</span>
            </div>
          )}
          {monthlyIncome > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>Business income ({bizEditions.length} biz)</span>
              <span style={{ fontWeight: 700, color: 'var(--green)' }}>+${monthlyIncome.toLocaleString()}</span>
            </div>
          )}
          {carEditions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>Car upkeep ({carEditions.length} car{carEditions.length !== 1 ? 's' : ''})</span>
              <span style={{ fontWeight: 700, color: 'var(--red)' }}>−${carEditions.reduce((s, e) => s + monthlyUpkeep(e.item.rarityTier, Number(e.item.benchmarkPrice)), 0).toLocaleString()}</span>
            </div>
          )}
          {propEditions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>Property upkeep ({propEditions.length} propert{propEditions.length !== 1 ? 'ies' : 'y'})</span>
              <span style={{ fontWeight: 700, color: 'var(--red)' }}>−${propEditions.reduce((s, e) => s + monthlyPropertyUpkeep(e.item.propertyTier!, Number(e.item.benchmarkPrice)), 0).toLocaleString()}</span>
            </div>
          )}
          {aircraftEditions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>Aircraft upkeep ({aircraftEditions.length} aircraft)</span>
              <span style={{ fontWeight: 700, color: 'var(--red)' }}>−${aircraftEditions.reduce((s, e) => s + monthlyAircraftUpkeep(e.item.aircraftType!, Number(e.item.benchmarkPrice)), 0).toLocaleString()}</span>
            </div>
          )}
          {monthlyPaperGain > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--muted)' }}>Property appreciation (paper gain)</span>
              <span style={{ fontWeight: 700, color: '#6db87a' }}>+${monthlyPaperGain.toLocaleString()}</span>
            </div>
          )}
          {(monthlyCost > 0 || monthlyIncome > 0 || monthlySalary > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
              <span style={{ fontWeight: 700 }}>Net per month</span>
              <span style={{ fontWeight: 900, color: monthlyNet >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {monthlyNet >= 0 ? '+' : '−'}${Math.abs(monthlyNet).toLocaleString()}
              </span>
            </div>
          )}
          {monthlyCost === 0 && monthlyIncome === 0 && monthlySalary === 0 && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              No recurring income or costs yet.{' '}
              <Link href="/marketplace" style={{ color: 'var(--gold)' }}>Browse the market →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 14 }}>Transaction History</h3>
      {transactions.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>No transactions yet.</div>
      ) : (
        <div>
          {transactions.map(t => {
            const meta = TYPE_META[t.type]
            // Determine flow direction from context when meta is neutral/ambiguous
            let flow: 'in' | 'out' | 'debt' | 'neutral'
            if (meta?.flow === 'neutral') {
              flow = t.toUserId === session.user.id ? 'in' : 'out'
            } else if (meta) {
              flow = meta.flow
            } else {
              flow = t.toUserId === session.user.id ? 'in' : 'out'
            }
            const colour  = FLOW_COLOUR[flow]
            const sign    = FLOW_SIGN[flow]
            const label   = meta?.label ?? t.type.replace(/_/g, ' ')
            const isBiz   = !!t.edition?.item.businessRiskTier

            const row = (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                {/* Thumbnail */}
                <div style={{ width: 42, height: 42, borderRadius: 7, background: isBiz ? 'linear-gradient(135deg,#1a2e1a,#0d1f0d)' : 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.edition?.item.imageUrl
                    ? <img src={t.edition.item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : isBiz
                    ? <span style={{ fontSize: 18 }}>🏢</span>
                    : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.edition?.item.name ?? (t.description ?? label)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {label} · {new Date(t.createdAt).toLocaleDateString()}
                    {t.fromUser && t.fromUser.username !== user.username && <> · from @{t.fromUser.username}</>}
                    {t.toUser   && t.toUser.username   !== user.username && <> · to @{t.toUser.username}</>}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, color: colour, fontSize: 15 }}>
                    {sign}${Number(t.amount).toLocaleString()}
                  </div>
                  {flow === 'debt' && (
                    <div style={{ fontSize: 10, color: '#e08030', fontWeight: 700, marginTop: 2 }}>DEBT</div>
                  )}
                </div>
              </div>
            )

            return t.edition ? (
              <Link key={t.id} href={`/item/${t.edition.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                {row}
              </Link>
            ) : (
              <div key={t.id}>{row}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
