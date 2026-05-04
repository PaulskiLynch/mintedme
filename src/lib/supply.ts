export function maxEditions(itemClass: string, userCount: number): number {
  switch (itemClass) {
    case 'unique':    return 1
    case 'grail':     return Math.min(10,    Math.max(1, Math.floor(userCount / 100)))
    case 'elite':     return Math.min(100,   Math.max(1, Math.floor(userCount / 10)))
    case 'premium':   return Math.min(1000,  Math.max(1, userCount))
    case 'essential': return Math.min(10000, Math.max(5, userCount * 5))
    default:          return 1
  }
}

export function supplyLabel(itemClass: string, userCount: number, totalSupply: number): string {
  const max = Math.min(totalSupply, maxEditions(itemClass, userCount))
  return `${max.toLocaleString()} in circulation`
}
