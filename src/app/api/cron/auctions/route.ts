import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { settleAuction } from '@/lib/auction'
import { monthlyUpkeep, UPKEEP_CYCLE_DAYS } from '@/lib/upkeep'
import { JOB_BY_CODE, benefitMatchesItem, type ItemForJob } from '@/lib/jobs'
import { businessNetIncome } from '@/lib/business'
import { monthlyPropertyUpkeep, monthlyPropertyAppreciation } from '@/lib/property'
import { monthlyAircraftUpkeep } from '@/lib/aircraft'
import { availableBalance } from '@/lib/balance'
import { calcMonthlyPayment, LIQUIDATION_FEE_RATE } from '@/lib/loans'

const DURATION_MS        = 3 * 24 * 60 * 60 * 1000   // user auction duration
const SYSTEM_DURATION_MS = 24 * 60 * 60 * 1000        // system auction duration (24h)
const ROTATION_WINDOW_MS = 7  * 24 * 60 * 60 * 1000   // skip items auctioned within 7 days

// Target concurrent system auctions per rarity group
const SYSTEM_SLOTS: Array<{ rarities: string[]; count: number }> = [
  { rarities: ['Common', 'Banger', 'Custom'],     count: 3 },
  { rarities: ['Premium'],                         count: 2 },
  { rarities: ['Rare'],                            count: 2 },
  { rarities: ['Exotic', 'Legendary', 'Mythic'],   count: 1 },
]
const CYCLE_MS    = UPKEEP_CYCLE_DAYS * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const log: string[] = []
  const cutoff = new Date(Date.now() - CYCLE_MS)

  // 1. Settle any expired active auctions
  const expired = await prisma.auction.findMany({
    where: { status: 'active', endsAt: { lt: new Date() } },
    select: { id: true },
  })
  for (const a of expired) {
    try {
      const r = await settleAuction(a.id)
      log.push(`settled ${a.id}: ${r.result}`)
    } catch (e) {
      log.push(`settle error ${a.id}: ${e}`)
    }
  }

  // 2. Charge monthly upkeep for overdue owned non-business editions
  const dueEditions = await prisma.itemEdition.findMany({
    where: {
      currentOwnerId: { not: null },
      isFrozen: false,
      item: { businessRiskTier: null },        // businesses handle their own cost via net income
      OR: [
        { lastUpkeepAt: null, lastSaleDate: { lte: cutoff } },
        { lastUpkeepAt: { lte: cutoff } },
      ],
    },
    include: {
      item:         { select: { benchmarkPrice: true, rarityTier: true, name: true, aircraftType: true, yachtType: true } },
      currentOwner: { select: { id: true, balance: true, lockedBalance: true } },
    },
    take: 200,
  })

  // Preload job holdings for all edition owners (for upkeep_reduction benefit)
  const dueOwnerIds = [...new Set(dueEditions.map(e => e.currentOwnerId).filter(Boolean) as string[])]
  const dueOwnerJobRows = await prisma.jobHolding.findMany({
    where: { userId: { in: dueOwnerIds } },
    select: { userId: true, jobCode: true },
  })
  const dueOwnerJobMap = new Map(dueOwnerJobRows.map(j => [j.userId, JOB_BY_CODE[j.jobCode]]))

  let upkeepCharged = 0
  let upkeepDebted  = 0
  for (const edition of dueEditions) {
    if (!edition.currentOwner) continue
    let cost = edition.item.aircraftType
      ? monthlyAircraftUpkeep(edition.item.aircraftType, Number(edition.item.benchmarkPrice))
      : monthlyUpkeep(edition.item.rarityTier, Number(edition.item.benchmarkPrice))

    const ownerJobDef = dueOwnerJobMap.get(edition.currentOwnerId!)
    if (ownerJobDef?.benefitType === 'upkeep_reduction') {
      const itemForJob: ItemForJob = {
        category: '',
        aircraftType: edition.item.aircraftType ?? null,
        yachtType:    edition.item.yachtType    ?? null,
        propertyTier: null,
        businessRiskTier: null,
      }
      if (benefitMatchesItem(ownerJobDef.benefitTarget, itemForJob)) {
        cost = Math.round(cost * (1 - ownerJobDef.benefitValue))
      }
    }
    const canPay = availableBalance(edition.currentOwner) >= cost
    try {
      await prisma.$transaction(async (tx) => {
        await tx.itemEdition.update({ where: { id: edition.id }, data: { lastUpkeepAt: new Date() } })
        if (canPay) {
          await tx.user.update({ where: { id: edition.currentOwnerId! }, data: { balance: { decrement: cost } } })
          await tx.transaction.create({
            data: { fromUserId: edition.currentOwnerId, amount: cost, type: 'upkeep', description: `Monthly upkeep: ${edition.item.name}` },
          })
        } else {
          await tx.user.update({ where: { id: edition.currentOwnerId! }, data: { debtAmount: { increment: cost } } })
          await tx.transaction.create({
            data: { fromUserId: edition.currentOwnerId, amount: cost, type: 'upkeep_debt', description: `Upkeep debt: ${edition.item.name}` },
          })
          await tx.notification.create({
            data: {
              userId:    edition.currentOwnerId!,
              type:      'upkeep_missed',
              message:   `Couldn't charge $${cost.toLocaleString()} upkeep for ${edition.item.name} — your items may be liquidated to cover the debt.`,
              actionUrl: '/wallet',
            },
          })
        }
      })
      if (canPay) upkeepCharged++; else upkeepDebted++
    } catch (e) {
      log.push(`upkeep error ${edition.id}: ${e}`)
    }
  }
  log.push(`upkeep: charged ${upkeepCharged}, debted ${upkeepDebted}`)

  // 2b. Liquidate items for users with outstanding upkeep debt
  const debtUsers = await prisma.user.findMany({
    where: { debtAmount: { gt: 0 }, isFrozen: false },
    select: {
      id:          true,
      username:    true,
      debtAmount:  true,
      ownedEditions: {
        where:   { isFrozen: false, isInAuction: false },
        include: { item: { select: { name: true, benchmarkPrice: true, rarityTier: true } } },
        orderBy: { item: { benchmarkPrice: 'asc' } },
      },
    },
  })

  let liquidated = 0
  for (const user of debtUsers) {
    const existingLiq = await prisma.auction.findMany({
      where:  { liquidationUserId: user.id, status: 'active' },
      select: { minimumBid: true },
    })
    const alreadyCovering = existingLiq.reduce((s, a) => s + Number(a.minimumBid), 0)
    let stillNeeded = Number(user.debtAmount) - alreadyCovering
    if (stillNeeded <= 0) continue

    for (const edition of user.ownedEditions) {
      if (stillNeeded <= 0) break
      const startingBid = Math.round(Number(edition.item.benchmarkPrice) * 0.10)
      const endsAt      = new Date(Date.now() + DURATION_MS)
      try {
        const auction = await prisma.$transaction(async (tx) => {
          const a = await tx.auction.create({
            data: {
              editionId:         edition.id,
              sellerId:          null,
              minimumBid:        startingBid,
              benchmarkPrice:    Number(edition.item.benchmarkPrice),
              rarityTier:        edition.item.rarityTier,
              status:            'active',
              startsAt:          new Date(),
              endsAt,
              isSystemAuction:   false,
              liquidationUserId: user.id,
            },
          })
          await tx.itemEdition.update({ where: { id: edition.id }, data: { isInAuction: true } })
          await tx.notification.create({
            data: {
              userId:    user.id,
              type:      'liquidation_started',
              message:   `Your ${edition.item.name} has been placed in auction to recover $${Number(user.debtAmount).toLocaleString()} in unpaid upkeep.`,
              actionUrl: `/auction/${a.id}`,
            },
          })
          return a
        })
        log.push(`liquidation: ${edition.item.name} → auction ${auction.id} (user ${user.username})`)
        stillNeeded -= startingBid
        liquidated++
      } catch (e) {
        log.push(`liquidation error ${edition.id}: ${e}`)
      }
    }
  }
  log.push(`liquidation: started ${liquidated} auction${liquidated !== 1 ? 's' : ''}`)

  // 3. Tier-balanced system auctions — 8 slots across Common/Premium/Rare/Exotic+
  const created: string[] = []

  // Editions currently in any auction
  const inAuctionIds = await prisma.itemEdition.findMany({
    where: { isInAuction: true }, select: { id: true },
  }).then(r => r.map(e => e.id))

  // Editions auctioned (settled) within the last 7 days — skip to rotate stock
  const recentlySoldIds = await prisma.auction.findMany({
    where: { status: 'settled', endsAt: { gte: new Date(Date.now() - ROTATION_WINDOW_MS) } },
    select: { editionId: true },
  }).then(r => r.map(a => a.editionId))

  const excludeIds = [...new Set([...inAuctionIds, ...recentlySoldIds])]

  // Diagnostic: total unowned editions available
  const totalUnowned = await prisma.itemEdition.count({
    where: { currentOwnerId: null, isFrozen: false, item: { isApproved: true, isFrozen: false, itemStatus: 'active' } },
  })
  log.push(`system auctions: ${totalUnowned} eligible unowned editions total, ${inAuctionIds.length} already in auction, ${recentlySoldIds.length} recently sold (excluded)`)

  // Count live system auctions already running per rarity group
  const liveSystemAuctions = await prisma.auction.findMany({
    where: { status: 'active', isSystemAuction: true },
    select: { rarityTier: true },
  })

  for (const slot of SYSTEM_SLOTS) {
    const liveInSlot = liveSystemAuctions.filter(a => slot.rarities.includes(a.rarityTier)).length
    const needed     = Math.max(0, slot.count - liveInSlot)
    if (needed === 0) {
      log.push(`slot [${slot.rarities.join('/')}]: full (${liveInSlot}/${slot.count})`)
      continue
    }

    const candidates = await prisma.itemEdition.findMany({
      where: {
        currentOwnerId: null,
        isFrozen:       false,
        id:             excludeIds.length ? { notIn: excludeIds } : undefined,
        item: {
          isApproved:  true,
          isFrozen:    false,
          itemStatus:  'active',
          rarityTier:  { in: slot.rarities },
        },
      },
      include: { item: { select: { benchmarkPrice: true, rarityTier: true, name: true } } },
      orderBy: { item: { benchmarkPrice: 'asc' } },  // cheapest first within each tier
      take: needed * 3,  // over-fetch so we can vary selection
    })

    log.push(`slot [${slot.rarities.join('/')}]: need ${needed}, found ${candidates.length} candidates`)

    // Shuffle candidates slightly by skipping a variable offset so the same item
    // doesn't always win when supply is low
    const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, needed)

    for (const edition of shuffled) {
      const startingBid = Math.round(Number(edition.item.benchmarkPrice) * 0.10)
      const endsAt      = new Date(Date.now() + SYSTEM_DURATION_MS)
      try {
        const auction = await prisma.$transaction(async (tx) => {
          const a = await tx.auction.create({
            data: {
              editionId:      edition.id,
              sellerId:       null,
              minimumBid:     startingBid,
              benchmarkPrice: Number(edition.item.benchmarkPrice),
              rarityTier:     edition.item.rarityTier,
              status:         'active',
              startsAt:       new Date(),
              endsAt,
              isSystemAuction: true,
            },
          })
          await tx.itemEdition.update({ where: { id: edition.id }, data: { isInAuction: true } })
          return a
        })
        created.push(auction.id)
        excludeIds.push(edition.id)  // prevent double-scheduling in same cron run
        log.push(`system auction: ${edition.item.name} (${edition.item.rarityTier}) starting at $${startingBid.toLocaleString()}`)
      } catch (e) {
        log.push(`system auction error: ${e}`)
      }
    }
  }

  // 4. Settle expired job auctions — award jobs to lowest bidders
  const expiredJobAuctions = await prisma.jobAuction.findMany({
    where:   { status: 'active', endsAt: { lt: new Date() } },
    include: { bids: { orderBy: { salaryBid: 'asc' } } },
  })

  let jobsAwarded = 0
  for (const ja of expiredJobAuctions) {
    const jobDef = JOB_BY_CODE[ja.jobCode]
    if (!jobDef || ja.bids.length === 0) {
      await prisma.jobAuction.update({ where: { id: ja.id }, data: { status: 'settled' } })
      continue
    }

    const [activeUsers, heldCount] = await Promise.all([
      prisma.user.count(),
      prisma.jobHolding.count({ where: { jobCode: ja.jobCode } }),
    ])

    let awarded = false
    for (const bid of ja.bids) {
      if (heldCount >= 1) break
      const [user, existingJob] = await Promise.all([
        prisma.user.findUnique({ where: { id: bid.userId }, select: { isFrozen: true } }),
        prisma.jobHolding.findUnique({ where: { userId: bid.userId } }),
      ])
      if (user?.isFrozen || existingJob) continue
      try {
        await prisma.$transaction(async (tx) => {
          await tx.jobHolding.create({
            data: { userId: bid.userId, jobCode: ja.jobCode, monthlySalary: bid.salaryBid },
          })
          await tx.jobAuction.update({
            where: { id: ja.id },
            data:  { status: 'settled', winnerId: bid.userId, winnerSalary: bid.salaryBid },
          })
          await tx.notification.create({
            data: {
              userId:    bid.userId,
              type:      'job_won',
              message:   `You got the job — ${jobDef.title} at $${bid.salaryBid.toLocaleString()}/mo`,
              actionUrl: '/jobs',
            },
          })
        })
        awarded = true
        jobsAwarded++
      } catch (e) { log.push(`job award error ${ja.id}: ${e}`) }
      break
    }
    if (!awarded) {
      await prisma.jobAuction.update({ where: { id: ja.id }, data: { status: 'settled' } })
    }
  }
  log.push(`job auctions: awarded ${jobsAwarded}`)

  // 5. Pay monthly job salaries
  const dueJobs = await prisma.jobHolding.findMany({
    where: { OR: [{ lastPaidAt: null }, { lastPaidAt: { lte: cutoff } }] },
    include: { user: { select: { id: true, isFrozen: true } } },
    take: 500,
  })

  let salaryPaid = 0
  let salarySkipped = 0
  for (const holding of dueJobs) {
    if (holding.user.isFrozen) { salarySkipped++; continue }
    const jobDef = JOB_BY_CODE[holding.jobCode]
    if (!jobDef) { salarySkipped++; continue }
    try {
      const net = Math.round(holding.monthlySalary * (1 - jobDef.taxRate))
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: holding.userId }, data: { balance: { increment: net } } })
        await tx.jobHolding.update({ where: { id: holding.id }, data: { lastPaidAt: new Date() } })
        await tx.transaction.create({
          data: { toUserId: holding.userId, amount: net, type: 'salary', description: `Monthly salary: ${jobDef.title}` },
        })
      })
      salaryPaid++
    } catch (e) {
      log.push(`salary error ${holding.id}: ${e}`)
    }
  }
  log.push(`salary: paid ${salaryPaid}, skipped ${salarySkipped}`)

  // 5. Pay monthly business net income
  const dueBusinessEditions = await prisma.itemEdition.findMany({
    where: {
      currentOwnerId: { not: null },
      isFrozen: false,
      item: { businessRiskTier: { not: null } },
      OR: [
        { lastIncomeAt: null, lastSaleDate: { lte: cutoff } },
        { lastIncomeAt: { lte: cutoff } },
      ],
    },
    include: {
      item:         { select: { benchmarkPrice: true, businessRiskTier: true, name: true } },
      currentOwner: { select: { id: true } },
    },
    take: 200,
  })

  // Preload job holdings for business owners (for income_bonus benefit)
  const bizOwnerIds = [...new Set(dueBusinessEditions.map(e => e.currentOwnerId).filter(Boolean) as string[])]
  const bizOwnerJobRows = await prisma.jobHolding.findMany({
    where: { userId: { in: bizOwnerIds } },
    select: { userId: true, jobCode: true },
  })
  const bizOwnerJobMap = new Map(bizOwnerJobRows.map(j => [j.userId, JOB_BY_CODE[j.jobCode]]))

  let incomesPaid = 0
  for (const edition of dueBusinessEditions) {
    if (!edition.currentOwner || !edition.item.businessRiskTier) continue
    let net = businessNetIncome(edition.item.businessRiskTier, Number(edition.item.benchmarkPrice))
    if (net <= 0) continue

    const bizOwnerJobDef = bizOwnerJobMap.get(edition.currentOwnerId!)
    if (bizOwnerJobDef?.benefitType === 'income_bonus') {
      const itemForJob: ItemForJob = { category: '', businessRiskTier: edition.item.businessRiskTier }
      if (benefitMatchesItem(bizOwnerJobDef.benefitTarget, itemForJob)) {
        net = Math.round(net * (1 + bizOwnerJobDef.benefitValue))
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: edition.currentOwnerId! }, data: { balance: { increment: net } } })
        await tx.itemEdition.update({ where: { id: edition.id }, data: { lastIncomeAt: new Date() } })
        await tx.transaction.create({
          data: { toUserId: edition.currentOwnerId, editionId: edition.id, amount: net, type: 'business_income', description: `Business income: ${edition.item.name}` },
        })
      })
      incomesPaid++
    } catch (e) {
      log.push(`income error ${edition.id}: ${e}`)
    }
  }
  log.push(`business income: paid ${incomesPaid}`)

  // 6. Charge monthly upkeep for owned properties (non-rent-free)
  const duePropertyEditions = await prisma.itemEdition.findMany({
    where: {
      currentOwnerId: { not: null },
      isFrozen: false,
      item: { propertyTier: { not: null } },
      OR: [
        { lastUpkeepAt: null, lastSaleDate: { lte: cutoff } },
        { lastUpkeepAt: { lte: cutoff } },
      ],
    },
    include: {
      item:         { select: { benchmarkPrice: true, propertyTier: true, name: true } },
      currentOwner: { select: { id: true, balance: true, lockedBalance: true } },
    },
    take: 500,
  })

  // Preload job holdings for property owners (for upkeep_reduction benefit)
  const propOwnerIds = [...new Set(duePropertyEditions.map(e => e.currentOwnerId).filter(Boolean) as string[])]
  const propOwnerJobRows = await prisma.jobHolding.findMany({
    where: { userId: { in: propOwnerIds } },
    select: { userId: true, jobCode: true },
  })
  const propOwnerJobMap = new Map(propOwnerJobRows.map(j => [j.userId, JOB_BY_CODE[j.jobCode]]))

  let propertyUpkeepCharged = 0
  let propertyUpkeepDebted  = 0
  for (const edition of duePropertyEditions) {
    if (!edition.currentOwner || !edition.item.propertyTier) continue
    let cost = monthlyPropertyUpkeep(edition.item.propertyTier, Number(edition.item.benchmarkPrice))

    const propOwnerJobDef = propOwnerJobMap.get(edition.currentOwnerId!)
    if (cost > 0 && propOwnerJobDef?.benefitType === 'upkeep_reduction') {
      const itemForJob: ItemForJob = { category: '', propertyTier: edition.item.propertyTier }
      if (benefitMatchesItem(propOwnerJobDef.benefitTarget, itemForJob)) {
        cost = Math.round(cost * (1 - propOwnerJobDef.benefitValue))
      }
    }
    if (cost === 0) {
      // rent_free — just reset the clock
      await prisma.itemEdition.update({ where: { id: edition.id }, data: { lastUpkeepAt: new Date() } })
      continue
    }
    const canPay = availableBalance(edition.currentOwner) >= cost
    try {
      await prisma.$transaction(async (tx) => {
        await tx.itemEdition.update({ where: { id: edition.id }, data: { lastUpkeepAt: new Date() } })
        if (canPay) {
          await tx.user.update({ where: { id: edition.currentOwnerId! }, data: { balance: { decrement: cost } } })
          await tx.transaction.create({
            data: { fromUserId: edition.currentOwnerId, amount: cost, type: 'upkeep', description: `Property upkeep: ${edition.item.name}` },
          })
        } else {
          await tx.user.update({ where: { id: edition.currentOwnerId! }, data: { debtAmount: { increment: cost } } })
          await tx.transaction.create({
            data: { fromUserId: edition.currentOwnerId, amount: cost, type: 'upkeep_debt', description: `Property upkeep debt: ${edition.item.name}` },
          })
          await tx.notification.create({
            data: {
              userId:    edition.currentOwnerId!,
              type:      'upkeep_missed',
              message:   `Couldn't charge $${cost.toLocaleString()} property upkeep for ${edition.item.name} — debt recorded.`,
              actionUrl: '/wallet',
            },
          })
        }
      })
      if (canPay) propertyUpkeepCharged++; else propertyUpkeepDebted++
    } catch (e) {
      log.push(`property upkeep error ${edition.id}: ${e}`)
    }
  }
  log.push(`property upkeep: charged ${propertyUpkeepCharged}, debted ${propertyUpkeepDebted}`)

  // 7. Monthly appreciation — increases benchmarkPrice of owned property items
  const appreciationCutoff = new Date(Date.now() - CYCLE_MS)
  const duePropertyItems = await prisma.item.findMany({
    where: {
      propertyTier: { not: null },
      OR: [
        { lastAppreciatedAt: null },
        { lastAppreciatedAt: { lte: appreciationCutoff } },
      ],
      editions: { some: { currentOwnerId: { not: null } } },
    },
    select: { id: true, name: true, benchmarkPrice: true, propertyTier: true },
  })

  let appreciated = 0
  for (const item of duePropertyItems) {
    if (!item.propertyTier) continue
    const gain = monthlyPropertyAppreciation(item.propertyTier, Number(item.benchmarkPrice))
    if (gain <= 0) {
      await prisma.item.update({ where: { id: item.id }, data: { lastAppreciatedAt: new Date() } })
      continue
    }
    try {
      await prisma.item.update({
        where: { id: item.id },
        data: { benchmarkPrice: { increment: gain }, lastAppreciatedAt: new Date() },
      })
      log.push(`appreciation: ${item.name} +$${gain.toLocaleString()}`)
      appreciated++
    } catch (e) {
      log.push(`appreciation error ${item.id}: ${e}`)
    }
  }
  log.push(`property appreciation: ${appreciated} item${appreciated !== 1 ? 's' : ''} updated`)

  // 8. Process monthly loan payments
  const dueLoans = await prisma.loan.findMany({
    where: {
      status: 'active',
      nextPaymentAt: { lte: new Date() },
    },
    include: {
      user:    { select: { id: true, balance: true, lockedBalance: true, isFrozen: true, debtAmount: true } },
      edition: { select: { id: true, item: { select: { name: true, benchmarkPrice: true, rarityTier: true } } } },
    },
    take: 200,
  })

  let loansPaid = 0; let loansDefaulted = 0; let loansLiquidated = 0
  for (const loan of dueLoans) {
    if (loan.user.isFrozen) continue
    const nextPaymentAt = new Date(loan.nextPaymentAt.getTime() + CYCLE_MS)

    const canPay = availableBalance(loan.user) >= loan.monthlyPayment
    if (canPay) {
      // Successful payment
      const principalChunk = Math.round(loan.principal / loan.termMonths)
      const newOutstanding  = Math.max(0, loan.outstanding - principalChunk)
      const isLastPayment   = loan.paidMonths + 1 >= loan.termMonths

      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: loan.userId }, data: { balance: { decrement: loan.monthlyPayment } } })
          await tx.transaction.create({
            data: { fromUserId: loan.userId, editionId: loan.editionId, amount: loan.monthlyPayment, type: 'loan_payment',
              description: `Loan payment (${loan.paidMonths + 1}/${loan.termMonths}): ${loan.edition.item.name}` },
          })
          if (isLastPayment) {
            await tx.loan.update({ where: { id: loan.id }, data: { status: 'paid_off', outstanding: 0, paidMonths: { increment: 1 }, lastPaymentAt: new Date() } })
            await tx.itemEdition.update({ where: { id: loan.editionId }, data: { hasActiveLoan: false, isAtRisk: false } })
            await tx.notification.create({ data: { userId: loan.userId, type: 'loan_paid_off', message: `Loan fully repaid for ${loan.edition.item.name}. The asset is now free and clear.`, actionUrl: '/bank' } })
          } else {
            await tx.loan.update({ where: { id: loan.id }, data: { outstanding: newOutstanding, paidMonths: { increment: 1 }, missedPayments: 0, lastPaymentAt: new Date(), nextPaymentAt } })
          }
        })
        loansPaid++
      } catch (e) { log.push(`loan payment error ${loan.id}: ${e}`) }

    } else {
      // Missed payment
      const newMissed = loan.missedPayments + 1
      try {
        if (newMissed >= 3) {
          // Liquidation
          const startingBid = Math.round(Number(loan.edition.item.benchmarkPrice) * 0.10)
          await prisma.$transaction(async (tx) => {
            await tx.loan.update({ where: { id: loan.id }, data: { missedPayments: newMissed, status: 'liquidating', nextPaymentAt } })
            const auction = await tx.auction.create({
              data: {
                editionId:         loan.editionId,
                sellerId:          null,
                minimumBid:        startingBid,
                benchmarkPrice:    Number(loan.edition.item.benchmarkPrice),
                rarityTier:        loan.edition.item.rarityTier,
                status:            'active',
                startsAt:          new Date(),
                endsAt:            new Date(Date.now() + DURATION_MS),
                isSystemAuction:   false,
                liquidationLoanId: loan.id,
              },
            })
            await tx.itemEdition.update({ where: { id: loan.editionId }, data: { isInAuction: true } })
            await tx.notification.create({ data: { userId: loan.userId, type: 'loan_liquidation', message: `Your ${loan.edition.item.name} has been listed for forced sale after 3 missed loan payments.`, actionUrl: `/auction/${auction.id}` } })
          })
          loansLiquidated++
        } else if (newMissed === 2) {
          await prisma.$transaction(async (tx) => {
            await tx.loan.update({ where: { id: loan.id }, data: { missedPayments: newMissed, nextPaymentAt } })
            await tx.itemEdition.update({ where: { id: loan.editionId }, data: { isAtRisk: true } })
            await tx.notification.create({ data: { userId: loan.userId, type: 'loan_at_risk', message: `Warning: 2 missed payments on your ${loan.edition.item.name} loan. One more miss triggers forced sale.`, actionUrl: '/bank' } })
          })
          loansDefaulted++
        } else {
          await prisma.$transaction(async (tx) => {
            await tx.loan.update({ where: { id: loan.id }, data: { missedPayments: newMissed, nextPaymentAt } })
            await tx.notification.create({ data: { userId: loan.userId, type: 'loan_missed', message: `Missed loan payment for ${loan.edition.item.name}. $${loan.monthlyPayment.toLocaleString()} due. Two more misses triggers forced sale.`, actionUrl: '/bank' } })
          })
          loansDefaulted++
        }
      } catch (e) { log.push(`loan miss error ${loan.id}: ${e}`) }
    }
  }
  log.push(`loans: paid ${loansPaid}, missed/at-risk ${loansDefaulted}, liquidated ${loansLiquidated}`)

  return NextResponse.json({ ok: true, log, created: created.length, upkeepCharged, upkeepDebted, liquidated, propertyUpkeepCharged, propertyUpkeepDebted, appreciated, salaryPaid, incomesPaid, loansPaid, loansDefaulted, loansLiquidated, auctionIds: created })
}
