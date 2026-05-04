import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
        })
        if (!user || user.isFrozen) return null
        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.username, isAdmin: user.isAdmin }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id      = user.id
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id      = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
