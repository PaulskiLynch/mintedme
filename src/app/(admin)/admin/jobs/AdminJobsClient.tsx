'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface JobAuctionEntry {
  id:           string
  jobCode:      string
  title:        string
  category:     string
  status:       string
  bidCount:     number
  winnerName:   string | null
  winnerSalary: number | null
  endsAt:       string
  createdAt:    string
}

export interface JobHoldingEntry {
  id:           string
  userId:       string
  username:     string
  jobCode:      string
  title:        string
  category:     string
  monthlySalary:number
  startedAt:    string
  lastPaidAt:   string | null
}

const CATALOGUE: { code: string; title: string; category: string }[] = [
  { code: 'luxury_dealer_mgr',          title: 'Luxury Dealership Manager',     category: 'Cars'           },
  { code: 'classic_car_restorer',        title: 'Classic Car Restorer',           category: 'Cars'           },
  { code: 'auction_floor_agent',         title: 'Auction Floor Agent',            category: 'Auctions'       },
  { code: 'private_jet_broker',          title: 'Private Jet Broker',             category: 'Jets'           },
  { code: 'yacht_charter_director',      title: 'Yacht Charter Director',         category: 'Yachts'         },
  { code: 'mansion_estate_mgr',          title: 'Mansion Estate Manager',         category: 'Mansions'       },
  { code: 'art_investment_analyst',      title: 'Art Investment Analyst',          category: 'Art'            },
  { code: 'gallery_curator',             title: 'Gallery Curator',                 category: 'Art'            },
  { code: 'watch_market_specialist',     title: 'Watch Market Specialist',         category: 'Watches'        },
  { code: 'rare_collectibles_scout',     title: 'Rare Collectibles Scout',         category: 'Collectibles'   },
  { code: 'fashion_house_buyer',         title: 'Fashion House Buyer',            category: 'Fashion'        },
  { code: 'nightlife_venue_mgr',         title: 'Nightlife Venue Manager',        category: 'Businesses'     },
  { code: 'boutique_hotel_op',           title: 'Boutique Hotel Operator',        category: 'Businesses'     },
  { code: 'cafe_chain_op',               title: 'Café Chain Operator',            category: 'Businesses'     },
  { code: 'media_brand_producer',        title: 'Media Brand Producer',           category: 'Businesses'     },
  { code: 'sports_franchise_scout',      title: 'Sports Franchise Scout',         category: 'Sports'         },
  { code: 'music_talent_mgr',            title: 'Music Talent Manager',           category: 'Entertainment'  },
  { code: 'film_finance_assoc',          title: 'Film Finance Associate',         category: 'Entertainment'  },
  { code: 'luxury_travel_concierge',     title: 'Luxury Travel Concierge',        category: 'Lifestyle'      },
  { code: 'vip_event_planner',           title: 'VIP Event Planner',              category: 'Lifestyle'      },
  { code: 'crypto_art_advisor',          title: 'Crypto Art Advisor',             category: 'Digital Assets' },
  { code: 'digital_collectibles_trader', title: 'Digital Collectibles Trader',    category: 'Digital Assets' },
  { code: 'startup_deal_scout',          title: 'Startup Deal Scout',             category: 'Business'       },
  { code: 'venture_portfolio_analyst',   title: 'Venture Portfolio Analyst',      category: 'Business'       },
  { code: 'brand_partnership_mgr',       title: 'Brand Partnership Manager',      category: 'Business'       },
  { code: 'real_estate_deal_finder',     title: 'Real Estate Deal Finder',        category: 'Mansions'       },
  { code: 'luxury_security_consultant',  title: 'Luxury Security Consultant',     category: 'Lifestyle'      },
  { code: 'personal_stylist',            title: 'Personal Stylist',               category: 'Fashion'        },
  { code: 'diamond_dealer',              title: 'Diamond Dealer',                 category: 'Collectibles'   },
  { code: 'wine_cellar_curator',         title: 'Wine Cellar Curator',            category: 'Collectibles'   },
  { code: 'race_team_strategist',        title: 'Race Team Strategist',           category: 'Cars'           },
  { code: 'supercar_test_driver',        title: 'Supercar Test Driver',           category: 'Cars'           },
  { code: 'private_island_broker',       title: 'Private Island Broker',          category: 'Real Estate'    },
  { code: 'mega_yacht_captain',          title: 'Mega Yacht Captain',             category: 'Yachts'         },
  { code: 'luxury_auctioneer',           title: 'Luxury Auctioneer',              category: 'Auctions'       },
  { code: 'global_brand_director',       title: 'Global Brand Director',          category: 'Business'       },
  { code: 'entertainment_deal_broker',   title: 'Entertainment Deal Broker',      category: 'Entertainment'  },
  { code: 'high_stakes_negotiator',      title: 'High-Stakes Negotiator',         category: 'Business'       },
  { code: 'billionaire_lifestyle_mgr',   title: 'Billionaire Lifestyle Manager',  category: 'Lifestyle'      },
  { code: 'millibux_market_maker',       title: 'MilliBux Market Maker',          category: 'Finance'        },
]

