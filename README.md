# MilliBux

A social fantasy economy game. Players start with $1M, buy and sell digital luxury assets — cars, watches, art, yachts, businesses — and compete on a live leaderboard. Assets appreciate, generate income, and drive a social feed of transactions, offers, and achievements.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma 7 with PrismaNeon WebSocket adapter |
| Auth | NextAuth v5 (credentials provider) |
| Styling | Plain CSS (globals.css, CSS variables) |
| Deploy | Vercel |

---

## Features

### Economy
- **Buy / Sell** — purchase editions at reference price or listed price; owners can list at any price
- **Offers** — make an offer on any owned asset; owner can accept, decline, or counter
- **Auctions** — live real-time auctions with SSE event stream, auto-bid (max bid), and live chat
- **Passive Income** — income-bearing assets (businesses, art) earn daily via base yield + page view multiplier; cron runs at 06:00 UTC
- **Ownership Cost** — optional weekly cost for high-maintenance assets (yachts, jets)

### Assets
- **Items** — name, category, class, reference price, total supply
- **Editions** — numbered copies of each item (e.g. Edition #1 of 5); each has its own owner, price history, and offer list
- **Classes** — essential / premium / elite / grail / unique; class gates supply and affects income multiplier
- **Supply curve** — max editions unlocked scales with player count (`lib/supply.ts`), so rare items stay rare early

### Social
- **Feed** — activity stream of purchases, offers, auctions, achievements, income events, market alerts
- **Reactions** — 4 types: flex / smart / risky / watch (one per user per post, switchable)
- **Comments** — threaded comments on feed events
- **Follow** — follow other players; their activity prioritised in feed
- **Notifications** — per-user unread notifications with action URLs
- **Inbox** — received and sent offers with accept/decline/counter UI

### Profiles
- **Mint** — public profile showing owned assets, net worth, tagline
- **Leaderboard** — ranked by net worth (balance + mint value); live rank on feed sidebar

### Admin
- **Item approval** — items go through an approval queue before appearing in the marketplace
- **User management** — freeze/unfreeze players, adjust balances
- **Creator submissions** — players can submit items for review

### Studio
- Players can submit new item proposals (name, category, class, image, price, supply)

---

## Data Model

```
User
  ├── ownedEditions → ItemEdition[]
  ├── offersAsBuyer → Offer[]
  ├── bids, maxBids → Auction
  ├── feedLikes, feedComments
  ├── followers / following
  └── notifications

Item
  ├── editions → ItemEdition[]
  ├── hasIncome / incomePerView      ← passive income config
  └── hasOwnershipCost / ownershipCostPct

ItemEdition
  ├── currentOwner → User
  ├── offers → Offer[]
  ├── auctions → Auction[]
  ├── priceHistory → PriceHistory[]
  ├── views → ItemView[]             ← view tracking for income
  └── lastIncomeAt                   ← income payout cursor

FeedEvent  (buy | sell | offer | accept | auction_start | auction_end | achievement | income | market_event | post)
  ├── likes → FeedLike[]  (type: flex | smart | risky | watch | like)
  └── comments → FeedComment[]
```

---

## Income Engine

File: `src/app/api/cron/income/route.ts`

Runs daily (Vercel Cron, `vercel.json`). For each owned edition of an income-bearing item:

```
income = floor( referencePrice × 0.0005 ) + ( views_since_last_payout × incomePerView )
```

- Credits owner balance
- Creates a `Transaction` record (type: `income`)
- Posts a `FeedEvent` if income ≥ $500
- Deletes processed view rows to keep `item_views` lean
- Protected by `CRON_SECRET` env var

To test locally: `GET /api/cron/income` (no secret required in dev if `CRON_SECRET` is unset).

---

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, NEXTAUTH_SECRET
npx prisma db push
npx prisma generate
npm run seed                  # creates 3 seed players with items + feed history
npm run dev
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth session signing secret |
| `NEXTAUTH_URL` | Base URL (e.g. `http://localhost:3000`) |
| `CRON_SECRET` | Bearer token to protect `/api/cron/income` in production |

---

## Seed Data

`scripts/seed.ts` — run with `npm run seed`

Creates three fictional players and a set of items:

| Player | Balance | Assets |
|---|---|---|
| @velocityvince | $940k | Silver Arrow Roadster, Vintage Porsche 959 |
| @luxelinda | $903k | Patek Philippe Royal, Midnight Canvas |
| @cryptokai | $700k | Midnight Café Chain *(income-bearing)*, Pacific Blue Yacht |

Also seeds feed events, comments, and reactions so the feed looks populated on first run.

---

## Key Files

```
prisma/schema.prisma          — full data model
src/app/globals.css           — all styling (CSS variables + component classes)
src/components/Sidebar.tsx    — nav (desktop sidebar + mobile top/bottom bar)
src/app/(app)/feed/           — feed page + FeedClient
src/app/(app)/marketplace/    — browse and filter items
src/app/(app)/auction/        — live auction room (SSE)
src/app/(app)/mint/[username] — player profile
src/app/(app)/leaderboard/    — net worth rankings
src/app/(app)/inbox/          — offer management
src/app/(app)/notifications/  — notification centre
src/app/api/cron/income/      — passive income cron
src/lib/supply.ts             — edition supply curve logic
```
