export function scarcityThreshold(): number {
  return parseInt(process.env.SCARCITY_THRESHOLD ?? '0')
}

export function maxEditions(rarityTier: string, userCount: number): number {
  const threshold = scarcityThreshold()
  if (threshold > 0 && userCount < threshold) return 1
  if (rarityTier === 'Custom' || rarityTier === 'Banger') return 1
  const active = Math.max(userCount, 1000)
  const config: Record<string, [number, number]> = {
    Mythic:    [0.001, 1],
    Legendary: [0.003, 3],
    Exotic:    [0.005, 5],
    Rare:      [0.007, 7],
    Premium:   [0.008, 8],
    Common:    [0.010, 10],
  }
  const [rate, min] = config[rarityTier] ?? [0.001, 1]
  return Math.max(min, Math.floor(active * rate))
}
