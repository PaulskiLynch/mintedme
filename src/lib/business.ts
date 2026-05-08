export const BUSINESS_RISK_RATES = {
  safe:     { incomeRate: 0.020, upkeepRate: 0.005 },
  growth:   { incomeRate: 0.030, upkeepRate: 0.010 },
  risky:    { incomeRate: 0.050, upkeepRate: 0.025 },
  prestige: { incomeRate: 0.015, upkeepRate: 0.010 },
} as const

export type BusinessRiskTier = keyof typeof BUSINESS_RISK_RATES

export interface BusinessTypeDef {
  code:          string
  title:         string
  riskTier:      BusinessRiskTier
  tag:           string
  description:   string
  tagPl:         string
  descriptionPl: string
}

export const BUSINESS_TYPES: BusinessTypeDef[] = [
  {
    code: 'cafe_chain', title: 'Café Chain', riskTier: 'safe',
    tag:           'Turns caffeine dependency into predictable monthly revenue.',
    description:   'Reliable starter business with everyday demand and low operating pressure.',
    tagPl:         'Zamienia uzależnienie od kofeiny w przewidywalny miesięczny dochód.',
    descriptionPl: 'Stabilny biznes startowy z codziennym popytem i niskim ryzykiem operacyjnym.',
  },
  {
    code: 'boutique_gym', title: 'Boutique Gym Group', riskTier: 'safe',
    tag:           'Sells discipline, mirrors, and cancellation guilt.',
    description:   'Stable subscription-style business with repeat customers.',
    tagPl:         'Sprzedaje dyscyplinę, lustra i poczucie winy po anulowaniu karnetu.',
    descriptionPl: 'Stabilny biznes abonamentowy z powracającymi klientami.',
  },
  {
    code: 'car_wash_network', title: 'Car Wash Network', riskTier: 'safe',
    tag:           'Makes dirty cars and impatient people profitable.',
    description:   'Simple service business with steady volume and low complexity.',
    tagPl:         'Zamienia brudne auta i niecierpliwych kierowców w zysk.',
    descriptionPl: 'Prosty biznes usługowy z regularnym ruchem klientów.',
  },
  {
    code: 'storage_unit_portfolio', title: 'Storage Unit Portfolio', riskTier: 'safe',
    tag:           'Monetizes everything people refuse to throw away.',
    description:   'Defensive cash-flow asset with boring but dependable demand.',
    tagPl:         'Zarabia na rzeczach, których ludzie nie potrafią wyrzucić.',
    descriptionPl: 'Defensywny biznes generujący stabilny przepływ gotówki.',
  },
  {
    code: 'vending_machine_route', title: 'Vending Machine Route', riskTier: 'safe',
    tag:           'Tiny robot shops selling snacks at emotional prices.',
    description:   'Low-touch income business with small but steady returns.',
    tagPl:         'Małe robotyczne sklepy sprzedające przekąski po emocjonalnych cenach.',
    descriptionPl: 'Niewymagający biznes z małym, ale stałym dochodem.',
  },
  {
    code: 'food_truck_fleet', title: 'Food Truck Fleet', riskTier: 'safe',
    tag:           'Restaurants with wheels, chaos, and fewer chairs.',
    description:   'Accessible food business with solid income and manageable costs.',
    tagPl:         'Restauracje na kołach z większym chaosem i mniejszą liczbą krzeseł.',
    descriptionPl: 'Dostępny biznes gastronomiczny z solidnym zyskiem.',
  },
  {
    code: 'luxury_barber_lounge', title: 'Luxury Barber Lounge', riskTier: 'safe',
    tag:           'Where haircuts become networking events.',
    description:   'Premium service business with dependable local demand.',
    tagPl:         'Miejsce, gdzie fryzura staje się wydarzeniem networkingowym.',
    descriptionPl: 'Premium biznes usługowy ze stabilnym popytem lokalnym.',
  },
  {
    code: 'sneaker_resale_store', title: 'Sneaker Resale Store', riskTier: 'growth',
    tag:           'Because apparently shoes are an asset class now.',
    description:   'Higher-upside retail business with stronger income and more upkeep.',
    tagPl:         'Bo najwyraźniej buty też są klasą aktywów.',
    descriptionPl: 'Biznes detaliczny z wyższym potencjałem wzrostu i większym ryzykiem.',
  },
  {
    code: 'boutique_hotel', title: 'Boutique Hotel', riskTier: 'growth',
    tag:           'Small rooms, big margins, "curated" towels.',
    description:   'Strong luxury hospitality asset with better monthly cashflow.',
    tagPl:         'Małe pokoje, wielkie marże i „starannie dobrane" ręczniki.',
    descriptionPl: 'Luksusowy biznes hotelowy z mocnym przepływem gotówki.',
  },
  {
    code: 'rooftop_restaurant', title: 'Rooftop Restaurant', riskTier: 'growth',
    tag:           'Dinner with altitude and suspiciously expensive garnish.',
    description:   'Premium venue business with strong revenue potential.',
    tagPl:         'Kolacja z widokiem i absurdalnie drogą dekoracją talerza.',
    descriptionPl: 'Premium restauracja z wysokim potencjałem przychodów.',
  },
  {
    code: 'nightclub_venue', title: 'Nightclub Venue', riskTier: 'growth',
    tag:           'Converts loud music and bad decisions into cash flow.',
    description:   'High-energy venue with strong monthly earnings and higher management cost.',
    tagPl:         'Zamienia głośną muzykę i złe decyzje w przepływ gotówki.',
    descriptionPl: 'Dochodowy lokal rozrywkowy z większym kosztem utrzymania.',
  },
  {
    code: 'private_security_firm', title: 'Private Security Firm', riskTier: 'growth',
    tag:           'Protects expensive things from less expensive people.',
    description:   'Service business tied to luxury demand and high-value clients.',
    tagPl:         'Chroni drogie rzeczy przed mniej drogimi ludźmi.',
    descriptionPl: 'Biznes usługowy związany z luksusowymi klientami.',
  },
  {
    code: 'digital_media_studio', title: 'Digital Media Studio', riskTier: 'growth',
    tag:           'Manufactures content, drama, and engagement strategy.',
    description:   'Scalable media business with stronger income than safe assets.',
    tagPl:         'Produkuje content, dramy i „strategie zaangażowania".',
    descriptionPl: 'Skalowalny biznes medialny z wyższym dochodem.',
  },
  {
    code: 'event_production_co', title: 'Event Production Company', riskTier: 'growth',
    tag:           'Turns deadlines, lighting, and panic into invoices.',
    description:   'Project-based business with healthy monthly returns.',
    tagPl:         'Zamienia terminy, światła i panikę w faktury.',
    descriptionPl: 'Biznes projektowy z mocnymi miesięcznymi zwrotami.',
  },
  {
    code: 'luxury_rental_agency', title: 'Luxury Rental Agency', riskTier: 'growth',
    tag:           'Lets people briefly pretend they own better lives.',
    description:   'Luxury service business that monetizes access over ownership.',
    tagPl:         'Pozwala ludziom udawać przez chwilę, że żyją lepiej.',
    descriptionPl: 'Biznes luksusowych wynajmów oparty na dostępie zamiast własności.',
  },
  {
    code: 'supercar_rental_club', title: 'Supercar Rental Club', riskTier: 'risky',
    tag:           'Rents horsepower to people with main-character syndrome.',
    description:   'High-risk, high-return business with powerful monthly cashflow.',
    tagPl:         'Wynajmuje konie mechaniczne ludziom z syndromem głównego bohatera.',
    descriptionPl: 'Ryzykowny biznes o wysokim potencjale miesięcznego dochodu.',
  },
  {
    code: 'music_label', title: 'Music Label', riskTier: 'risky',
    tag:           'Signs talent, sells dreams, keeps the masters.',
    description:   'Risky entertainment business with strong income potential.',
    tagPl:         'Podpisuje talenty, sprzedaje marzenia i zatrzymuje prawa.',
    descriptionPl: 'Ryzykowny biznes rozrywkowy z dużym potencjałem zysków.',
  },
  {
    code: 'indie_film_studio', title: 'Indie Film Studio', riskTier: 'risky',
    tag:           'Burns money beautifully and calls it cinema.',
    description:   'Expensive creative business with higher monthly upside.',
    tagPl:         'Spala pieniądze artystycznie i nazywa to kinem.',
    descriptionPl: 'Kreatywny biznes z wysokim potencjałem zwrotu.',
  },
  {
    code: 'fashion_label', title: 'Fashion Label', riskTier: 'risky',
    tag:           'Makes plain fabric expensive through confidence.',
    description:   'Brand-driven business with high operating cost and strong upside.',
    tagPl:         'Sprzedaje zwykły materiał dzięki pewności siebie i marketingowi.',
    descriptionPl: 'Marka modowa z wysokimi kosztami i dużym potencjałem.',
  },
  {
    code: 'tech_startup', title: 'Tech Startup', riskTier: 'risky',
    tag:           'Loses money now, promises to disrupt later.',
    description:   'Speculative business with the strongest growth-style cashflow.',
    tagPl:         'Traci pieniądze teraz, obiecuje rewolucję później.',
    descriptionPl: 'Spekulacyjny biznes z najwyższym potencjałem wzrostu.',
  },
  {
    code: 'esports_team', title: 'Esports Team', riskTier: 'risky',
    tag:           'Teenagers clicking faster than your finance department.',
    description:   'Volatile entertainment asset with high monthly return potential.',
    tagPl:         'Nastolatki klikające szybciej niż twój dział finansowy.',
    descriptionPl: 'Zmienny biznes rozrywkowy z wysokim potencjałem dochodu.',
  },
  {
    code: 'crypto_trading_desk', title: 'Crypto Trading Desk', riskTier: 'risky',
    tag:           'Volatility with office chairs and better branding.',
    description:   'Aggressive finance business for players chasing higher monthly returns.',
    tagPl:         'Zmienność rynku, tylko z lepszym brandingiem i biurkiem.',
    descriptionPl: 'Agresywny biznes finansowy dla graczy szukających wysokich zwrotów.',
  },
  {
    code: 'talent_mgmt_agency', title: 'Talent Management Agency', riskTier: 'risky',
    tag:           'Takes 20% for answering emails dramatically.',
    description:   'High-touch entertainment business with strong net profit potential.',
    tagPl:         'Bierze 20% za dramatyczne odpisywanie na maile.',
    descriptionPl: 'Dochodowy biznes rozrywkowy oparty na relacjach i prowizjach.',
  },
  {
    code: 'art_gallery', title: 'Art Gallery', riskTier: 'prestige',
    tag:           'Quiet rooms where rectangles become wealth storage.',
    description:   'Prestige business with low yield but strong status value.',
    tagPl:         'Ciche pokoje, gdzie prostokąty stają się magazynem bogactwa.',
    descriptionPl: 'Prestiżowy biznes bardziej dla statusu niż gotówki.',
  },
  {
    code: 'luxury_watch_boutique', title: 'Luxury Watch Boutique', riskTier: 'prestige',
    tag:           'Sells tiny clocks to people who check phones.',
    description:   'Prestige retail asset for collectors and status-focused players.',
    tagPl:         'Sprzedaje małe zegarki ludziom sprawdzającym godzinę w telefonie.',
    descriptionPl: 'Prestiżowy butik dla kolekcjonerów i graczy nastawionych na status.',
  },
  {
    code: 'private_members_club', title: 'Private Members Club', riskTier: 'prestige',
    tag:           'A paywall for conversations about wealth.',
    description:   'Rare prestige asset that signals status more than cashflow.',
    tagPl:         'Płatny dostęp do rozmów o bogactwie.',
    descriptionPl: 'Rzadki biznes prestiżowy bardziej dla pozycji niż zysków.',
  },
  {
    code: 'vineyard_estate', title: 'Vineyard Estate', riskTier: 'prestige',
    tag:           'Turns grapes, patience, and weather anxiety into status.',
    description:   'Luxury land/business hybrid with modest income and strong flex.',
    tagPl:         'Zamienia winogrona, cierpliwość i pogodę w status społeczny.',
    descriptionPl: 'Luksusowy biznes ziemski z umiarkowanym dochodem i dużym prestiżem.',
  },
  {
    code: 'yacht_charter_brand', title: 'Yacht Charter Brand', riskTier: 'prestige',
    tag:           'Rents floating expenses to people avoiding land.',
    description:   'Prestige luxury business tied to the yacht economy.',
    tagPl:         'Wynajmuje pływające koszty ludziom uciekającym od lądu.',
    descriptionPl: 'Prestiżowy biznes luksusowy powiązany z rynkiem jachtów.',
  },
  {
    code: 'boutique_auction_house', title: 'Boutique Auction House', riskTier: 'prestige',
    tag:           'Creates urgency around objects nobody needed yesterday.',
    description:   'Prestige marketplace business with elite positioning.',
    tagPl:         'Tworzy pilność wokół rzeczy, których nikt nie potrzebował wczoraj.',
    descriptionPl: 'Prestiżowy biznes aukcyjny z elitarnym charakterem.',
  },
  {
    code: 'global_media_house', title: 'Global Media House', riskTier: 'prestige',
    tag:           'Owns the narrative, monetizes the panic.',
    description:   'Top-tier prestige business for players who want influence and status.',
    tagPl:         'Kontroluje narrację i monetyzuje panikę.',
    descriptionPl: 'Topowy biznes prestiżowy dla graczy szukających wpływów i statusu.',
  },
]

