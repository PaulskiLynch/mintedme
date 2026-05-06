export type PropertyTier =
  | 'rent_free'
  | 'apartment'
  | 'townhouse'
  | 'villa'
  | 'mansion'
  | 'penthouse'
  | 'private_island'

export interface PropertyTierDef {
  label:             string
  rarityTier:        string
  appreciationRate:  number   // monthly fraction of benchmarkPrice added to asset value
  upkeepRate:        number   // monthly fraction of benchmarkPrice charged to owner
  perThousand:       number   // max total editions across this tier per 1000 active players
  prestige:          string
  emoji:             string
}

export const PROPERTY_TIER_DEFS: Record<PropertyTier, PropertyTierDef> = {
  rent_free:      { label: 'Rent-Free',      rarityTier: 'Common',    appreciationRate: 0,     upkeepRate: 0,     perThousand: Infinity, prestige: 'Shame',     emoji: '🏚️'  },
  apartment:      { label: 'Apartment',      rarityTier: 'Common',    appreciationRate: 0.003, upkeepRate: 0.003, perThousand: 120,      prestige: 'Low',       emoji: '🏢' },
  townhouse:      { label: 'Townhouse',      rarityTier: 'Premium',   appreciationRate: 0.004, upkeepRate: 0.004, perThousand: 60,       prestige: 'Medium',    emoji: '🏘️'  },
  villa:          { label: 'Villa',          rarityTier: 'Rare',      appreciationRate: 0.005, upkeepRate: 0.006, perThousand: 30,       prestige: 'High',      emoji: '🏡' },
  mansion:        { label: 'Mansion',        rarityTier: 'Exotic',    appreciationRate: 0.006, upkeepRate: 0.008, perThousand: 10,       prestige: 'Very High', emoji: '🏛️'  },
  penthouse:      { label: 'Penthouse',      rarityTier: 'Legendary', appreciationRate: 0.007, upkeepRate: 0.010, perThousand: 3,        prestige: 'Elite',     emoji: '🌆' },
  private_island: { label: 'Private Island', rarityTier: 'Mythic',   appreciationRate: 0.008, upkeepRate: 0.015, perThousand: 1,        prestige: 'Ultra',     emoji: '🏝️'  },
}

export function monthlyPropertyUpkeep(tier: string, benchmarkPrice: number): number {
  const def = PROPERTY_TIER_DEFS[tier as PropertyTier]
  if (!def || def.upkeepRate === 0) return 0
  return Math.round(benchmarkPrice * def.upkeepRate)
}

export function monthlyPropertyAppreciation(tier: string, benchmarkPrice: number): number {
  const def = PROPERTY_TIER_DEFS[tier as PropertyTier]
  if (!def || def.appreciationRate === 0) return 0
  return Math.round(benchmarkPrice * def.appreciationRate)
}

export function monthlyPropertyNet(tier: string, benchmarkPrice: number): number {
  return monthlyPropertyAppreciation(tier, benchmarkPrice) - monthlyPropertyUpkeep(tier, benchmarkPrice)
}
