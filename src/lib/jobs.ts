export interface JobDef {
  code: string
  title: string
  category: string
  baseSlotsPerThousand: number
  minSalary: number
  maxSalary: number
}

export const JOB_CATALOGUE: JobDef[] = [
  { code: 'luxury_dealer_mgr',          title: 'Luxury Dealership Manager',     category: 'Cars',          baseSlotsPerThousand: 18, minSalary: 35000,  maxSalary: 80000  },
  { code: 'classic_car_restorer',        title: 'Classic Car Restorer',           category: 'Cars',          baseSlotsPerThousand: 20, minSalary: 25000,  maxSalary: 65000  },
  { code: 'auction_floor_agent',         title: 'Auction Floor Agent',            category: 'Auctions',      baseSlotsPerThousand: 20, minSalary: 20000,  maxSalary: 55000  },
  { code: 'private_jet_broker',          title: 'Private Jet Broker',             category: 'Jets',          baseSlotsPerThousand: 10, minSalary: 50000,  maxSalary: 120000 },
  { code: 'yacht_charter_director',      title: 'Yacht Charter Director',         category: 'Yachts',        baseSlotsPerThousand: 10, minSalary: 45000,  maxSalary: 110000 },
  { code: 'mansion_estate_mgr',          title: 'Mansion Estate Manager',         category: 'Mansions',      baseSlotsPerThousand: 14, minSalary: 40000,  maxSalary: 95000  },
  { code: 'art_investment_analyst',      title: 'Art Investment Analyst',          category: 'Art',           baseSlotsPerThousand: 16, minSalary: 30000,  maxSalary: 75000  },
  { code: 'gallery_curator',             title: 'Gallery Curator',                 category: 'Art',           baseSlotsPerThousand: 16, minSalary: 25000,  maxSalary: 60000  },
  { code: 'watch_market_specialist',     title: 'Watch Market Specialist',         category: 'Watches',       baseSlotsPerThousand: 16, minSalary: 30000,  maxSalary: 70000  },
  { code: 'rare_collectibles_scout',     title: 'Rare Collectibles Scout',         category: 'Collectibles',  baseSlotsPerThousand: 20, minSalary: 20000,  maxSalary: 55000  },
  { code: 'fashion_house_buyer',         title: 'Fashion House Buyer',            category: 'Fashion',       baseSlotsPerThousand: 16, minSalary: 25000,  maxSalary: 60000  },
  { code: 'nightlife_venue_mgr',         title: 'Nightlife Venue Manager',        category: 'Businesses',    baseSlotsPerThousand: 14, minSalary: 35000,  maxSalary: 85000  },
  { code: 'boutique_hotel_op',           title: 'Boutique Hotel Operator',        category: 'Businesses',    baseSlotsPerThousand: 14, minSalary: 40000,  maxSalary: 100000 },
  { code: 'cafe_chain_op',               title: 'Café Chain Operator',            category: 'Businesses',    baseSlotsPerThousand: 20, minSalary: 25000,  maxSalary: 65000  },
  { code: 'media_brand_producer',        title: 'Media Brand Producer',           category: 'Businesses',    baseSlotsPerThousand: 14, minSalary: 35000,  maxSalary: 90000  },
  { code: 'sports_franchise_scout',      title: 'Sports Franchise Scout',         category: 'Sports',        baseSlotsPerThousand: 10, minSalary: 45000,  maxSalary: 110000 },
  { code: 'music_talent_mgr',            title: 'Music Talent Manager',           category: 'Entertainment', baseSlotsPerThousand: 14, minSalary: 35000,  maxSalary: 85000  },
  { code: 'film_finance_assoc',          title: 'Film Finance Associate',         category: 'Entertainment', baseSlotsPerThousand: 12, minSalary: 40000,  maxSalary: 95000  },
  { code: 'luxury_travel_concierge',     title: 'Luxury Travel Concierge',        category: 'Lifestyle',     baseSlotsPerThousand: 20, minSalary: 20000,  maxSalary: 55000  },
  { code: 'vip_event_planner',           title: 'VIP Event Planner',              category: 'Lifestyle',     baseSlotsPerThousand: 18, minSalary: 25000,  maxSalary: 65000  },
  { code: 'crypto_art_advisor',          title: 'Crypto Art Advisor',             category: 'Digital Assets', baseSlotsPerThousand: 12, minSalary: 35000,  maxSalary: 90000  },
  { code: 'digital_collectibles_trader', title: 'Digital Collectibles Trader',    category: 'Digital Assets', baseSlotsPerThousand: 18, minSalary: 20000,  maxSalary: 60000  },
  { code: 'startup_deal_scout',          title: 'Startup Deal Scout',             category: 'Business',      baseSlotsPerThousand: 16, minSalary: 30000,  maxSalary: 85000  },
  { code: 'venture_portfolio_analyst',   title: 'Venture Portfolio Analyst',      category: 'Business',      baseSlotsPerThousand: 10, minSalary: 45000,  maxSalary: 110000 },
  { code: 'brand_partnership_mgr',       title: 'Brand Partnership Manager',      category: 'Business',      baseSlotsPerThousand: 16, minSalary: 30000,  maxSalary: 75000  },
  { code: 'real_estate_deal_finder',     title: 'Real Estate Deal Finder',        category: 'Mansions',      baseSlotsPerThousand: 16, minSalary: 30000,  maxSalary: 85000  },
  { code: 'luxury_security_consultant',  title: 'Luxury Security Consultant',     category: 'Lifestyle',     baseSlotsPerThousand: 12, minSalary: 35000,  maxSalary: 90000  },
  { code: 'personal_stylist',            title: 'Personal Stylist',               category: 'Fashion',       baseSlotsPerThousand: 20, minSalary: 20000,  maxSalary: 55000  },
  { code: 'diamond_dealer',              title: 'Diamond Dealer',                 category: 'Collectibles',  baseSlotsPerThousand: 8,  minSalary: 50000,  maxSalary: 120000 },
  { code: 'wine_cellar_curator',         title: 'Wine Cellar Curator',            category: 'Collectibles',  baseSlotsPerThousand: 16, minSalary: 25000,  maxSalary: 65000  },
  { code: 'race_team_strategist',        title: 'Race Team Strategist',           category: 'Cars',          baseSlotsPerThousand: 8,  minSalary: 50000,  maxSalary: 115000 },
  { code: 'supercar_test_driver',        title: 'Supercar Test Driver',           category: 'Cars',          baseSlotsPerThousand: 12, minSalary: 40000,  maxSalary: 100000 },
  { code: 'private_island_broker',       title: 'Private Island Broker',          category: 'Real Estate',   baseSlotsPerThousand: 4,  minSalary: 75000,  maxSalary: 175000 },
  { code: 'mega_yacht_captain',          title: 'Mega Yacht Captain',             category: 'Yachts',        baseSlotsPerThousand: 8,  minSalary: 55000,  maxSalary: 130000 },
  { code: 'luxury_auctioneer',           title: 'Luxury Auctioneer',              category: 'Auctions',      baseSlotsPerThousand: 8,  minSalary: 50000,  maxSalary: 120000 },
  { code: 'global_brand_director',       title: 'Global Brand Director',          category: 'Business',      baseSlotsPerThousand: 4,  minSalary: 80000,  maxSalary: 190000 },
  { code: 'entertainment_deal_broker',   title: 'Entertainment Deal Broker',      category: 'Entertainment', baseSlotsPerThousand: 14, minSalary: 25000,  maxSalary: 70000  },
  { code: 'high_stakes_negotiator',      title: 'High-Stakes Negotiator',         category: 'Business',      baseSlotsPerThousand: 8,  minSalary: 60000,  maxSalary: 140000 },
  { code: 'billionaire_lifestyle_mgr',   title: 'Billionaire Lifestyle Manager',  category: 'Lifestyle',     baseSlotsPerThousand: 4,  minSalary: 90000,  maxSalary: 210000 },
  { code: 'millibux_market_maker',       title: 'MilliBux Market Maker',          category: 'Finance',       baseSlotsPerThousand: 4,  minSalary: 100000, maxSalary: 240000 },
]

export const JOB_BY_CODE = Object.fromEntries(JOB_CATALOGUE.map(j => [j.code, j]))

export function slotsForJob(baseSlotsPerThousand: number, activeUsers: number): number {
  return Math.floor(baseSlotsPerThousand * Math.max(activeUsers, 1000) / 1000)
}

export function randomSalary(job: JobDef): number {
  return Math.floor(job.minSalary + Math.random() * (job.maxSalary - job.minSalary))
}