export const BUSINESS_BY_CODE = Object.fromEntries(BUSINESS_TYPES.map(b => [b.code, b]))

export const TIER_LABELS: Record<BusinessRiskTier, string> = {
  safe:     'Safe',
  growth:   'Growth',
  risky:    'Risky',
  prestige: 'Prestige',
}

export function businessGrossIncome(riskTier: string, benchmarkPrice: number): number {
  const rates = BUSINESS_RISK_RATES[riskTier as BusinessRiskTier]
  if (!rates) return 0
  return Math.floor(benchmarkPrice * rates.incomeRate)
}

export function businessUpkeepCost(riskTier: string, benchmarkPrice: number): number {
  const rates = BUSINESS_RISK_RATES[riskTier as BusinessRiskTier]
  if (!rates) return 0
  return Math.floor(benchmarkPrice * rates.upkeepRate)
}

export function businessNetIncome(riskTier: string, benchmarkPrice: number): number {
  return businessGrossIncome(riskTier, benchmarkPrice) - businessUpkeepCost(riskTier, benchmarkPrice)
}

export function businessYieldNet(riskTier: string): number {
  const rates = BUSINESS_RISK_RATES[riskTier as BusinessRiskTier]
  if (!rates) return 0
  return rates.incomeRate - rates.upkeepRate
}

export function businessIncomeDaysRemaining(
  lastIncomeAt: Date | null,
  lastSaleDate: Date | null,
  createdAt: Date,
): number {
  const ref  = lastIncomeAt ?? lastSaleDate ?? createdAt
  const next = new Date(ref.getTime() + 30 * 24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil((next.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}
