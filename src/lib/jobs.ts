export interface JobDef {
  code: string
  title: string
  category: string
  minSalary: number
  maxSalary: number
}

export const JOB_CATALOGUE: JobDef[] = [
  { code: 'luxury_dealer_mgr',          title: 'Luxury Dealership Manager',    category: 'Cars',           minSalary: 35000,  maxSalary: 80000  },
  { code: 'classic_car_restorer',        title: 'Classic Car Restorer',          category: 'Cars',           minSalary: 25000,  maxSalary: 65000  },
  { code: 'auction_floor_agent',         title: 'Auction Floor Agent',           category: 'Auctions',       minSalary: 20000,  maxSalary: 55000  },
  { code: 'private_jet_broker',          title: 'Private Jet Broker',            category: 'Jets',           minSalary: 50000,  maxSalary: 120000 },
  { code: 'yacht_charter_director',      title: 'Yacht Charter Director',        category: 'Yachts',         minSalary: 45000,  maxSalary: 110000 },
  { code: 'mansion_estate_mgr',          title: 'Mansion Estate Manager',        category: 'Mansions',       minSalary: 40000,  maxSalary: 95000  },
  { code: 'art_investment_analyst',      title: 'Art Investment Analyst',        category: 'Art',            minSalary: 30000,  maxSalary: 75000  },
  { code: 'gallery_curator',             title: 'Gallery Curator',               category: 'Art',            minSalary: 25000,  maxSalary: 60000  },
  { code: 'watch_market_specialist',     title: 'Watch Market Specialist',       category: 'Watches',        minSalary: 30000,  maxSalary: 70000  },
  { code: 'rare_collectibles_scout',     title: 'Rare Collectibles Scout',       category: 'Collectibles',   minSalary: 20000,  maxSalary: 55000  },
  { code: 'fashion_house_buyer',         title: 'Fashion House Buyer',           category: 'Fashion',        minSalary: 25000,  maxSalary: 60000  },
  { code: 'nightlife_venue_mgr',         title: 'Nightlife Venue Manager',       category: 'Businesses',     minSalary: 35000,  maxSalary: 85000  },
  { code: 'boutique_hotel_op',           title: 'Boutique Hotel Operator',       category: 'Businesses',     minSalary: 40000,  maxSalary: 100000 },
  { code: 'cafe_chain_op',               title: 'Café Chain Operator',           category: 'Businesses',     minSalary: 25000,  maxSalary: 65000  },
  { code: 'media_brand_producer',        title: 'Media Brand Producer',          category: 'Businesses',     minSalary: 35000,  maxSalary: 90000  },
  { code: 'sports_franchise_scout',      title: 'Sports Franchise Scout',        category: 'Sports',         minSalary: 45000,  maxSalary: 110000 },
  { code: 'music_talent_mgr',            title: 'Music Talent Manager',          category: 'Entertainment',  minSalary: 35000,  maxSalary: 85000  },
  { code: 'film_finance_assoc',          title: 'Film Finance Associate',        category: 'Entertainment',  minSalary: 40000,  maxSalary: 95000  },
  { code: 'luxury_travel_concierge',     title: 'Luxury Travel Concierge',       category: 'Lifestyle',      minSalary: 20000,  maxSalary: 55000  },
  { code: 'vip_event_planner',           title: 'VIP Event Planner',             category: 'Lifestyle',      minSalary: 25000,  maxSalary: 65000  },
  { code: 'crypto_art_advisor',          title: 'Crypto Art Advisor',            category: 'Digital Assets', minSalary: 35000,  maxSalary: 90000  },
  { code: 'digital_collectibles_trader', title: 'Digital Collectibles Trader',   category: 'Digital Assets', minSalary: 20000,  maxSalary: 60000  },
  { code: 'startup_deal_scout',          title: 'Startup Deal Scout',            category: 'Business',       minSalary: 30000,  maxSalary: 85000  },
  { code: 'venture_portfolio_analyst',   title: 'Venture Portfolio Analyst',     category: 'Business',       minSalary: 45000,  maxSalary: 110000 },
  { code: 'brand_partnership_mgr',       title: 'Brand Partnership Manager',     category: 'Business',       minSalary: 30000,  maxSalary: 75000  },
  { code: 'real_estate_deal_finder',     title: 'Real Estate Deal Finder',       category: 'Mansions',       minSalary: 30000,  maxSalary: 85000  },
  { code: 'luxury_security_consultant',  title: 'Luxury Security Consultant',    category: 'Lifestyle',      minSalary: 35000,  maxSalary: 90000  },
  { code: 'personal_stylist',            title: 'Personal Stylist',              category: 'Fashion',        minSalary: 20000,  maxSalary: 55000  },
  { code: 'diamond_dealer',              title: 'Diamond Dealer',                category: 'Collectibles',   minSalary: 50000,  maxSalary: 120000 },
  { code: 'wine_cellar_curator',         title: 'Wine Cellar Curator',           category: 'Collectibles',   minSalary: 25000,  maxSalary: 65000  },
  { code: 'race_team_strategist',        title: 'Race Team Strategist',          category: 'Cars',           minSalary: 50000,  maxSalary: 115000 },
  { code: 'supercar_test_driver',        title: 'Supercar Test Driver',          category: 'Cars',           minSalary: 40000,  maxSalary: 100000 },
  { code: 'private_island_broker',       title: 'Private Island Broker',         category: 'Real Estate',    minSalary: 75000,  maxSalary: 175000 },
  { code: 'mega_yacht_captain',          title: 'Mega Yacht Captain',            category: 'Yachts',         minSalary: 55000,  maxSalary: 130000 },
  { code: 'luxury_auctioneer',           title: 'Luxury Auctioneer',             category: 'Auctions',       minSalary: 50000,  maxSalary: 120000 },
  { code: 'global_brand_director',       title: 'Global Brand Director',         category: 'Business',       minSalary: 80000,  maxSalary: 190000 },
  { code: 'entertainment_deal_broker',   title: 'Entertainment Deal Broker',     category: 'Entertainment',  minSalary: 25000,  maxSalary: 70000  },
  { code: 'high_stakes_negotiator',      title: 'High-Stakes Negotiator',        category: 'Business',       minSalary: 60000,  maxSalary: 140000 },
  { code: 'billionaire_lifestyle_mgr',   title: 'Billionaire Lifestyle Manager', category: 'Lifestyle',      minSalary: 90000,  maxSalary: 210000 },
  { code: 'millibux_market_maker',       title: 'MilliBux Market Maker',         category: 'Finance',        minSalary: 100000, maxSalary: 240000 },
]

export const JOB_BY_CODE = Object.fromEntries(JOB_CATALOGUE.map(j => [j.code, j]))

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
  const d   = new Date()
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
