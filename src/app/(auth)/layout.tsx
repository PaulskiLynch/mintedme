import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div style={{
        position: 'fixed', top: 14, right: 16, zIndex: 50,
      }}>
        <LanguageSwitcher compact />
      </div>
      {children}
    </>
  )
}
