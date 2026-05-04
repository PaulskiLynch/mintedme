import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function MyMintPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const user = await import('@/lib/db').then(m => m.prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } }))
  redirect(`/mint/${user?.username ?? ''}`)
}
