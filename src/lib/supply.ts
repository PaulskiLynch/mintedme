export function maxEditions(rarityTier: string, userCount: number): number {
  switch (rarityTier) {
    case 'Mythic':    return 1
    case 'Legendary': return Math.min(3,  1 + Math.floor(userCount / 200))
    case 'Exotic':    return Math.min(5,  2 + Math.floor(userCount / 100))
    case 'Rare':      return Math.min(7,  3 + Math.floor(userCount / 50))
    case 'Common':    return Math.min(10, 5 + Math.floor(userCount / 20))
    default:          return 1
  }
}
