export type YachtType =
  | 'luxury_yacht'
  | 'superyacht'
  | 'mega_yacht'
  | 'floating_mansion'
  | 'private_island_yacht'
  | 'small_yacht'
  | 'cabin_cruiser'
  | 'budget_yacht'
  | 'junk_yacht'
  | 'survival_yacht'

export interface YachtTypeDef {
  label:      string
  upkeepRate: number
  prestige:   string
  emoji:      string
}

export const YACHT_TYPE_DEFS: Record<YachtType, YachtTypeDef> = {
  luxury_yacht:         { label: 'Luxury Yacht',         upkeepRate: 0.015, prestige: 'High',            emoji: '⛵' },
  superyacht:           { label: 'Superyacht',           upkeepRate: 0.020, prestige: 'Very High',        emoji: '🛥️' },
  mega_yacht:           { label: 'Mega Yacht',           upkeepRate: 0.025, prestige: 'Elite',            emoji: '🛳️' },
  floating_mansion:     { label: 'Floating Mansion',     upkeepRate: 0.032, prestige: 'Ultra',            emoji: '🏰' },
  private_island_yacht: { label: 'Private Island Yacht', upkeepRate: 0.038, prestige: 'Ultra',            emoji: '🌊' },
  small_yacht:          { label: 'Small Yacht',          upkeepRate: 0.010, prestige: 'Medium',           emoji: '⛵' },
  cabin_cruiser:        { label: 'Cabin Cruiser',        upkeepRate: 0.008, prestige: 'Medium',           emoji: '🚤' },
  budget_yacht:         { label: 'Budget Yacht',         upkeepRate: 0.002, prestige: 'Embarrassing',     emoji: '🚣' },
  junk_yacht:           { label: 'Junk Yacht',           upkeepRate: 0.000, prestige: 'Legendary Shame',  emoji: '🛶' },
  survival_yacht:       { label: 'Survival Yacht',       upkeepRate: 0.000, prestige: 'Still Floating',   emoji: '🚪' },
}

export function monthlyYachtUpkeep(yachtType: string, benchmarkPrice: number): number {
  const def = YACHT_TYPE_DEFS[yachtType as YachtType]
  const rate = def?.upkeepRate ?? 0.015
  return Math.round(benchmarkPrice * rate)
}