export default function AdminJobsClient({
  auctions,
  holdings,
}: {
  auctions: JobAuctionEntry[]
  holdings: JobHoldingEntry[]
}) {
  const router = useRouter()
  const [tab, setTab]           = useState<'auctions' | 'holdings'>('auctions')
  const [showCreate, setCreate] = useState(false)
  const [jobCode, setJobCode]   = useState(CATALOGUE[0].code)
  const [endsAt, setEndsAt]     = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  const inp: React.CSSProperties = {
    padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--white)', fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const tabStyle = (t: typeof tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: 'none', background: tab === t ? 'var(--gold)' : 'var(--bg3)',
    color: tab === t ? '#000' : 'var(--muted)',
  })

  async function createAuction() {
    setError(''); setBusy(true)
    const res  = await fetch('/api/admin/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobCode, endsAt }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    setCreate(false)
    router.refresh()
  }

  async function cancelAuction(id: string) {
    setBusy(true)
    await fetch(`/api/admin/jobs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_auction' }),
    })
    setBusy(false)
    router.refresh()
  }

  async function terminateHolding(id: string) {
    if (!confirm('Remove this employee from their job?')) return
    setBusy(true)
    await fetch(`/api/admin/jobs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'terminate_holding' }),
    })
    setBusy(false)
    router.refresh()
  }

  const STATUS_COLOUR: Record<string, string> = {
    active:  'var(--green)',
    settled: 'var(--muted)',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tabStyle('auctions')} onClick={() => setTab('auctions')}>
            Job Auctions ({auctions.length})
          </button>
          <button style={tabStyle('holdings')} onClick={() => setTab('holdings')}>
            Active Holdings ({holdings.length})
          </button>
        </div>
        {tab === 'auctions' && (
          <button
            onClick={() => setCreate(v => !v)}
            style={{ padding: '8px 18px', background: 'var(--gold)', color: '#000', fontWeight: 900, fontSize: 13, borderRadius: 6, border: 'none', cursor: 'pointer' }}
          >
            + Create Job Auction
          </button>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 16 }}>NEW JOB AUCTION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.06em' }}>JOB</div>
              <select style={inp} value={jobCode} onChange={e => setJobCode(e.target.value)}>
                {CATALOGUE.map(j => (
                  <option key={j.code} value={j.code}>{j.title} ({j.category})</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.06em' }}>CLOSES AT</div>
              <input style={inp} type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={createAuction} disabled={busy || !endsAt}
              style={{ padding: '8px 20px', background: 'var(--gold)', color: '#000', fontWeight: 900, fontSize: 13, borderRadius: 6, border: 'none', cursor: 'pointer' }}>
              {busy ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setCreate(false)}
              style={{ padding: '8px 16px', background: 'var(--bg3)', color: 'var(--muted)', fontWeight: 700, fontSize: 13, borderRadius: 6, border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {tab === 'auctions' && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Job', 'Category', 'Status', 'Bids', 'Winner', 'Salary Won', 'Closes', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auctions.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No job auctions yet.</td></tr>
              ) : auctions.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700 }}>{a.title}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>{a.category}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOUR[a.status] ?? 'var(--muted)' }}>{a.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{a.bidCount}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>{a.winnerName ? `@${a.winnerName}` : '—'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--gold)', fontWeight: 700 }}>{a.winnerSalary ? `$${a.winnerSalary.toLocaleString()}` : '—'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(a.endsAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {a.status === 'active' && (
                      <button onClick={() => cancelAuction(a.id)} disabled={busy}
                        style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'holdings' && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['User', 'Job', 'Category', 'Monthly Salary', 'Started', 'Last Paid', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No active job holdings.</td></tr>
              ) : holdings.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700 }}>@{h.username}</td>
                  <td style={{ padding: '10px 16px' }}>{h.title}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>{h.category}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--gold)', fontWeight: 700 }}>${h.monthlySalary.toLocaleString()}/mo</td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>
                    {new Date(h.startedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>
                    {h.lastPaidAt ? new Date(h.lastPaidAt).toLocaleDateString() : <span style={{ color: 'var(--red)' }}>Never</span>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button onClick={() => terminateHolding(h.id)} disabled={busy}
                      style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', cursor: 'pointer' }}>
                      Terminate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
