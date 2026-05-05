import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MilliBux — Build your fantasy Mint',
  description: 'Get $1,000,000 in MilliBux. Buy luxury assets. Show off your Mint. Trade with the world.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
