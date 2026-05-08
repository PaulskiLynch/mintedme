import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { availableBalance } from '@/lib/balance'
import {
  STANDARD_PRODUCTS, STARTER_PRODUCT,
  getAssetCategory, isStarterEligible, calcMonthlyPayment, calcMaxLoan,
  PAYMENT_INCOME_CAP, type ItemLoanProfile,
} from '@/lib/loans'
import { JOB_BY_CODE } from '@/lib/jobs'
import { businessNetIncome } from '@/lib/business'
import { UPKEEP_CYCLE_DAYS } from '@/lib/upkeep'

const CYCLE_MS = UPKEEP_CYCLE_DAYS * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const loans = await prisma.loan.findMany({
    where:   { userId: session.user.id, status: { in: ['active', 'liquidating'] } },
    include: {
      edition: {
        select: {
          id: true, isAtRisk: true,
          item: { select: { name: true, imageUrl: true } },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  })
  return NextResponse.json({ loans })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json()
  const { editionId, loanType, amount } = body as { editionId: string; loanType: 'starter' | 'standard'; amount: number }

  if (!editionId || !loanType || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const edition = await tx.itemEdition.findUnique({
        where: { id: editionId },
        include: { item: { select: { benchmarkPrice: true, businessRiskTier: true, propertyTier: true, aircraftType: true, yachtType: true, category: true } } },
      })
      if (!edition)                          throw new Error('Edition not found')
      if (edition.currentOwnerId !== userId) throw new Error('You do not own this item')
      if (edition.isFrozen)                  throw new Error('Item is frozen')
      if (edition.isInAuction)               throw new Error('Item is in an active auction')
      if (edition.hasActiveLoan)             throw new Error('This item already has an active loan')

      const itemProfile: ItemLoanProfile = {
        category:         edition.item.category,
        businessRiskTier: edition.item.businessRiskTier,
        propertyTier:     edition.item.propertyTier,
        aircraftType:     edition.item.aircraftType,
        yachtType:        edition.item.yachtType,
        benchmarkPrice:   Number(edition.item.benchmarkPrice),
      }
      const assetCategory = getAssetCategory(itemProfile)

      let product: typeof STARTER_PRODUCT | (typeof STANDARD_PRODUCTS)[string]
      if (loanType === 'starter') {
        if (!isStarterEligible(itemProfile)) throw new Error('Item is not eligible for a starter loan')
        const existingStarter = await tx.loan.findFirst({
          where: { userId, loanType: 'starter', status: { in: ['active', 'liquidating'] } },
        })
        if (existingStarter) throw new Error('You already have an active starter loan')
        product = STARTER_PRODUCT
      } else {
        const std = STANDARD_PRODUCTS[assetCategory]
        if (!std) throw new Error('No loan product available for this asset type')
        product = std
      }

      const maxLoan = calcMaxLoan(Number(edition.item.benchmarkPrice), product.maxLtv)
      if (amount > maxLoan) throw new Error(`Maximum loan for this asset is $${maxLoan.toLocaleString()}`)
      if (amount < 1000)   throw new Error('Minimum loan amount is $1,000')

      // Income affordability check
      const [jobHolding, bizEditions, existingLoans] = await Promise.all([
        tx.jobHolding.findUnique({ where: { userId }, select: { jobCode: true, monthlySalary: true } }),
        tx.itemEdition.findMany({
          where:  { currentOwnerId: userId, isFrozen: false, item: { businessRiskTier: { not: null } } },
          select: { item: { select: { businessRiskTier: true, benchmarkPrice: true } } },
        }),
        tx.loan.findMany({ where: { userId, status: 'active' }, select: { monthlyPayment: true } }),
      ])

      const netSalary = jobHolding
        ? Math.round(jobHolding.monthlySalary * (1 - (JOB_BY_CODE[jobHolding.jobCode]?.taxRate ?? 0)))
        : 0
      const bizIncome = bizEditions.reduce((s: number, e: { item: { businessRiskTier: string | null; benchmarkPrice: { toString(): string } | number } }) => {
        if (!e.item.businessRiskTier) return s
        return s + businessNetIncome(e.item.businessRiskTier, Number(e.item.benchmarkPrice))
      }, 0)
      const monthlyIncome   = netSalary + bizIncome
      const existingPayment = existingLoans.reduce((s: number, l: { monthlyPayment: number }) => s + l.monthlyPayment, 0)
      const newPayment      = calcMonthlyPayment(amount, product.monthlyRate, product.termMonths)

      if (monthlyIncome > 0 && existingPayment + newPayment > monthlyIncome * PAYMENT_INCOME_CAP) {
        throw new Error(
          `Monthly loan payments ($${(existingPayment + newPayment).toLocaleString()}) would exceed 60% of your monthly income ($${Math.round(monthlyIncome * PAYMENT_INCOME_CAP).toLocaleString()} limit)`
        )
      }

      const nextPaymentAt = new Date(Date.now() + CYCLE_MS)
      const loan = await tx.loan.create({
        data: {
          userId,
          editionId,
          loanType,
          assetCategory,
          principal:      amount,
          outstanding:    amount,
          monthlyPayment: newPayment,
          monthlyRate:    product.monthlyRate,
          termMonths:     product.termMonths,
          nextPaymentAt,
        },
      })

      await tx.itemEdition.update({ where: { id: editionId }, data: { hasActiveLoan: true } })
      await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } })
      await tx.transaction.create({
        data: { toUserId: userId, editionId, amount, type: 'loan_drawdown', description: `Bank loan: ${edition.item.category}` },
      })

      return { loanId: loan.id, amount, monthlyPayment: newPayment, termMonths: product.termMonths }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Loan failed' }, { status: 400 })
  }
}
