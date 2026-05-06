export const UPKEEP_CYCLE_DAYS = 30

const MONTHLY_RATES: Record<string, number> = {
  Mythic:    0.015,  // 1.5% — elite pressure
  Legendary: 0.012,  // 1.2%
  Exotic:    0.010,  // 1.0%
  Rare:      0.008,  // 0.8%
  Premium:   0.006,  // 0.6%
  Common:    0.005,  // 0.5%
  Custom:    0.015,  // 1-of-1 = same as Mythic
  Banger:    0.015,
}

export function monthlyUpkeep(rarityTier: string, benchmarkPrice: number): number {
  const rate = MONTHLY_RATES[rarityTier] ?? 0.005
  return Math.round(benchmarkPrice * rate)
}

export function upkeepDaysRemaining(
  lastUpkeepAt: Date | null,
  lastSaleDate: Date | null,
  createdAt: Date,
): number {
  const ref = lastUpkeepAt ?? lastSaleDate ?? createdAt
  const nextCharge = new Date(ref.getTime() + UPKEEP_CYCLE_DAYS * 24 * 60 * 60 * 1000)
  return Math.ceil((nextCharge.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}
