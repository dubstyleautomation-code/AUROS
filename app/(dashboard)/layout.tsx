import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

const NAV = [
  { href: '/dashboard',          label: 'Visão Geral',    icone: '◈' },
  { href: '/studio/caption',     label: 'Studio',         icone: '✦', grupo: 'Criação' },
  { href: '/hub',                label: 'Hub de Clientes',icone: '◉', grupo: 'Relacionamento' },
  { href: '/avaliacoes',         label: 'Avaliações',     icone: '◎' },
  { href: '/campanhas',          label: 'Campanhas',      icone: '◈' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-auros-bg overflow-hidden">

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-auros-border bg-auros-card flex flex-col">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-auros-border">
          <div className="w-7 h-7 rounded-full bg-auros-gold flex items-center justify-center flex-shrink-0">
            <span className="text-black font-bold text-xs">A</span>
          </div>
          <span className="font-semibold tracking-widest text-auros-text text-sm uppercase">
            Auros
          </span>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-auros-subtle
                         hover:bg-auros-bg hover:text-auros-text transition-colors group"
            >
              <span className="text-auros-gold text-xs group-hover:text-auros-gold-light transition-colors">
                {item.icone}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer da sidebar */}
        <div className="border-t border-auros-border p-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-auros-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs text-auros-text font-medium">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-auros-text truncate">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
