export const BUSINESS_RISK_RATES = {
  safe:     { incomeRate: 0.020, upkeepRate: 0.005 },
  growth:   { incomeRate: 0.030, upkeepRate: 0.010 },
  risky:    { incomeRate: 0.050, upkeepRate: 0.025 },
  prestige: { incomeRate: 0.015, upkeepRate: 0.010 },
} as const

export type BusinessRiskTier = keyof typeof BUSINESS_RISK_RATES

export interface BusinessTypeDef {
  code: string
  title: string
  riskTier: BusinessRiskTier
}

export const BUSINESS_TYPES: BusinessTypeDef[] = [
  { code: 'cafe_chain',              title: 'Café Chain',               riskTier: 'safe'     },
  { code: 'boutique_gym',            title: 'Boutique Gym Group',        riskTier: 'safe'     },
  { code: 'car_wash_network',        title: 'Car Wash Network',          riskTier: 'safe'     },
  { code: 'storage_unit_portfolio',  title: 'Storage Unit Portfolio',    riskTier: 'safe'     },
  { code: 'vending_machine_route',   title: 'Vending Machine Route',     riskTier: 'safe'     },
  { code: 'food_truck_fleet',        title: 'Food Truck Fleet',          riskTier: 'safe'     },
  { code: 'luxury_barber_lounge',    title: 'Luxury Barber Lounge',      riskTier: 'safe'     },
  { code: 'sneaker_resale_store',    title: 'Sneaker Resale Store',      riskTier: 'growth'   },
  { code: 'boutique_hotel',          title: 'Boutique Hotel',            riskTier: 'growth'   },
  { code: 'rooftop_restaurant',      title: 'Rooftop Restaurant',        riskTier: 'growth'   },
  { code: 'nightclub_venue',         title: 'Nightclub Venue',           riskTier: 'growth'   },
  { code: 'private_security_firm',   title: 'Private Security Firm',     riskTier: 'growth'   },
  { code: 'digital_media_studio',    title: 'Digital Media Studio',      riskTier: 'growth'   },
  { code: 'event_production_co',     title: 'Event Production Company',  riskTier: 'growth'   },
  { code: 'luxury_rental_agency',    title: 'Luxury Rental Agency',      riskTier: 'growth'   },
  { code: 'supercar_rental_club',    title: 'Supercar Rental Club',      riskTier: 'risky'    },
  { code: 'music_label',             title: 'Music Label',               riskTier: 'risky'    },
  { code: 'indie_film_studio',       title: 'Indie Film Studio',         riskTier: 'risky'    },
  { code: 'fashion_label',           title: 'Fashion Label',             riskTier: 'risky'    },
  { code: 'tech_startup',            title: 'Tech Startup',              riskTier: 'risky'    },
  { code: 'esports_team',            title: 'Esports Team',              riskTier: 'risky'    },
  { code: 'crypto_trading_desk',     title: 'Crypto Trading Desk',       riskTier: 'risky'    },
  { code: 'talent_mgmt_agency',      title: 'Talent Management Agency',  riskTier: 'risky'    },
  { code: 'art_gallery',             title: 'Art Gallery',               riskTier: 'prestige' },
  { code: 'luxury_watch_boutique',   title: 'Luxury Watch Boutique',     riskTier: 'prestige' },
  { code: 'private_members_club',    title: 'Private Members Club',      riskTier: 'prestige' },
  { code: 'vineyard_estate',         title: 'Vineyard Estate',           riskTier: 'prestige' },
  { code: 'yacht_charter_brand',     title: 'Yacht Charter Brand',       riskTier: 'prestige' },
  { code: 'boutique_auction_house',  title: 'Boutique Auction House',    riskTier: 'prestige' },
  { code: 'global_media_house',      title: 'Global Media House',        riskTier: 'prestige' },
]

export const BUSINESS_BY_CODE = Object.fromEntries(BUSINESS_TYPES.map(b => [b.code, b]))

export const TIER_LABELS: Record<BusinessRiskTier, string> = {
  safe:     'Safe',
  growth:   'Growth',
  risky:    'Risky',
  prestige: 'Prestige',
}

export function businessGrossIncome(riskTier: string, benchmarkPrice: number): number {
  const rates = BUSINESS_RISK_RATES[riskTier as BusinessRiskTier]
  if (!rates) return 0
  return Math.floor(benchmarkPrice * rates.incomeRate)
}

export function businessUpkeepCost(riskTier: string, benchmarkPrice: number): number {
  const rates = BUSINESS_RISK_RATES[riskTier as BusinessRiskTier]
  if (!rates) return 0
  return Math.floor(benchmarkPrice * rates.upkeepRate)
}

export function businessNetIncome(riskTier: string, benchmarkPrice: number): number {
  return businessGrossIncome(riskTier, benchmarkPrice) - businessUpkeepCost(riskTier, benchmarkPrice)
}

export function businessYieldNet(riskTier: string): number {
  const rates = BUSINESS_RISK_RATES[riskTier as BusinessRiskTier]
  if (!rates) return 0
  return rates.incomeRate - rates.upkeepRate
}

export function businessIncomeDaysRemaining(
  lastIncomeAt: Date | null,
  lastSaleDate: Date | null,
  createdAt: Date,
): number {
  const ref  = lastIncomeAt ?? lastSaleDate ?? createdAt
  const next = new Date(ref.getTime() + 30 * 24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil((next.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}
