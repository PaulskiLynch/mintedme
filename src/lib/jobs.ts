export type BenefitType = 'upkeep_reduction' | 'purchase_discount' | 'income_bonus' | 'fee_reduction'

export interface JobDef {
  code:             string
  title:            string
  description:      string
  category:         string
  positionsPer1000: number
  minSalary:        number
  maxSalary:        number
  taxRate:          number      // fraction e.g. 0.18
  commissionScope:  string      // what transaction category earns commission
  commissionRate:   number      // fraction e.g. 0.0001
  benefitType:      BenefitType
  benefitTarget:    string      // what category the benefit applies to
  benefitValue:     number      // fraction e.g. 0.10
}

// Lightweight item descriptor used for benefit/commission matching
export interface ItemForJob {
  category:        string
  aircraftType?:   string | null
  yachtType?:      string | null
  propertyTier?:   string | null
  businessRiskTier?: string | null
}

export function benefitMatchesItem(target: string, item: ItemForJob): boolean {
  switch (target) {
    case 'Cars':              return !item.businessRiskTier && !item.propertyTier && !item.aircraftType && !item.yachtType
    case 'Jets':              return !!item.aircraftType
    case 'Yachts':            return !!item.yachtType
    case 'Mansions':
    case 'Real Estate':       return !!item.propertyTier
    case 'Businesses':        return !!item.businessRiskTier
    case 'High-value Assets': return !!item.aircraftType || !!item.yachtType || !!item.propertyTier ||
                                     (!item.businessRiskTier && !item.propertyTier && !item.aircraftType && !item.yachtType)
    case 'All Assets':        return true
    default:                  return item.category === target
  }
}

export function commissionMatchesTransaction(
  scope: string,
  txType: 'buy' | 'auction' | 'offer',
  item: ItemForJob,
): boolean {
  if (scope === 'Marketplace') return txType === 'buy' || txType === 'auction'
  if (scope === 'Auctions')    return txType === 'auction'
  if (scope === 'Offers')      return txType === 'offer'
  return benefitMatchesItem(scope, item)
}

export function calcCommission(rate: number, price: number, monthlySalary: number): number {
  return Math.min(Math.round(price * rate), 2 * monthlySalary)
}

