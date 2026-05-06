export interface ChallengeDef {
  code:    string
  label:   string
  icon:    string
  desc:    string
  reward:  number
  // optional progress display — returns e.g. "2/3" or null for boolean challenges
  progress?: (data: ChallengeData) => string | null
  met:     (data: ChallengeData) => boolean
}

export interface ChallengeData {
  carCount:            number
  bizCount:            number
  propCount:           number
  aircraftCount:       number
  hasWonAuction:       boolean
  cashBalance:         number
  hasFlippedForProfit: boolean
  categoryCount:       number  // distinct categories with at least 1 owned asset
}

export const CHALLENGES: ChallengeDef[] = [
  {
    code: 'first_wheels',
    label: 'First Wheels',
    icon: '🚗',
    desc: 'Own your first car',
    reward: 5_000,
    progress: d => `${Math.min(d.carCount, 1)}/1`,
    met: d => d.carCount >= 1,
  },
  {
    code: 'car_collector',
    label: 'Car Collector',
    icon: '🏎',
    desc: 'Own 3 cars',
    reward: 15_000,
    progress: d => `${Math.min(d.carCount, 3)}/3`,
    met: d => d.carCount >= 3,
  },
  {
    code: 'petrol_head',
    label: 'Petrol Head',
    icon: '🔥',
    desc: 'Own 5 cars',
    reward: 30_000,
    progress: d => `${Math.min(d.carCount, 5)}/5`,
    met: d => d.carCount >= 5,
  },
  {
    code: 'auction_hunter',
    label: 'Auction Hunter',
    icon: '🏆',
    desc: 'Win an auction',
    reward: 10_000,
    met: d => d.hasWonAuction,
  },
  {
    code: 'sharp_trader',
    label: 'Sharp Trader',
    icon: '📈',
    desc: 'Flip an asset for profit',
    reward: 20_000,
    met: d => d.hasFlippedForProfit,
  },
  {
    code: 'business_owner',
    label: 'Business Owner',
    icon: '🏢',
    desc: 'Own a business',
    reward: 15_000,
    met: d => d.bizCount >= 1,
  },
  {
    code: 'property_ladder',
    label: 'Property Ladder',
    icon: '🏠',
    desc: 'Own a property',
    reward: 15_000,
    met: d => d.propCount >= 1,
  },
  {
    code: 'high_flyer',
    label: 'High Flyer',
    icon: '✈️',
    desc: 'Own an aircraft',
    reward: 25_000,
    met: d => d.aircraftCount >= 1,
  },
  {
    code: 'half_millionaire',
    label: 'Half Millionaire',
    icon: '💰',
    desc: 'Hold $500k cash',
    reward: 50_000,
    met: d => d.cashBalance >= 500_000,
  },
  {
    code: 'diversified',
    label: 'Diversified',
    icon: '🌐',
    desc: 'Own assets in 3 different categories',
    reward: 40_000,
    progress: d => `${Math.min(d.categoryCount, 3)}/3`,
    met: d => d.categoryCount >= 3,
  },
]
