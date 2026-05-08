export interface LoanProduct {
  id:           string
  name:         string
  maxLtv:       number   // e.g. 0.65
  monthlyRate:  number   // e.g. 0.0075
  termMonths:   number
}

export const STANDARD_PRODUCTS: Record<string, LoanProduct> = {
  safe_business:     { id: 'safe_business',     name: 'Safe Business',                maxLtv: 0.65, monthlyRate: 0.0075, termMonths: 24 },
  growth_business:   { id: 'growth_business',   name: 'Growth Business',              maxLtv: 0.55, monthlyRate: 0.0125, termMonths: 18 },
  risky_business:    { id: 'risky_business',     name: 'Risky Business',               maxLtv: 0.45, monthlyRate: 0.02,   termMonths: 12 },
  prestige_business: { id: 'prestige_business',  name: 'Prestige Business',            maxLtv: 0.35, monthlyRate: 0.015,  termMonths: 18 },
  property:          { id: 'property',           name: 'Property / Mansion',           maxLtv: 0.45, monthlyRate: 0.015,  termMonths: 24 },
  car:               { id: 'car',                name: 'Car',                          maxLtv: 0.30, monthlyRate: 0.0225, termMonths: 12 },
  yacht:             { id: 'yacht',              name: 'Yacht',                        maxLtv: 0.25, monthlyRate: 0.025,  termMonths: 12 },
  aircraft:          { id: 'aircraft',           name: 'Jet / Aircraft',               maxLtv: 0.25, monthlyRate: 0.0275, termMonths: 12 },
  collectibles:      { id: 'collectibles',       name: 'Art / Watches / Collectibles', maxLtv: 0.20, monthlyRate: 0.0275, termMonths: 12 },
}

export const STARTER_PRODUCT: LoanProduct & { maxBenchmarkPrice: number } = {
  id:               'starter',
  name:             'Starter Business Loan',
  maxLtv:           0.70,
  monthlyRate:      0.005,
  termMonths:       36,
  maxBenchmarkPrice: 300_000,
}

export const PAYMENT_INCOME_CAP  = 0.60   // max fraction of income going to loan payments
export const LIQUIDATION_FEE_RATE = 0.05  // 5% platform fee on forced loan sales

export interface ItemLoanProfile {
  category:         string
  businessRiskTier: string | null
  propertyTier:     string | null
  aircraftType:     string | null
  yachtType:        string | null
  benchmarkPrice:   number
}

export function getAssetCategory(item: ItemLoanProfile): string {
  if (item.businessRiskTier === 'safe')     return 'safe_business'
  if (item.businessRiskTier === 'growth')   return 'growth_business'
  if (item.businessRiskTier === 'risky')    return 'risky_business'
  if (item.businessRiskTier === 'prestige') return 'prestige_business'
  if (item.propertyTier)                    return 'property'
  if (item.aircraftType)                    return 'aircraft'
  if (item.yachtType)                       return 'yacht'
  if (item.category === 'cars')             return 'car'
  return 'collectibles'
}

export function isStarterEligible(item: ItemLoanProfile): boolean {
  return item.businessRiskTier === 'safe' && item.benchmarkPrice <= STARTER_PRODUCT.maxBenchmarkPrice
}

/** Monthly payment = principal/term + principal × monthly_rate (flat, non-amortising) */
export function calcMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
  return Math.round(principal / termMonths + principal * monthlyRate)
}

export function calcMaxLoan(benchmarkPrice: number, maxLtv: number): number {
  return Math.floor(benchmarkPrice * maxLtv)
}
