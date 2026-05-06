import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function money(n: number | null | undefined) {
  if (!n) return '$0'
  return '$' + Math.round(n).toLocaleString()
}

function pct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

const card: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px',
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div style={{ ...card, borderColor: alert ? 'var(--red)' : 'var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: alert ? 'var(--red)' : 'var(--muted)', marginBottom: 6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: alert ? 'var(--red)' : 'var(--white)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 16 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  )
}

export default async function EconomyPage() {
  const now     = new Date()
  const ago1d   = new Date(now.getTime() -  1 * 86_400_000)
  const ago7d   = new Date(now.getTime() -  7 * 86_400_000)
  const ago30d  = new Date(now.getTime() - 30 * 86_400_000)

  const [
    userAgg,
    auctionStatuses,
    ownedEditions,
    unownedEditions,

    // 7-day flows
    bizIncome7d,
    salary7d,
    upkeep7d,
    salesVol7d,
    auctionVol7d,
    bidLocks7d,
    challengeRewards7d,

    // 30-day flows
    bizIncome30d,
    salary30d,
    upkeep30d,
    salesVol30d,
    auctionVol30d,

    // 24h
    salesVol1d,
    auctionVol1d,

    // All-time sources
    startingBonuses,
    adminCreated,
    adminDestroyed,
    challengeRewardsAll,
    bizIncomeAll,
    salaryAll,
    upkeepAll,
    reversalsOut,
    reversalsIn,
  ] = await Promise.all([
    // Money supply
    prisma.user.aggregate({ _sum: { balance: true, lockedBalance: true }, _count: { id: true } }),

    // Auction status distribution
    prisma.auction.groupBy({ by: ['status'], _count: { id: true } }),

    // Owned editions
    prisma.itemEdition.aggregate({
      where: { currentOwnerId: { not: null } },
      _sum: { lastSalePrice: true },
      _count: { id: true },
    }),

    // System-stock editions (unowned)
    prisma.itemEdition.count({ where: { currentOwnerId: null } }),

    // 7-day
    prisma.transaction.aggregate({ where: { type: 'business_income', createdAt: { gte: ago7d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'salary', createdAt: { gte: ago7d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['upkeep', 'upkeep_debt'] }, createdAt: { gte: ago7d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['purchase', 'primary_purchase', 'auction_win', 'auction_settlement_debit'] }, createdAt: { gte: ago7d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['auction_win', 'auction_settlement_debit'] }, createdAt: { gte: ago7d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'auction_bid_lock', createdAt: { gte: ago7d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'challenge_reward', createdAt: { gte: ago7d } }, _sum: { amount: true } }),

    // 30-day
    prisma.transaction.aggregate({ where: { type: 'business_income', createdAt: { gte: ago30d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'salary', createdAt: { gte: ago30d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['upkeep', 'upkeep_debt'] }, createdAt: { gte: ago30d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['purchase', 'primary_purchase', 'auction_win', 'auction_settlement_debit'] }, createdAt: { gte: ago30d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['auction_win', 'auction_settlement_debit'] }, createdAt: { gte: ago30d } }, _sum: { amount: true } }),

    // 24h
    prisma.transaction.aggregate({ where: { type: { in: ['purchase', 'primary_purchase', 'auction_win', 'auction_settlement_debit'] }, createdAt: { gte: ago1d } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['auction_win', 'auction_settlement_debit'] }, createdAt: { gte: ago1d } }, _sum: { amount: true } }),

    // All-time
    prisma.transaction.aggregate({ where: { type: 'starting_bonus' }, _sum: { amount: true }, _count: { id: true } }),
    prisma.transaction.aggregate({ where: { type: 'admin_adjustment', toUserId: { not: null } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'admin_adjustment', fromUserId: { not: null } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'challenge_reward' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'business_income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'salary' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: { in: ['upkeep', 'upkeep_debt'] } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'reversal', fromUserId: { not: null } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'reversal', toUserId: { not: null } }, _sum: { amount: true } }),
  ])

  // -- Derived values --
  const totalBalance  = Number(userAgg._sum.balance      ?? 0)
  const totalLocked   = Number(userAgg._sum.lockedBalance ?? 0)
  const freeCash      = totalBalance - totalLocked
  const userCount     = userAgg._count.id

  const assetValue    = Number(ownedEditions._sum.lastSalePrice ?? 0)
  const ownedCount    = ownedEditions._count.id
  const avgAsset      = ownedCount > 0 ? assetValue / ownedCount : 0
  const ratio         = assetValue > 0 ? totalBalance / assetValue : null

  const activeAuctions = (auctionStatuses.find(s => s.status === 'active')?._count.id ?? 0)
  const settledCount   = (auctionStatuses.find(s => s.status === 'settled')?._count.id ?? 0)

  // 7d net flow
  const biz7   = Number(bizIncome7d._sum.amount  ?? 0)
  const sal7   = Number(salary7d._sum.amount     ?? 0)
  const up7    = Number(upkeep7d._sum.amount     ?? 0)
  const chal7  = Number(challengeRewards7d._sum.amount ?? 0)
  const net7   = biz7 + sal7 + chal7 - up7

  // 30d net flow
  const biz30  = Number(bizIncome30d._sum.amount ?? 0)
  const sal30  = Number(salary30d._sum.amount    ?? 0)
  const up30   = Number(upkeep30d._sum.amount    ?? 0)
  const net30  = biz30 + sal30 - up30

  // All-time totals
  const bonuses   = Number(startingBonuses._sum.amount    ?? 0)
  const adminIn   = Number(adminCreated._sum.amount       ?? 0)
  const adminOut  = Number(adminDestroyed._sum.amount     ?? 0)
  const netAdmin  = adminIn - adminOut
  const chalAll   = Number(challengeRewardsAll._sum.amount ?? 0)
  const bizAll    = Number(bizIncomeAll._sum.amount       ?? 0)
  const salAll    = Number(salaryAll._sum.amount          ?? 0)
  const upAll     = Number(upkeepAll._sum.amount          ?? 0)
  const revOut    = Number(reversalsOut._sum.amount       ?? 0)
  const revIn     = Number(reversalsIn._sum.amount        ?? 0)

  const totalInjected  = bonuses + bizAll + salAll + chalAll + adminIn + revIn
  const totalBurned    = upAll + adminOut + revOut
  const netCreated     = totalInjected - totalBurned

  // Health
  const ratioWarning = ratio !== null && ratio > 5
  const ratioWatch   = ratio !== null && ratio > 2 && !ratioWarning

  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Economy</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
        Live snapshot · refreshes on load · {now.toLocaleString()}
      </div>

      {/* ── Money supply ── */}
      <Section title="Money Supply">
        <div style={grid4}>
          <Stat label="Total Balance"  value={money(totalBalance)} sub={`${userCount.toLocaleString()} users`} />
          <Stat label="Free Cash"      value={money(freeCash)}     sub="balance − locked bids" />
          <Stat label="Locked in Bids" value={money(totalLocked)}  sub="held in active bids" />
          <Stat label="Avg per User"   value={money(userCount > 0 ? totalBalance / userCount : 0)} />
        </div>
      </Section>

      {/* ── Health indicator ── */}
      <Section title="Economy Health">
        <div style={grid3}>
          <div style={{ ...card, borderColor: ratioWarning ? 'var(--red)' : ratioWatch ? '#f59e0b' : 'var(--green)', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>MONEY SUPPLY / ASSET VALUE RATIO</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: ratioWarning ? 'var(--red)' : ratioWatch ? '#f59e0b' : 'var(--green)' }}>
                  {ratio !== null ? ratio.toFixed(2) + '×' : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                  {ratio === null
                    ? 'No assets sold yet — ratio not calculable'
                    : ratio <= 2   ? 'Healthy — cash supply is well-backed by asset value'
                    : ratio <= 5   ? 'Watch — cash is outpacing asset value, monitor inflation'
                    : 'Warning — severe cash surplus relative to assets; consider upkeep increases or supply restriction'
                  }
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>TOTAL ASSET VALUE</div>
                <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--gold)' }}>{money(assetValue)}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 12 }}>NET MONEY CREATED</div>
                <div style={{ fontWeight: 900, fontSize: 20, color: net7 > 0 ? 'var(--red)' : 'var(--green)' }}>{money(netCreated)}</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Weekly flows ── */}
      <Section title="Money Flows">
        <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>TYPE</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>24H</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>7 DAYS</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>30 DAYS</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>ALL TIME</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Business Income',  c: 'var(--green)',  d1: 0,               d7: biz7,  d30: biz30, all: bizAll,  dir: 1 },
                { label: 'Salary Paid',      c: 'var(--green)',  d1: 0,               d7: sal7,  d30: sal30, all: salAll,  dir: 1 },
                { label: 'Challenge Rewards',c: 'var(--green)',  d1: 0,               d7: chal7, d30: 0,     all: chalAll, dir: 1 },
                { label: 'Starting Bonuses', c: '#60a5fa',       d1: 0,               d7: 0,     d30: 0,     all: bonuses, dir: 1 },
                { label: 'Admin Created',    c: '#a78bfa',       d1: 0,               d7: 0,     d30: 0,     all: adminIn, dir: 1 },
                { label: 'Upkeep Charged',   c: 'var(--red)',    d1: 0,               d7: up7,   d30: up30,  all: upAll,   dir: -1 },
                { label: 'Admin Destroyed',  c: 'var(--red)',    d1: 0,               d7: 0,     d30: 0,     all: adminOut,dir: -1 },
                { label: 'Sales Volume',     c: 'var(--muted)',  d1: Number(salesVol1d._sum.amount ?? 0), d7: Number(salesVol7d._sum.amount ?? 0), d30: Number(salesVol30d._sum.amount ?? 0), all: 0, dir: 0 },
                { label: 'Auction Volume',   c: 'var(--gold)',   d1: Number(auctionVol1d._sum.amount ?? 0), d7: Number(auctionVol7d._sum.amount ?? 0), d30: Number(auctionVol30d._sum.amount ?? 0), all: 0, dir: 0 },
                { label: 'Bids Placed',      c: 'var(--muted)',  d1: 0,               d7: Number(bidLocks7d._sum.amount ?? 0), d30: 0, all: 0, dir: 0 },
              ].map(row => (
                <tr key={row.label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 20px', fontWeight: 600 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: row.c, marginRight: 8 }} />
                    {row.label}
                    {row.dir === 1  && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)' }}>▲ IN</span>}
                    {row.dir === -1 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--red)'   }}>▼ OUT</span>}
                  </td>
                  {[row.d1, row.d7, row.d30, row.all].map((v, i) => (
                    <td key={i} style={{ padding: '10px 20px', textAlign: 'right', fontWeight: v > 0 ? 700 : 400, color: v > 0 ? row.c : 'var(--muted)' }}>
                      {v > 0 ? money(v) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Net row */}
              <tr style={{ background: 'var(--bg3)', fontWeight: 900 }}>
                <td style={{ padding: '10px 20px' }}>Net Flow (in − out)</td>
                <td style={{ padding: '10px 20px', textAlign: 'right' }}>—</td>
                <td style={{ padding: '10px 20px', textAlign: 'right', color: net7 > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {net7 >= 0 ? '+' : ''}{money(net7)}
                </td>
                <td style={{ padding: '10px 20px', textAlign: 'right', color: net30 > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {net30 >= 0 ? '+' : ''}{money(net30)}
                </td>
                <td style={{ padding: '10px 20px', textAlign: 'right', color: netCreated > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {netCreated >= 0 ? '+' : ''}{money(netCreated)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Asset market ── */}
      <Section title="Asset Market">
        <div style={grid4}>
          <Stat label="Owned Editions"    value={ownedCount.toLocaleString()}     sub="in player hands" />
          <Stat label="System Stock"      value={unownedEditions.toLocaleString()} sub="available to win/buy" />
          <Stat label="Total Asset Value" value={money(assetValue)}               sub="sum of last sale prices" />
          <Stat label="Avg Asset Value"   value={money(avgAsset)}                 sub="per owned edition" />
        </div>
        <div style={{ ...grid3, marginTop: 16 }}>
          <Stat label="Active Auctions"  value={activeAuctions.toString()} />
          <Stat label="Settled Auctions" value={settledCount.toString()} />
          <Stat label="Starting Bonuses" value={startingBonuses._count.id.toString()} sub={`${money(bonuses)} distributed`} />
        </div>
      </Section>

      {/* ── All-time sourcing ── */}
      <Section title="All-Time Money Creation">
        <div style={grid2}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 16 }}>SOURCES (IN)</div>
            {[
              { label: 'Starting bonuses', value: bonuses },
              { label: 'Business income',  value: bizAll  },
              { label: 'Salary paid',      value: salAll  },
              { label: 'Challenge rewards',value: chalAll },
              { label: 'Admin created',    value: adminIn },
              { label: 'Reversal refunds', value: revIn   },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>{money(r.value)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
              <span>Total injected</span>
              <span style={{ color: 'var(--green)' }}>{money(totalInjected)}</span>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 16 }}>SINKS (OUT)</div>
            {[
              { label: 'Upkeep charged',    value: upAll   },
              { label: 'Admin destroyed',   value: adminOut },
              { label: 'Reversal clawbacks',value: revOut  },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>{money(r.value)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
              <span>Total burned</span>
              <span style={{ color: 'var(--red)' }}>{money(totalBurned)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
              <span>Net created</span>
              <span style={{ color: netCreated > 0 ? 'var(--red)' : 'var(--green)' }}>
                {netCreated >= 0 ? '+' : ''}{money(netCreated)}
              </span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
