'use client'

import { useState } from 'react'

const TONS = [
  { id: 'storytelling', label: 'Storytelling', desc: 'Narrativo e emocional' },
  { id: 'elegante',     label: 'Elegante',     desc: 'Sofisticado e conciso' },
  { id: 'provocativo',  label: 'Provocativo',  desc: 'Intrigante e curioso' },
  { id: 'tecnico',      label: 'Técnico',      desc: 'Foco no prato ou técnica' },
]

const CTA_OPTIONS = [
  'Reservar mesa',
  'Link na bio',
  'Marcar um amigo',
  'Contar nos comentários',
  'Ver menu completo',
]

interface Variacao {
  letra: 'A' | 'B' | 'C'
  foco: string
  texto: string
}

export default function CaptionStudioPage() {
  const [descricao, setDescricao] = useState('')
  const [tom, setTom] = useState('storytelling')
  const [cta, setCta] = useState('Reservar mesa')
  const [hashtags, setHashtags] = useState('5')
  const [carregando, setCarregando] = useState(false)
  const [variacoes, setVariacoes] = useState<Variacao[]>([])
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function gerarCaptions(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim()) return

    setCarregando(true)
    setErro(null)
    setVariacoes([])

    try {
      const res = await fetch('/api/studio/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao, tom, cta, hashtags: Number(hashtags) }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.erro || 'Erro ao gerar captions')
      }

      const data = await res.json()
      setVariacoes(data.variacoes)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setCarregando(false)
    }
  }

  function copiarTexto(texto: string, idx: number) {
    navigator.clipboard.writeText(texto)
    setCopiadoIdx(idx)
    setTimeout(() => setCopiadoIdx(null), 2000)
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-auros-gold text-lg">✦</span>
          <h1 className="text-2xl font-semibold text-auros-text">Caption Studio</h1>
        </div>
        <p className="text-auros-subtle text-sm">
          Descreva o que será publicado e a IA cria 3 variações prontas para o Instagram.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Formulário */}
        <form onSubmit={gerarCaptions} className="flex flex-col gap-5">

          {/* Descrição */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-auros-subtle uppercase tracking-wider">
              O que será publicado?
            </label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: risoto de trufas negras com azeite trufado e parmesão envelhecido, prato do chef desta semana..."
              rows={4}
              required
              className="w-full px-4 py-3 rounded-xl bg-auros-card border border-auros-border
                         text-auros-text placeholder-auros-muted text-sm resize-none
                         focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold
                         transition-colors"
            />
          </div>

          {/* Tom de Voz */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-auros-subtle uppercase tracking-wider">
              Tom de voz
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTom(t.id)}
                  className={`px-3 py-3 rounded-xl border text-left transition-all ${
                    tom === t.id
                      ? 'border-auros-gold bg-auros-gold/10 text-auros-text'
                      : 'border-auros-border bg-auros-card text-auros-subtle hover:border-auros-muted'
                  }`}
                >
                  <p className="text-xs font-medium">{t.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-auros-subtle uppercase tracking-wider">
              Chamada para ação
            </label>
            <select
              value={cta}
              onChange={e => setCta(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-auros-card border border-auros-border
                         text-auros-text text-sm
                         focus:outline-none focus:border-auros-gold
                         transition-colors"
            >
              {CTA_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Hashtags */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-auros-subtle uppercase tracking-wider">
              Número de hashtags
            </label>
            <div className="flex gap-2">
              {['3', '5', '8', '10'].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setHashtags(n)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    hashtags === n
                      ? 'border-auros-gold bg-auros-gold/10 text-auros-gold'
                      : 'border-auros-border bg-auros-card text-auros-subtle hover:border-auros-muted'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{erro}</p>
              {erro.includes('API') && (
                <p className="text-red-400/60 text-xs mt-1">
                  Configure a ANTHROPIC_API_KEY no arquivo .env.local para usar esta função.
                </p>
              )}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={carregando || !descricao.trim()}
            className="py-3.5 rounded-xl bg-auros-gold text-black font-semibold text-sm
                       hover:bg-auros-gold-light active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-150 flex items-center justify-center gap-2"
          >
            {carregando ? (
              <>
                <SpinnerIcon />
                Gerando 3 variações…
              </>
            ) : (
              <>
                <span>✦</span>
                Gerar Captions com IA
              </>
            )}
          </button>
        </form>

        {/* Área de resultados */}
        <div className="flex flex-col gap-4">
          {variacoes.length === 0 && !carregando && (
            <div className="flex-1 flex flex-col items-center justify-center
                            bg-auros-card border border-dashed border-auros-border rounded-2xl p-10 text-center">
              <div className="text-4xl text-auros-muted mb-4">✦</div>
              <p className="text-auros-subtle text-sm">
                As 3 variações de caption<br />aparecerão aqui.
              </p>
            </div>
          )}

          {carregando && (
            <div className="flex-1 flex flex-col gap-4">
              {['A', 'B', 'C'].map(letra => (
                <div key={letra} className="bg-auros-card border border-auros-border rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-auros-muted" />
                    <div className="h-3 w-24 bg-auros-muted rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-auros-muted rounded w-full" />
                    <div className="h-3 bg-auros-muted rounded w-4/5" />
                    <div className="h-3 bg-auros-muted rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {variacoes.map((v, idx) => (
            <div key={v.letra}
              className="bg-auros-card border border-auros-border rounded-2xl p-5 flex flex-col gap-3
                         hover:border-auros-gold/30 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-auros-gold/20 flex items-center justify-center">
                    <span className="text-auros-gold text-xs font-bold">{v.letra}</span>
                  </div>
                  <span className="text-xs text-auros-subtle">{v.foco}</span>
                </div>
                <button
                  onClick={() => copiarTexto(v.texto, idx)}
                  className="text-xs text-auros-muted hover:text-auros-gold transition-colors px-2 py-1 rounded-lg
                             hover:bg-auros-gold/10"
                >
                  {copiadoIdx === idx ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-sm text-auros-text leading-relaxed whitespace-pre-wrap">
                {v.texto}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
