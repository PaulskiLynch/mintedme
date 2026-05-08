import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAssetCategory, isStarterEligible, calcMonthlyPayment, calcMaxLoan, STANDARD_PRODUCTS, STARTER_PRODUCT, PAYMENT_INCOME_CAP, type ItemLoanProfile } from '@/lib/loans'
import { JOB_BY_CODE } from '@/lib/jobs'
import { businessNetIncome } from '@/lib/business'
import BankClient from './BankClient'

export const dynamic = 'force-dynamic'

export default async function BankPage() {
  const [session, t] = await Promise.all([auth(), getTranslations('bank')])
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const [loans, ownedEditions, user, jobHolding, bizEditions] = await Promise.all([
    prisma.loan.findMany({
      where:   { userId, status: { in: ['active', 'liquidating'] } },
      include: {
        edition: {
          select: {
            id: true, isAtRisk: true,
            item: { select: { name: true, imageUrl: true, category: true } },
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.itemEdition.findMany({
      where: { currentOwnerId: userId, isFrozen: false, isInAuction: false, hasActiveLoan: false },
      select: {
        id: true,
        item: { select: { name: true, imageUrl: true, benchmarkPrice: true, businessRiskTier: true, propertyTier: true, aircraftType: true, yachtType: true, category: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { balance: true, lockedBalance: true } }),
    prisma.jobHolding.findUnique({ where: { userId }, select: { jobCode: true, monthlySalary: true } }),
    prisma.itemEdition.findMany({
      where:  { currentOwnerId: userId, isFrozen: false, item: { businessRiskTier: { not: null } } },
      select: { item: { select: { businessRiskTier: true, benchmarkPrice: true } } },
    }),
  ])

  const netSalary = jobHolding
    ? Math.round(jobHolding.monthlySalary * (1 - (JOB_BY_CODE[jobHolding.jobCode]?.taxRate ?? 0)))
    : 0
  const bizIncome = bizEditions.reduce((s: number, e: { item: { businessRiskTier: string | null; benchmarkPrice: { toString(): string } | number } }) => {
    if (!e.item.businessRiskTier) return s
    return s + businessNetIncome(e.item.businessRiskTier, Number(e.item.benchmarkPrice))
  }, 0)
  const monthlyIncome    = netSalary + bizIncome
  const existingPayments = (loans as Array<{ monthlyPayment: number }>).reduce((s, l) => s + l.monthlyPayment, 0)
  const paymentRoom      = Math.max(0, Math.round(monthlyIncome * PAYMENT_INCOME_CAP) - existingPayments)

  const hasStarterLoan = (loans as Array<{ loanType: string }>).some(l => l.loanType === 'starter')

  type OwnedEditionRow = {
    id: string
    item: {
      name: string
      imageUrl: string | null
      category: string
      benchmarkPrice: { toString(): string } | number
      businessRiskTier: string | null
      propertyTier: string | null
      aircraftType: string | null
      yachtType: string | null
    }
  }

  type LoanRow = {
    id: string
    loanType: string
    assetCategory: string
    principal: number
    outstanding: number
    monthlyPayment: number
    termMonths: number
    paidMonths: number
    missedPayments: number
    status: string
    nextPaymentAt: Date
    editionId: string
    edition: {
      isAtRisk: boolean
      item: { name: string; imageUrl: string | null }
    }
  }

  // Compute eligibility for each owned edition
  const eligibleItems = (ownedEditions as OwnedEditionRow[]).map(e => {
    const profile: ItemLoanProfile = {
      category:         e.item.category,
      businessRiskTier: e.item.businessRiskTier,
      propertyTier:     e.item.propertyTier,
      aircraftType:     e.item.aircraftType,
      yachtType:        e.item.yachtType,
      benchmarkPrice:   Number(e.item.benchmarkPrice),
    }
    const assetCategory = getAssetCategory(profile)
    const product       = STANDARD_PRODUCTS[assetCategory]
    const maxLoan       = product ? calcMaxLoan(Number(e.item.benchmarkPrice), product.maxLtv) : 0
    const starterOk     = !hasStarterLoan && isStarterEligible(profile)
    const starterMax    = starterOk ? calcMaxLoan(Number(e.item.benchmarkPrice), STARTER_PRODUCT.maxLtv) : 0
    return {
      editionId:    e.id,
      name:         e.item.name,
      imageUrl:     e.item.imageUrl,
      assetCategory,
      productName:  product?.name ?? 'Collectibles',
      maxLoan,
      maxRate:      product?.monthlyRate ?? 0.0275,
      termMonths:   product?.termMonths ?? 12,
      starterOk,
      starterMax,
    }
  }).filter(e => e.maxLoan >= 1000)

  const loansForClient = (loans as LoanRow[]).map(l => ({
    id:             l.id,
    loanType:       l.loanType,
    assetCategory:  l.assetCategory,
    principal:      l.principal,
    outstanding:    l.outstanding,
    monthlyPayment: l.monthlyPayment,
    termMonths:     l.termMonths,
    paidMonths:     l.paidMonths,
    missedPayments: l.missedPayments,
    status:         l.status,
    nextPaymentAt:  l.nextPaymentAt.toISOString(),
    editionId:      l.editionId,
    editionName:    l.edition.item.name,
    editionImage:   l.edition.item.imageUrl,
    isAtRisk:       l.edition.isAtRisk,
  }))

  const balance = Number(user?.balance ?? 0) - Number(user?.lockedBalance ?? 0)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 900, fontSize: 24, margin: '0 0 4px' }}>{t('title')}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>{t('slogan')}</p>
      </div>

      {/* Income summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>${monthlyIncome.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>{t('monthlyIncome')}</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>${existingPayments.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>{t('monthlyPayments')}</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: paymentRoom > 0 ? 'var(--green)' : 'var(--red)' }}>${paymentRoom.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>{t('paymentRoom')}</div>
        </div>
      </div>

      <BankClient
        loans={loansForClient}
        eligibleItems={eligibleItems}
        balance={balance}
        monthlyIncome={monthlyIncome}
        paymentRoom={paymentRoom}
      />
    </div>
  )
}