export const JOB_CATALOGUE: JobDef[] = [
  {
    code: 'luxury_dealer_mgr', title: 'Luxury Dealership Manager',
    description: 'Convince players a $4M hypercar is a "responsible long-term investment."',
    category: 'Cars', positionsPer1000: 18, minSalary: 35000, maxSalary: 80000,
    taxRate: 0.18, commissionScope: 'Cars', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'Cars', benefitValue: 0.10,
  },
  {
    code: 'classic_car_restorer', title: 'Classic Car Restorer',
    description: 'Spend six months fixing a car just so someone can park it and never drive it.',
    category: 'Cars', positionsPer1000: 20, minSalary: 25000, maxSalary: 65000,
    taxRate: 0.15, commissionScope: 'Cars', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'Cars', benefitValue: 0.15,
  },
  {
    code: 'auction_floor_agent', title: 'Auction Floor Agent',
    description: 'Yell numbers confidently while rich people emotionally overpay in public.',
    category: 'Auctions', positionsPer1000: 20, minSalary: 20000, maxSalary: 55000,
    taxRate: 0.18, commissionScope: 'Auctions', commissionRate: 0.0001,
    benefitType: 'fee_reduction', benefitTarget: 'Auctions', benefitValue: 0.10,
  },
  {
    code: 'private_jet_broker', title: 'Private Jet Broker',
    description: 'Help billionaires save 14 minutes while spending $40 million.',
    category: 'Jets', positionsPer1000: 10, minSalary: 50000, maxSalary: 120000,
    taxRate: 0.25, commissionScope: 'Jets', commissionRate: 0.0002,
    benefitType: 'purchase_discount', benefitTarget: 'Jets', benefitValue: 0.10,
  },
  {
    code: 'yacht_charter_director', title: 'Yacht Charter Director',
    description: 'Turn floating maintenance nightmares into "exclusive lifestyle experiences."',
    category: 'Yachts', positionsPer1000: 10, minSalary: 45000, maxSalary: 110000,
    taxRate: 0.22, commissionScope: 'Yachts', commissionRate: 0.0002,
    benefitType: 'upkeep_reduction', benefitTarget: 'Yachts', benefitValue: 0.15,
  },
  {
    code: 'mansion_estate_mgr', title: 'Mansion Estate Manager',
    description: 'Coordinate twelve staff members so one person can ignore ten bedrooms properly.',
    category: 'Mansions', positionsPer1000: 14, minSalary: 40000, maxSalary: 95000,
    taxRate: 0.20, commissionScope: 'Mansions', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'Mansions', benefitValue: 0.10,
  },
  {
    code: 'art_investment_analyst', title: 'Art Investment Analyst',
    description: 'Explain why a glowing square is worth more than a hospital.',
    category: 'Art', positionsPer1000: 16, minSalary: 30000, maxSalary: 75000,
    taxRate: 0.22, commissionScope: 'Art', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Art', benefitValue: 0.10,
  },
  {
    code: 'gallery_curator', title: 'Gallery Curator',
    description: 'Nod thoughtfully beside abstract art until someone buys it.',
    category: 'Art', positionsPer1000: 16, minSalary: 25000, maxSalary: 60000,
    taxRate: 0.18, commissionScope: 'Art', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'Art', benefitValue: 0.10,
  },
  {
    code: 'watch_market_specialist', title: 'Watch Market Specialist',
    description: 'Call tiny mechanical circles "investment-grade assets" with a straight face.',
    category: 'Watches', positionsPer1000: 16, minSalary: 30000, maxSalary: 70000,
    taxRate: 0.20, commissionScope: 'Watches', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Watches', benefitValue: 0.10,
  },
  {
    code: 'rare_collectibles_scout', title: 'Rare Collectibles Scout',
    description: 'Hunt for objects nobody needed until they became expensive.',
    category: 'Collectibles', positionsPer1000: 20, minSalary: 20000, maxSalary: 55000,
    taxRate: 0.18, commissionScope: 'Collectibles', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Collectibles', benefitValue: 0.10,
  },
  {
    code: 'fashion_house_buyer', title: 'Fashion House Buyer',
    description: 'Spend fortunes on clothing that looks "effortlessly simple."',
    category: 'Fashion', positionsPer1000: 16, minSalary: 25000, maxSalary: 60000,
    taxRate: 0.16, commissionScope: 'Fashion', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Fashion', benefitValue: 0.10,
  },
  {
    code: 'nightlife_venue_mgr', title: 'Nightlife Venue Manager',
    description: 'Convert loud music, bad decisions, and VIP tables into monthly revenue.',
    category: 'Businesses', positionsPer1000: 14, minSalary: 35000, maxSalary: 85000,
    taxRate: 0.22, commissionScope: 'Businesses', commissionRate: 0.0001,
    benefitType: 'income_bonus', benefitTarget: 'Businesses', benefitValue: 0.10,
  },
  {
    code: 'boutique_hotel_op', title: 'Boutique Hotel Operator',
    description: 'Sell "authentic luxury experiences" at 8× the normal room price.',
    category: 'Businesses', positionsPer1000: 14, minSalary: 40000, maxSalary: 100000,
    taxRate: 0.24, commissionScope: 'Businesses', commissionRate: 0.0002,
    benefitType: 'income_bonus', benefitTarget: 'Businesses', benefitValue: 0.10,
  },
  {
    code: 'cafe_chain_op', title: 'Café Chain Operator',
    description: 'Monetize caffeine addiction one overpriced latte at a time.',
    category: 'Businesses', positionsPer1000: 20, minSalary: 25000, maxSalary: 65000,
    taxRate: 0.18, commissionScope: 'Businesses', commissionRate: 0.0001,
    benefitType: 'income_bonus', benefitTarget: 'Businesses', benefitValue: 0.10,
  },
  {
    code: 'media_brand_producer', title: 'Media Brand Producer',
    description: 'Manufacture hype, drama, and engagement for people who already have too much money.',
    category: 'Businesses', positionsPer1000: 14, minSalary: 35000, maxSalary: 90000,
    taxRate: 0.22, commissionScope: 'Businesses', commissionRate: 0.0001,
    benefitType: 'income_bonus', benefitTarget: 'Businesses', benefitValue: 0.10,
  },
  {
    code: 'sports_franchise_scout', title: 'Sports Franchise Scout',
    description: 'Identify athletes before their contracts become economically terrifying.',
    category: 'Sports', positionsPer1000: 10, minSalary: 45000, maxSalary: 110000,
    taxRate: 0.25, commissionScope: 'Sports', commissionRate: 0.0002,
    benefitType: 'purchase_discount', benefitTarget: 'Sports', benefitValue: 0.10,
  },
  {
    code: 'music_talent_mgr', title: 'Music Talent Manager',
    description: 'Tell artists "this deal is amazing exposure" while taking 20%.',
    category: 'Entertainment', positionsPer1000: 14, minSalary: 35000, maxSalary: 85000,
    taxRate: 0.20, commissionScope: 'Entertainment', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Entertainment', benefitValue: 0.10,
  },
  {
    code: 'film_finance_assoc', title: 'Film Finance Associate',
    description: 'Lose millions creatively while calling it "development spending."',
    category: 'Entertainment', positionsPer1000: 12, minSalary: 40000, maxSalary: 95000,
    taxRate: 0.22, commissionScope: 'Entertainment', commissionRate: 0.0001,
    benefitType: 'fee_reduction', benefitTarget: 'Entertainment', benefitValue: 0.10,
  },
  {
    code: 'luxury_travel_concierge', title: 'Luxury Travel Concierge',
    description: 'Book impossible vacations for people who complain about private islands.',
    category: 'Lifestyle', positionsPer1000: 20, minSalary: 20000, maxSalary: 55000,
    taxRate: 0.15, commissionScope: 'Lifestyle', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'Lifestyle', benefitValue: 0.10,
  },
  {
    code: 'vip_event_planner', title: 'VIP Event Planner',
    description: 'Organize elite parties where everyone pretends they\'re networking.',
    category: 'Lifestyle', positionsPer1000: 18, minSalary: 25000, maxSalary: 65000,
    taxRate: 0.16, commissionScope: 'Lifestyle', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Lifestyle', benefitValue: 0.10,
  },
  {
    code: 'crypto_art_advisor', title: 'Crypto Art Advisor',
    description: 'Explain JPEG economics with enough confidence that people stop asking questions.',
    category: 'Digital Assets', positionsPer1000: 12, minSalary: 35000, maxSalary: 90000,
    taxRate: 0.25, commissionScope: 'Digital Assets', commissionRate: 0.0002,
    benefitType: 'purchase_discount', benefitTarget: 'Digital Assets', benefitValue: 0.10,
  },
  {
    code: 'digital_collectibles_trader', title: 'Digital Collectibles Trader',
    description: 'Buy pixels low, sell pixels high, repeat until reality collapses.',
    category: 'Digital Assets', positionsPer1000: 18, minSalary: 20000, maxSalary: 60000,
    taxRate: 0.20, commissionScope: 'Digital Assets', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Digital Assets', benefitValue: 0.10,
  },
  {
    code: 'startup_deal_scout', title: 'Startup Deal Scout',
    description: 'Invest in companies with no profits but incredible slide decks.',
    category: 'Business', positionsPer1000: 16, minSalary: 30000, maxSalary: 85000,
    taxRate: 0.20, commissionScope: 'Businesses', commissionRate: 0.0001,
    benefitType: 'income_bonus', benefitTarget: 'Businesses', benefitValue: 0.10,
  },
  {
    code: 'venture_portfolio_analyst', title: 'Venture Portfolio Analyst',
    description: 'Turn catastrophic startup losses into "long-term positioning."',
    category: 'Business', positionsPer1000: 10, minSalary: 45000, maxSalary: 110000,
    taxRate: 0.25, commissionScope: 'Businesses', commissionRate: 0.0002,
    benefitType: 'upkeep_reduction', benefitTarget: 'Businesses', benefitValue: 0.10,
  },
  {
    code: 'brand_partnership_mgr', title: 'Brand Partnership Manager',
    description: 'Get luxury brands to collaborate because apparently everything needs a limited edition version.',
    category: 'Business', positionsPer1000: 16, minSalary: 30000, maxSalary: 75000,
    taxRate: 0.20, commissionScope: 'Businesses', commissionRate: 0.0001,
    benefitType: 'income_bonus', benefitTarget: 'Businesses', benefitValue: 0.08,
  },
  {
    code: 'real_estate_deal_finder', title: 'Real Estate Deal Finder',
    description: 'Discover properties normal people will never financially recover from viewing.',
    category: 'Mansions', positionsPer1000: 16, minSalary: 30000, maxSalary: 85000,
    taxRate: 0.20, commissionScope: 'Mansions', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Real Estate', benefitValue: 0.10,
  },
  {
    code: 'luxury_security_consultant', title: 'Luxury Security Consultant',
    description: 'Protect expensive objects from people who can\'t afford them.',
    category: 'Lifestyle', positionsPer1000: 12, minSalary: 35000, maxSalary: 90000,
    taxRate: 0.18, commissionScope: 'High-value Assets', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'High-value Assets', benefitValue: 0.10,
  },
  {
    code: 'personal_stylist', title: 'Personal Stylist',
    description: 'Charge enormous fees for saying "that works beautifully on you."',
    category: 'Fashion', positionsPer1000: 20, minSalary: 20000, maxSalary: 55000,
    taxRate: 0.15, commissionScope: 'Fashion', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'Fashion', benefitValue: 0.10,
  },
  {
    code: 'diamond_dealer', title: 'Diamond Dealer',
    description: 'Sell compressed geology with maximum emotional markup.',
    category: 'Collectibles', positionsPer1000: 8, minSalary: 50000, maxSalary: 120000,
    taxRate: 0.25, commissionScope: 'Collectibles', commissionRate: 0.0002,
    benefitType: 'purchase_discount', benefitTarget: 'Collectibles', benefitValue: 0.15,
  },
  {
    code: 'wine_cellar_curator', title: 'Wine Cellar Curator',
    description: 'Spend years aging grape juice so someone can drink it in 14 minutes.',
    category: 'Collectibles', positionsPer1000: 16, minSalary: 25000, maxSalary: 65000,
    taxRate: 0.18, commissionScope: 'Collectibles', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Collectibles', benefitValue: 0.10,
  },
  {
    code: 'race_team_strategist', title: 'Race Team Strategist',
    description: 'Burn millions finding ways to go 0.3 seconds faster.',
    category: 'Cars', positionsPer1000: 8, minSalary: 50000, maxSalary: 115000,
    taxRate: 0.25, commissionScope: 'Cars', commissionRate: 0.0002,
    benefitType: 'upkeep_reduction', benefitTarget: 'Cars', benefitValue: 0.15,
  },
  {
    code: 'supercar_test_driver', title: 'Supercar Test Driver',
    description: 'Risk your life ensuring rich people can accelerate emotionally.',
    category: 'Cars', positionsPer1000: 12, minSalary: 40000, maxSalary: 100000,
    taxRate: 0.20, commissionScope: 'Cars', commissionRate: 0.0001,
    benefitType: 'upkeep_reduction', benefitTarget: 'Cars', benefitValue: 0.10,
  },
  {
    code: 'private_island_broker', title: 'Private Island Broker',
    description: 'Match billionaires with islands they\'ll visit twice a year.',
    category: 'Real Estate', positionsPer1000: 4, minSalary: 75000, maxSalary: 175000,
    taxRate: 0.30, commissionScope: 'Real Estate', commissionRate: 0.0002,
    benefitType: 'purchase_discount', benefitTarget: 'Real Estate', benefitValue: 0.15,
  },
  {
    code: 'mega_yacht_captain', title: 'Mega Yacht Captain',
    description: 'Professionally relocate floating tax write-offs across oceans.',
    category: 'Yachts', positionsPer1000: 8, minSalary: 55000, maxSalary: 130000,
    taxRate: 0.22, commissionScope: 'Yachts', commissionRate: 0.0002,
    benefitType: 'upkeep_reduction', benefitTarget: 'Yachts', benefitValue: 0.20,
  },
  {
    code: 'luxury_auctioneer', title: 'Luxury Auctioneer',
    description: 'Create panic and urgency using only a hammer and eye contact.',
    category: 'Auctions', positionsPer1000: 8, minSalary: 50000, maxSalary: 120000,
    taxRate: 0.25, commissionScope: 'Auctions', commissionRate: 0.0002,
    benefitType: 'fee_reduction', benefitTarget: 'Auctions', benefitValue: 0.15,
  },
  {
    code: 'global_brand_director', title: 'Global Brand Director',
    description: 'Decide how luxury companies can charge even more for the same thing.',
    category: 'Business', positionsPer1000: 4, minSalary: 80000, maxSalary: 190000,
    taxRate: 0.30, commissionScope: 'Businesses', commissionRate: 0.0002,
    benefitType: 'income_bonus', benefitTarget: 'Businesses', benefitValue: 0.12,
  },
  {
    code: 'entertainment_deal_broker', title: 'Entertainment Deal Broker',
    description: 'Negotiate contracts where everyone smiles while secretly hating each other.',
    category: 'Entertainment', positionsPer1000: 14, minSalary: 25000, maxSalary: 70000,
    taxRate: 0.20, commissionScope: 'Entertainment', commissionRate: 0.0001,
    benefitType: 'purchase_discount', benefitTarget: 'Entertainment', benefitValue: 0.10,
  },
  {
    code: 'high_stakes_negotiator', title: 'High-Stakes Negotiator',
    description: 'Turn simple conversations into psychological warfare for profit.',
    category: 'Business', positionsPer1000: 8, minSalary: 60000, maxSalary: 140000,
    taxRate: 0.30, commissionScope: 'Offers', commissionRate: 0.0002,
    benefitType: 'fee_reduction', benefitTarget: 'Offers', benefitValue: 0.15,
  },
  {
    code: 'billionaire_lifestyle_mgr', title: 'Billionaire Lifestyle Manager',
    description: 'Manage the exhausting daily logistics of being absurdly wealthy.',
    category: 'Lifestyle', positionsPer1000: 4, minSalary: 90000, maxSalary: 210000,
    taxRate: 0.28, commissionScope: 'Lifestyle', commissionRate: 0.0002,
    benefitType: 'upkeep_reduction', benefitTarget: 'All Assets', benefitValue: 0.10,
  },
  {
    code: 'millibux_market_maker', title: 'MilliBux Market Maker',
    description: 'Quietly profit while everyone else thinks they\'re winning.',
    category: 'Finance', positionsPer1000: 4, minSalary: 100000, maxSalary: 240000,
    taxRate: 0.30, commissionScope: 'Marketplace', commissionRate: 0.0002,
    benefitType: 'fee_reduction', benefitTarget: 'Marketplace', benefitValue: 0.10,
  },
]

export const JOB_BY_CODE    = Object.fromEntries(JOB_CATALOGUE.map(j => [j.code, j]))
export const JOB_ICON_INDEX = new Map(JOB_CATALOGUE.map((j, i) => [j.code, i + 1]))

// 5 jobs per 10 users, minimum 5, capped at catalogue size
export function activeJobCount(userCount: number): number {
  return Math.min(JOB_CATALOGUE.length, Math.max(5, Math.floor(userCount / 10) * 5))
}

// Deterministic daily shuffle — same order for everyone on the same day
function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223
    return (s >>> 0) / 0x100000000
  }
}

export function dailyShuffledJobs(): JobDef[] {
  const d    = new Date()
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  const rng  = seededRandom(seed)
  const arr  = [...JOB_CATALOGUE]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function randomSalary(job: JobDef): number {
  return Math.floor(job.minSalary + Math.random() * (job.maxSalary - job.minSalary))
}

export function isJobActive(jobCode: string, userCount: number): boolean {
  const count  = activeJobCount(userCount)
  const active = dailyShuffledJobs().slice(0, count)
  return active.some(j => j.code === jobCode)
}
