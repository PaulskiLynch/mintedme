import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { JOB_BY_CODE, slotsForJob } from '@/lib/jobs'

const DURATION_MS = 3 * 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobCode, salaryBid } = await req.json()
  const userId = session.user.id

  const jobDef = JOB_BY_CODE[jobCode]
  if (!jobDef) return NextResponse.json({ error: 'Unknown job' }, { status: 400 })

  if (typeof salaryBid !== 'number' || salaryBid < jobDef.minSalary || salaryBid > jobDef.maxSalary) {
    return NextResponse.json(
      { error: `Bid must be between $${jobDef.minSalary.toLocaleString()} and $${jobDef.maxSalary.toLocaleString()}` },
      { status: 400 },
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingJob = await tx.jobHolding.findUnique({ where: { userId } })
      if (existingJob) throw new Error('Quit your current job before bidding')

      // Only one active auction bid at a time — unless updating bid on same job
      const conflictBid = await tx.jobBid.findFirst({
        where: { userId, jobAuction: { status: 'active', jobCode: { not: jobCode } } },
      })
      if (conflictBid) throw new Error('Withdraw your current bid on another job first')

      const [activeUsers, heldCount] = await Promise.all([
        tx.user.count(),
        tx.jobHolding.count({ where: { jobCode } }),
      ])
      const totalSlots = slotsForJob(jobDef.baseSlotsPerThousand, activeUsers)
      if (heldCount >= totalSlots) throw new Error('No slots available for this role right now')

      // Find or create active auction for this job code
      let auction = await tx.jobAuction.findFirst({ where: { jobCode, status: 'active' } })
      if (!auction) {
        auction = await tx.jobAuction.create({
          data: { jobCode, status: 'active', endsAt: new Date(Date.now() + DURATION_MS) },
        })
      }

      // Upsert bid (user can update their salary bid)
      const bid = await tx.jobBid.upsert({
        where:  { jobAuctionId_userId: { jobAuctionId: auction.id, userId } },
        create: { jobAuctionId: auction.id, userId, salaryBid },
        update: { salaryBid },
      })

      return { auctionId: auction.id, endsAt: auction.endsAt, bid }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobCode } = await req.json()
  const userId = session.user.id

  const auction = await prisma.jobAuction.findFirst({ where: { jobCode, status: 'active' } })
  if (!auction) return NextResponse.json({ error: 'No active auction for this job' }, { status: 400 })

  await prisma.jobBid.deleteMany({ where: { jobAuctionId: auction.id, userId } })
  return NextResponse.json({ ok: true })
}
