import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { JOB_CATALOGUE, slotsForJob } from '@/lib/jobs'

export async function GET() {
  const session = await auth()

  const [activeUsers, holdings] = await Promise.all([
    prisma.user.count(),
    prisma.jobHolding.groupBy({ by: ['jobCode'], _count: { jobCode: true } }),
  ])

  const holderMap = Object.fromEntries(holdings.map(h => [h.jobCode, h._count.jobCode]))

  const myJob = session?.user?.id
    ? await prisma.jobHolding.findUnique({ where: { userId: session.user.id } })
    : null

  const jobs = JOB_CATALOGUE.map(j => ({
    ...j,
    totalSlots:  slotsForJob(j.baseSlotsPerThousand, activeUsers),
    heldSlots:   holderMap[j.code] ?? 0,
  }))

  return NextResponse.json({ jobs, myJob })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.jobHolding.findUnique({ where: { userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'No active job' }, { status: 400 })

  await prisma.jobHolding.delete({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
