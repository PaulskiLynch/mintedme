import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { JOB_BY_CODE, isJobActive, randomSalary } from '@/lib/jobs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobCode } = await req.json()
  if (!jobCode) return NextResponse.json({ error: 'jobCode required' }, { status: 400 })

  const jobDef = JOB_BY_CODE[jobCode]
  if (!jobDef) return NextResponse.json({ error: 'Unknown job' }, { status: 400 })

  const userId = session.user.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.jobHolding.findUnique({ where: { userId } })
      if (existing) throw new Error('You already hold a job — quit first')

      const userCount = await tx.user.count()
      if (!isJobActive(jobCode, userCount)) throw new Error('This role is not available today')

      const heldCount = await tx.jobHolding.count({ where: { jobCode } })
      if (heldCount >= 1) throw new Error('This role has already been filled')

      const salary  = randomSalary(jobDef)
      const holding = await tx.jobHolding.create({
        data: { userId, jobCode, monthlySalary: salary },
      })

      return { holding, salary }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Apply failed' }, { status: 400 })
  }
}
