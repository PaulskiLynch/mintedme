/** Returns the spendable portion of a user's wallet: total minus funds locked in active bids. */
export function availableBalance(user: { balance: { toString(): string } | number; lockedBalance: { toString(): string } | number }): number {
  return Number(user.balance) - Number(user.lockedBalance)
}
