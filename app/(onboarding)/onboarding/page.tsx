'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Tom = 'storytelling' | 'elegante' | 'provocativo' | 'tecnico'

interface FormData {
  nome: string
  tipoCozinha: string
  tom: Tom | ''
  palavrasEvitar: string[]
  hashtags: string[]
}

const COZINHAS = [
  'Contemporânea', 'Italiana', 'Japonesa', 'Brasileira',
  'Francesa', 'Mexicana', 'Árabe', 'Fusion', 'Frutos do Mar', 'Outros',
]

const TONS: { id: Tom; label: string; desc: string }[] = [
  { id: 'storytelling', label: 'Storytelling',  desc: 'Narrativo e emocional — conta histórias' },
  { id: 'elegante',     label: 'Elegante',       desc: 'Sofisticado e conciso — menos é mais' },
  { id: 'provocativo',  label: 'Provocativo',    desc: 'Intrigante — desperta curiosidade' },
  { id: 'tecnico',      label: 'Técnico',        desc: 'Destaca técnica e ingredientes' },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    nome: '', tipoCozinha: '', tom: '',
    palavrasEvitar: [], hashtags: [],
  })
  const [tagInput, setTagInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [preview, setPreview] = useState('')
  const [gerandoPreview, setGerandoPreview] = useState(false)
  const [erroPreview, setErroPreview] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Gerar prévia ao entrar no step 3
  const gerarPreview = useCallback(async () => {
    setGerandoPreview(true)
    setErroPreview('')
    try {
      const res = await fetch('/api/onboarding/preview-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          tipoCozinha: form.tipoCozinha,
          tom: form.tom,
          palavrasEvitar: form.palavrasEvitar,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setPreview(data.preview)
    } catch (e) {
      setErroPreview((e as Error).message || 'Erro ao gerar prévia.')
    } finally {
      setGerandoPreview(false)
    }
  }, [form.nome, form.tipoCozinha, form.tom, form.palavrasEvitar])

  useEffect(() => {
    if (step === 3) gerarPreview()
  }, [step, gerarPreview])

  // Adicionar tag (palavras a evitar)
  function adicionarTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim().replace(/,/g, '')
      if (val && !form.palavrasEvitar.includes(val)) {
        setForm(f => ({ ...f, palavrasEvitar: [...f.palavrasEvitar, val] }))
      }
      setTagInput('')
    }
  }

  function removerTag(palavra: string) {
    setForm(f => ({ ...f, palavrasEvitar: f.palavrasEvitar.filter(p => p !== palavra) }))
  }

  // Adicionar hashtag
  function adicionarHashtag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = hashtagInput.trim().replace(/[,#]/g, '')
      if (val && !form.hashtags.includes(val)) {
        setForm(f => ({ ...f, hashtags: [...f.hashtags, `#${val}`] }))
      }
      setHashtagInput('')
    }
  }

  function removerHashtag(tag: string) {
    setForm(f => ({ ...f, hashtags: f.hashtags.filter(h => h !== tag) }))
  }

  // Salvar e concluir
  async function concluir() {
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          tipoCozinha: form.tipoCozinha,
          tom: form.tom,
          palavrasEvitar: form.palavrasEvitar,
          hashtags: form.hashtags,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      router.push('/dashboard')
    } catch (e) {
      setErro((e as Error).message || 'Erro ao salvar.')
      setSalvando(false)
    }
  }

  // Validação por step
  const podeAvancar =
    step === 1 ? form.nome.trim().length >= 2 && form.tipoCozinha !== '' :
    step === 2 ? form.tom !== '' :
    true

  return (
    <div className="w-full max-w-lg">

      {/* Indicador de step */}
      <StepIndicator atual={step} total={3} />

      {/* Card principal */}
      <div className="bg-auros-card border border-auros-border rounded-2xl p-8 mt-8">

        {/* ─── Step 1: Perfil do Restaurante ─── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-auros-text mb-1">Perfil do Restaurante</h2>
            <p className="text-auros-subtle text-sm mb-6">
              Vamos começar com as informações básicas do seu estabelecimento.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">
                  Nome do Restaurante
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bistrô São Paulo"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border
                             text-auros-text placeholder-auros-muted text-sm
                             focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">
                  Tipo de Cozinha
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COZINHAS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipoCozinha: c }))}
                      className={`px-3 py-2.5 rounded-xl text-sm text-left transition-all
                        ${form.tipoCozinha === c
                          ? 'bg-auros-gold/10 border border-auros-gold text-auros-gold font-medium'
                          : 'border border-auros-border text-auros-subtle hover:border-auros-muted hover:text-auros-text'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Identidade de Marca ─── */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-auros-text mb-1">Identidade de Marca</h2>
            <p className="text-auros-subtle text-sm mb-6">
              Como o seu restaurante se comunica? Essa configuração define o tom de toda a IA.
            </p>

            {/* Tom de voz */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-2">
                Tom de Voz
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TONS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tom: t.id }))}
                    className={`p-3 rounded-xl text-left transition-all
                      ${form.tom === t.id
                        ? 'bg-auros-gold/10 border border-auros-gold'
                        : 'border border-auros-border hover:border-auros-muted'
                      }`}
                  >
                    <p className={`text-sm font-medium mb-0.5 ${form.tom === t.id ? 'text-auros-gold' : 'text-auros-text'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-auros-subtle">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Palavras a evitar */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">
                Palavras a Evitar <span className="text-auros-muted normal-case font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Digite e pressione Enter — ex: promoção, barato..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={adicionarTag}
                className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border
                           text-auros-text placeholder-auros-muted text-sm
                           focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
              />
              {form.palavrasEvitar.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.palavrasEvitar.map(p => (
                    <span key={p} className="flex items-center gap-1 px-2.5 py-1 bg-auros-bg border border-auros-border rounded-lg text-xs text-auros-subtle">
                      {p}
                      <button onClick={() => removerTag(p)} className="text-auros-muted hover:text-red-400 transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">
                Hashtags da Marca <span className="text-auros-muted normal-case font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Digite e pressione Enter — ex: gastronomia, sp..."
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyDown={adicionarHashtag}
                className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border
                           text-auros-text placeholder-auros-muted text-sm
                           focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
              />
              {form.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.hashtags.map(h => (
                    <span key={h} className="flex items-center gap-1 px-2.5 py-1 bg-auros-gold/10 border border-auros-gold/30 rounded-lg text-xs text-auros-gold">
                      {h}
                      <button onClick={() => removerHashtag(h)} className="hover:text-red-400 transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 3: Prévia de Caption ─── */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-auros-text mb-1">Sua Marca em Ação</h2>
            <p className="text-auros-subtle text-sm mb-6">
              Veja como a IA vai falar pelo seu restaurante. Este é apenas um exemplo do Studio.
            </p>

            {/* Preview card */}
            <div className="bg-auros-bg border border-auros-border rounded-xl p-5 min-h-[140px] mb-4 relative">
              {gerandoPreview ? (
                <div className="flex items-center gap-3 text-auros-subtle">
                  <svg className="animate-spin w-4 h-4 text-auros-gold" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm">Gerando prévia...</span>
                </div>
              ) : erroPreview ? (
                <div>
                  <p className="text-red-400 text-sm mb-3">{erroPreview}</p>
                  <button onClick={gerarPreview} className="text-xs text-auros-gold hover:text-auros-gold-light transition-colors">
                    ↺ Tentar novamente
                  </button>
                </div>
              ) : (
                <p className="text-auros-text text-sm leading-relaxed whitespace-pre-wrap">{preview}</p>
              )}
            </div>

            {!gerandoPreview && !erroPreview && preview && (
              <button
                onClick={gerarPreview}
                className="text-xs text-auros-subtle hover:text-auros-gold transition-colors mb-4 block"
              >
                ↺ Gerar outro exemplo
              </button>
            )}

            {/* Resumo da configuração */}
            <div className="bg-auros-bg border border-auros-border rounded-xl p-4 text-xs space-y-1.5 text-auros-subtle">
              <p><span className="text-auros-text font-medium">Restaurante:</span> {form.nome}</p>
              <p><span className="text-auros-text font-medium">Cozinha:</span> {form.tipoCozinha}</p>
              <p><span className="text-auros-text font-medium">Tom:</span> {TONS.find(t => t.id === form.tom)?.label}</p>
            </div>

            {/* Erro de salvamento */}
            {erro && (
              <div className="mt-4 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{erro}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Navegação ─── */}
        <div className="flex items-center gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl border border-auros-border text-auros-subtle text-sm
                         hover:border-auros-muted hover:text-auros-text transition-all"
            >
              Voltar
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!podeAvancar}
              className="flex-1 py-3 rounded-xl bg-auros-gold text-black font-semibold text-sm
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-auros-gold-light transition-all"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={concluir}
              disabled={salvando}
              className="flex-1 py-3 rounded-xl bg-auros-gold text-black font-semibold text-sm
                         disabled:opacity-60 hover:bg-auros-gold-light transition-all flex items-center justify-center gap-2"
            >
              {salvando ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Salvando...
                </>
              ) : 'Concluir e Entrar ✦'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ atual, total }: { atual: number; total: number }) {
  const labels = ['Perfil', 'Marca', 'Prévia']
  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: total }, (_, i) => {
        const num = i + 1
        const ativo = num === atual
        const completo = num < atual
        return (
          <div key={num} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all
              ${completo ? 'bg-auros-gold text-black' :
                ativo ? 'bg-auros-gold/20 border-2 border-auros-gold text-auros-gold' :
                'bg-auros-card border border-auros-border text-auros-muted'}`}
            >
              {completo ? '✓' : num}
            </div>
            <span className={`ml-1.5 text-xs mr-4 ${ativo ? 'text-auros-text font-medium' : 'text-auros-muted'}`}>
              {labels[i]}
            </span>
            {num < total && (
              <div className={`w-8 h-px mr-4 ${completo ? 'bg-auros-gold' : 'bg-auros-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
