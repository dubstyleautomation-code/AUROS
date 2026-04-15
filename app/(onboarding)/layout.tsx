// Layout do Onboarding — sem sidebar, apenas auth check
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-auros-bg flex items-center justify-center px-4 py-12">
      {/* Logo topo */}
      <div className="fixed top-6 left-6 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-auros-gold flex items-center justify-center">
          <span className="text-black font-bold text-xs">A</span>
        </div>
        <span className="font-semibold tracking-widest text-auros-text text-sm uppercase">Auros</span>
      </div>

      {children}
    </div>
  )
}
