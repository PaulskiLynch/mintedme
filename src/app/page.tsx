import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/feed')

  const demos = [
    { name: 'Alex R.',  tagline: 'Only black cars and rooftops.',   worth: '$4.2M',  items: 7  },
    { name: 'Sofia K.', tagline: 'Art snob. Zero apologies.',       worth: '$2.8M',  items: 12 },
    { name: 'James O.', tagline: 'Yacht degenerate since day one.', worth: '$6.1M',  items: 3  },
    { name: 'Nora L.',  tagline: "I collect what others can't.",    worth: '$11.4M', items: 5  },
  ]

  return (
    <div className="landing">
      <div className="landing-logo">MILLIBUX</div>

      <h1 className="landing-h1">
        What will a million<br />make you?
      </h1>

      <p className="landing-sub">
        Get $1,000,000 fantasy cash. Buy luxury assets. Build your Mint.
        Trade, flex, and compete with the world.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/signup" className="btn btn-gold btn-lg">
          Claim your $1,000,000 →
        </Link>
        <Link href="/login" className="btn btn-outline btn-lg">
          Sign in
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 48, margin: '56px 0 40px', flexWrap: 'wrap', justifyContent: 'center', fontSize: 14, color: 'var(--muted)' }}>
        {[['$1M', 'Starting balance'], ['300+', 'Luxury assets'], ['Live', 'Auctions & offers']].map(([v, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gold)' }}>{v}</div>
            <div>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
        Who&apos;s already flexing
      </div>
      <div className="landing-demos">
        {demos.map(d => (
          <div key={d.name} className="landing-demo-card">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg3)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--gold)', fontSize: 14 }}>
              {d.name[0]}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{d.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.4 }}>{d.tagline}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold)' }}>{d.worth}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.items} items</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, fontSize: 12, color: 'var(--muted)' }}>
        No real money. Pure fantasy. 100% the vibe.
      </div>
    </div>
  )
}
