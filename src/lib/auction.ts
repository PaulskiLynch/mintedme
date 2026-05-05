export function bidIncrement(currentBid: number): number {
  if (currentBid < 1_000)    return 50
  if (currentBid < 5_000)    return 100
  if (currentBid < 25_000)   return 500
  if (currentBid < 100_000)  return 1_000
  if (currentBid < 500_000)  return 5_000
  return 10_000
}
