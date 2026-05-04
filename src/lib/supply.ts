export function maxEditions(itemClass: string, userCount: number): number {
  switch (itemClass) {
    case 'unique':    return 1
    case 'grail':     return Math.min(10,    2 + Math.floor(userCount / 50))
    case 'elite':     return Math.min(100,   5 + Math.floor(userCount / 5))
    case 'premium':   return Math.min(1000,  20 + userCount * 10)
    case 'essential': return Math.min(10000, 100 + userCount * 50)
    default:          return 1
  }
}

export function supplyLabel(itemClass: string, userCount: number, totalSupply: number): string {
  const max = Math.min(totalSupply, maxEditions(itemClass, userCount))
  return `${max.toLocaleString()} in circulation`
}
