import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { availableBalance } from '@/lib/balance'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const userId = session.user.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id } })
      if (!loan)                  throw new Error('Loan not found')
      if (loan.userId !== userId) throw new Error('Not your loan')
      if (loan.status !== 'active') throw new Error('Loan is not active')

      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')
      if (availableBalance(user) < loan.outstanding) {
        throw new Error(`Insufficient balance. You need $${loan.outstanding.toLocaleString()} to repay this loan.`)
      }

      await tx.user.update({ where: { id: userId }, data: { balance: { decrement: loan.outstanding } } })
      await tx.loan.update({ where: { id }, data: { status: 'paid_off', outstanding: 0, lastPaymentAt: new Date() } })
      await tx.itemEdition.update({ where: { id: loan.editionId }, data: { hasActiveLoan: false, isAtRisk: false } })
      await tx.transaction.create({
        data: { fromUserId: userId, editionId: loan.editionId, amount: loan.outstanding, type: 'loan_repayment', description: 'Loan early repayment' },
      })

      return { ok: true, amountPaid: loan.outstanding }
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Repayment failed' }, { status: 400 })
  }
}
