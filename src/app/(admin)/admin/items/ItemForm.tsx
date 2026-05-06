'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const RARITY_TIERS   = ['Common', 'Premium', 'Rare', 'Exotic', 'Legendary', 'Mythic', 'Custom', 'Banger']
const CATEGORIES     = ['cars', 'businesses', 'properties', 'aircraft', 'yachts', 'watches', 'art', 'fashion', 'collectibles']
const PROPERTY_TIERS = ['rent_free', 'apartment', 'townhouse', 'villa', 'mansion', 'penthouse', 'private_island']
const AIRCRAFT_TYPES = ['prop_plane', 'light_jet', 'private_jet', 'heavy_jet', 'ultra_long_range', 'cargo_lux', 'helicopter', 'seaplane', 'supersonic']
const ITEM_STATUSES  = ['active', 'draft', 'retired']

const BIZ_TYPES = [
  { code: 'cafe_chain',              title: 'Café Chain'               },
  { code: 'boutique_gym',            title: 'Boutique Gym Group'       },
  { code: 'car_wash_network',        title: 'Car Wash Network'         },
  { code: 'storage_unit_portfolio',  title: 'Storage Unit Portfolio'   },
  { code: 'vending_machine_route',   title: 'Vending Machine Route'    },
  { code: 'food_truck_fleet',        title: 'Food Truck Fleet'         },
  { code: 'luxury_barber_lounge',    title: 'Luxury Barber Lounge'     },
  { code: 'sneaker_resale_store',    title: 'Sneaker Resale Store'     },
  { code: 'boutique_hotel',          title: 'Boutique Hotel'           },
  { code: 'rooftop_restaurant',      title: 'Rooftop Restaurant'       },
  { code: 'nightclub_venue',         title: 'Nightclub Venue'          },
  { code: 'private_security_firm',   title: 'Private Security Firm'    },
  { code: 'digital_media_studio',    title: 'Digital Media Studio'     },
  { code: 'event_production_co',     title: 'Event Production Company' },
  { code: 'luxury_rental_agency',    title: 'Luxury Rental Agency'     },
  { code: 'supercar_rental_club',    title: 'Supercar Rental Club'     },
  { code: 'music_label',             title: 'Music Label'              },
  { code: 'indie_film_studio',       title: 'Indie Film Studio'        },
  { code: 'fashion_label',           title: 'Fashion Label'            },
  { code: 'tech_startup',            title: 'Tech Startup'             },
  { code: 'esports_team',            title: 'Esports Team'             },
  { code: 'crypto_trading_desk',     title: 'Crypto Trading Desk'      },
  { code: 'talent_mgmt_agency',      title: 'Talent Management Agency' },
  { code: 'art_gallery',             title: 'Art Gallery'              },
  { code: 'luxury_watch_boutique',   title: 'Luxury Watch Boutique'    },
  { code: 'private_members_club',    title: 'Private Members Club'     },
  { code: 'vineyard_estate',         title: 'Vineyard Estate'          },
  { code: 'yacht_charter_brand',     title: 'Yacht Charter Brand'      },
  { code: 'boutique_auction_house',  title: 'Boutique Auction House'   },
  { code: 'global_media_house',      title: 'Global Media House'       },
]

export interface ItemData {
  id?:              string
  name:             string
  inspirationName:  string
  description:      string
  category:         string
  rarityTier:       string
  imageUrl:         string
  totalSupply:      number
  benchmarkPrice:   number
  horsepower:       string
  topSpeed:         string
  zeroToHundred:    string
  businessType:     string
  businessRiskTier: string
  propertyTier:     string
  aircraftType:     string
  isOfficial:       boolean
  isApproved:       boolean
  isFrozen:         boolean
  itemStatus:       string
}

const DEFAULTS: ItemData = {
  name: '', inspirationName: '', description: '', category: 'cars',
  rarityTier: 'Common', imageUrl: '', totalSupply: 10, benchmarkPrice: 100000,
  horsepower: '', topSpeed: '', zeroToHundred: '', businessType: '',
  businessRiskTier: 'safe', propertyTier: '', aircraftType: '',
  isOfficial: true, isApproved: true, isFrozen: false, itemStatus: 'active',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--bg3)',
  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontSize: 13,
  boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }
const grp: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }

