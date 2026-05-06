export type AircraftType =
  | 'prop_plane'
  | 'light_jet'
  | 'private_jet'
  | 'private_jet_vip'
  | 'long_range_jet'
  | 'ultra_lux_jet'
  | 'ultra_lux_flagship'
  | 'flying_mansion'
  | 'cargo_lux'
  | 'helicopter'
  | 'helicopter_vip'
  | 'seaplane'
  | 'budget_aircraft'
  | 'novelty_aircraft'
  | 'blimp'
  | 'crazy_jetpack'
  | 'crazy_wings'
  | 'crazy_paraglider'
  | 'crazy_throne'

export interface AircraftTypeDef {
  label: string
  upkeepRate: number
  prestige: string
  emoji: string
}

export const AIRCRAFT_TYPE_DEFS: Record<AircraftType, AircraftTypeDef> = {
  prop_plane:         { label: 'Prop Plane',          upkeepRate: 0.010, prestige: 'Medium',         emoji: '✈️'  },
  light_jet:          { label: 'Light Jet',           upkeepRate: 0.012, prestige: 'High',            emoji: '🛩️' },
  private_jet:        { label: 'Private Jet',         upkeepRate: 0.015, prestige: 'High',            emoji: '🛩️' },
  private_jet_vip:    { label: 'Private Jet',         upkeepRate: 0.018, prestige: 'Very High',       emoji: '🛩️' },
  long_range_jet:     { label: 'Long-Range Jet',      upkeepRate: 0.020, prestige: 'Very High',       emoji: '✈️'  },
  ultra_lux_jet:      { label: 'Ultra-Lux Jet',       upkeepRate: 0.022, prestige: 'Elite',           emoji: '🛩️' },
  ultra_lux_flagship: { label: 'Ultra-Lux Flagship',  upkeepRate: 0.025, prestige: 'Elite',           emoji: '🛩️' },
  flying_mansion:     { label: 'Flying Mansion',      upkeepRate: 0.030, prestige: 'Ultra',           emoji: '🛫' },
  cargo_lux:          { label: 'Converted Cargo Jet', upkeepRate: 0.035, prestige: 'Ultra',           emoji: '✈️'  },
  helicopter:         { label: 'Helicopter',          upkeepRate: 0.015, prestige: 'High',            emoji: '🚁' },
  helicopter_vip:     { label: 'Helicopter',          upkeepRate: 0.018, prestige: 'Very High',       emoji: '🚁' },
  seaplane:           { label: 'Seaplane',            upkeepRate: 0.010, prestige: 'Medium',          emoji: '🛥️' },
  budget_aircraft:    { label: 'Budget Aircraft',     upkeepRate: 0.005, prestige: 'Questionable',    emoji: '🪂' },
  novelty_aircraft:   { label: 'Novelty Aircraft',    upkeepRate: 0.004, prestige: 'Weird Flex',      emoji: '🎈' },
  blimp:              { label: 'Novelty Blimp',       upkeepRate: 0.020, prestige: 'Ridiculous',      emoji: '🎈' },
  crazy_jetpack:      { label: 'Questionable Aircraft', upkeepRate: 0.005, prestige: 'Certain Regret',  emoji: '💨' },
  crazy_wings:        { label: 'Questionable Aircraft', upkeepRate: 0.003, prestige: 'Questionable',    emoji: '🐦' },
  crazy_paraglider:   { label: 'Questionable Aircraft', upkeepRate: 0.004, prestige: 'HR Violation',    emoji: '🪑' },
  crazy_throne:       { label: 'Questionable Aircraft', upkeepRate: 0.006, prestige: 'Loudly Unsafe',   emoji: '💨' },
}

export function monthlyAircraftUpkeep(aircraftType: string, benchmarkPrice: number): number {
  const def = AIRCRAFT_TYPE_DEFS[aircraftType as AircraftType]
  const rate = def?.upkeepRate ?? 0.010
  return Math.round(benchmarkPrice * rate)
}
