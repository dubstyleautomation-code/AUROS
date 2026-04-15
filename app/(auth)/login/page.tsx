'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
      setCarregando(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-auros-bg px-4">

      {/* Fundo com textura sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1c1400_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-auros-gold flex items-center justify-center">
              <span className="text-black font-bold text-sm">A</span>
            </div>
            <span className="text-2xl font-semibold tracking-widest text-auros-text uppercase">
              Auros
            </span>
          </div>
          <p className="text-auros-subtle text-sm">
            Marketing para restaurantes de alto padrão
          </p>
        </div>

        {/* Card do formulário */}
        <div className="bg-auros-card border border-auros-border rounded-2xl p-8 shadow-2xl">
          <h1 className="text-lg font-semibold text-auros-text mb-6">
            Entrar na plataforma
          </h1>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-auros-subtle uppercase tracking-wider">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border
                           text-auros-text placeholder-auros-muted text-sm
                           focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold
                           transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="text-xs font-medium text-auros-subtle uppercase tracking-wider">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border
                           text-auros-text placeholder-auros-muted text-sm
                           focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold
                           transition-colors"
              />
            </div>

            {erro && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="mt-2 w-full py-3 rounded-xl bg-auros-gold text-black font-semibold text-sm
                         hover:bg-auros-gold-light active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              {carregando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-auros-muted text-xs mt-6">
          Problemas para acessar? Fale com o suporte.
        </p>
      </div>
    </div>
  )
}