export default function ItemForm({ initial, isEdit }: { initial?: Partial<ItemData>; isEdit?: boolean }) {
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [form, setForm]         = useState<ItemData>({ ...DEFAULTS, ...initial })
  const [seedEdition, setSeed]  = useState(!isEdit)
  const [busy, setBusy]         = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [preview, setPreview]   = useState(initial?.imageUrl ?? '')

  function set(field: keyof ItemData, value: string | number | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPreview(URL.createObjectURL(file))
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      set('imageUrl', data.url)
      setPreview(data.url)
    } else {
      setError(data.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  const minimumBid = Math.round(Number(form.benchmarkPrice) * 0.10)
  const isBusiness = form.category === 'businesses'
  const isProperty = form.category === 'properties'
  const isAircraft = form.category === 'aircraft'
  const isCar      = form.category === 'cars'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const url    = isEdit ? `/api/admin/items/${form.id}` : '/api/admin/items'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, seedEdition }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setBusy(false); return }
    router.push('/admin/items')
    router.refresh()
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700 }}>

      {/* Image upload */}
      <div style={grp}>
        <label style={lbl}>IMAGE</label>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 100, height: 100, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {preview
              ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'var(--muted)', fontSize: 11 }}>No image</span>
            }
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ ...inp, cursor: 'pointer', textAlign: 'center', color: uploading ? 'var(--muted)' : 'var(--gold)', fontWeight: 700 }}>
              {uploading ? 'Uploading…' : '↑ Upload image'}
            </button>
            <input style={inp} value={form.imageUrl} onChange={e => { set('imageUrl', e.target.value); setPreview(e.target.value) }} placeholder="or paste URL: /items/… or https://…" />
          </div>
        </div>
      </div>

      {/* Core */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ ...grp, gridColumn: '1 / -1' }}>
          <label style={lbl}>NAME *</label>
          <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Rosso Strada V12" />
        </div>
        <div style={grp}>
          <label style={lbl}>INSPIRATION NAME</label>
          <input style={inp} value={form.inspirationName} onChange={e => set('inspirationName', e.target.value)} placeholder="Real-world reference (admin only)" />
        </div>
        <div style={grp}>
          <label style={lbl}>ITEM STATUS</label>
          <select style={inp} value={form.itemStatus} onChange={e => set('itemStatus', e.target.value)}>
            {ITEM_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ ...grp, gridColumn: '1 / -1' }}>
          <label style={lbl}>DESCRIPTION</label>
          <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional flavour text" />
        </div>
      </div>

      {/* Classification */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div style={grp}>
          <label style={lbl}>CATEGORY *</label>
          <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div style={grp}>
          <label style={lbl}>RARITY TIER *</label>
          <select style={inp} value={form.rarityTier} onChange={e => set('rarityTier', e.target.value)}>
            {RARITY_TIERS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={grp}>
          <label style={lbl}>TOTAL SUPPLY *</label>
          <input style={inp} type="number" min={1} value={form.totalSupply} onChange={e => set('totalSupply', Number(e.target.value))} required />
        </div>
      </div>

      {/* Pricing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={grp}>
          <label style={lbl}>BENCHMARK PRICE *</label>
          <input style={inp} type="number" min={1} value={form.benchmarkPrice} onChange={e => set('benchmarkPrice', Number(e.target.value))} required />
        </div>
        <div style={grp}>
          <label style={lbl}>MINIMUM BID (auto 10%)</label>
          <input style={{ ...inp, opacity: 0.5 }} value={`$${minimumBid.toLocaleString()}`} readOnly />
        </div>
      </div>

      {/* Car stats */}
      {isCar && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 12 }}>CAR STATS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={grp}>
              <label style={lbl}>HORSEPOWER (HP)</label>
              <input style={inp} type="number" min={0} value={form.horsepower} onChange={e => set('horsepower', e.target.value)} placeholder="e.g. 572" />
            </div>
            <div style={grp}>
              <label style={lbl}>TOP SPEED (km/h)</label>
              <input style={inp} type="number" min={0} value={form.topSpeed} onChange={e => set('topSpeed', e.target.value)} placeholder="e.g. 320" />
            </div>
            <div style={grp}>
              <label style={lbl}>0–100 KM/H (s)</label>
              <input style={inp} type="number" min={0} step={0.1} value={form.zeroToHundred} onChange={e => set('zeroToHundred', e.target.value)} placeholder="e.g. 2.9" />
            </div>
          </div>
        </div>
      )}

      {/* Business fields */}
      {isBusiness && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 12 }}>BUSINESS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={grp}>
              <label style={lbl}>BUSINESS TYPE</label>
              <select style={inp} value={form.businessType} onChange={e => set('businessType', e.target.value)}>
                <option value="">— select —</option>
                {BIZ_TYPES.map(b => <option key={b.code} value={b.code}>{b.title}</option>)}
              </select>
            </div>
            <div style={grp}>
              <label style={lbl}>RISK TIER</label>
              <select style={inp} value={form.businessRiskTier} onChange={e => set('businessRiskTier', e.target.value)}>
                <option value="safe">Safe</option>
                <option value="growth">Growth</option>
                <option value="risky">Risky</option>
                <option value="prestige">Prestige</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Property fields */}
      {isProperty && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 12 }}>PROPERTY</div>
          <div style={grp}>
            <label style={lbl}>PROPERTY TIER</label>
            <select style={inp} value={form.propertyTier} onChange={e => set('propertyTier', e.target.value)}>
              <option value="">— select —</option>
              {PROPERTY_TIERS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Aircraft fields */}
      {isAircraft && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 12 }}>AIRCRAFT</div>
          <div style={grp}>
            <label style={lbl}>AIRCRAFT TYPE</label>
            <select style={inp} value={form.aircraftType} onChange={e => set('aircraftType', e.target.value)}>
              <option value="">— select —</option>
              {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Flags */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {([
          { field: 'isOfficial' as const,  label: 'Official item' },
          { field: 'isApproved' as const,  label: 'Approved'      },
          { field: 'isFrozen'   as const,  label: 'Frozen'        },
        ]).map(({ field, label }) => (
          <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form[field] as boolean} onChange={e => set(field, e.target.checked)} />
            {label}
          </label>
        ))}
        {!isEdit && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={seedEdition} onChange={e => setSeed(e.target.checked)} />
            Seed edition #1 immediately
          </label>
        )}
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={busy || uploading}
          style={{ padding: '10px 28px', background: 'var(--gold)', color: '#000', fontWeight: 900, fontSize: 13, borderRadius: 6, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: (busy || uploading) ? 0.6 : 1 }}>
          {busy ? '...' : isEdit ? 'Save changes' : 'Create item'}
        </button>
        <button type="button" onClick={() => router.back()}
          style={{ padding: '10px 20px', background: 'var(--bg3)', color: 'var(--muted)', fontWeight: 700, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
