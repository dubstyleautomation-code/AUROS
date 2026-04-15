'use client'

import { useState } from 'react'

interface Review {
  id: string
  platform: string
  rating: number
  content: string | null
  reviewer_name: string | null
  created_at: string
  responded_at: string | null
  response: string | null
}

type EstadoCard = {
  gerando: boolean
  rascunho: string
  editando: boolean
  salvo: boolean
  erro: string
}

export default function AvaliacoesClient({
  initialReviews,
  restaurantName,
}: {
  initialReviews: Review[]
  restaurantName: string
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [filtro, setFiltro] = useState<'todos' | 'urgentes'>('todos')
  const [estados, setEstados] = useState<Map<string, EstadoCard>>(new Map())

  const urgentes = reviews.filter(r => r.rating <= 3 && !r.responded_at)
  const exibidas = filtro === 'urgentes' ? urgentes : reviews

  function getEstado(id: string): EstadoCard {
    return estados.get(id) ?? { gerando: false, rascunho: '', editando: false, salvo: false, erro: '' }
  }

  function setEstado(id: string, patch: Partial<EstadoCard>) {
    setEstados(prev => {
      const next = new Map(prev)
      next.set(id, { ...getEstado(id), ...patch })
      return next
    })
  }

  async function gerarResposta(review: Review) {
    setEstado(review.id, { gerando: true, editando: false, erro: '', rascunho: '' })
    try {
      const res = await fetch('/api/avaliacoes/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setEstado(review.id, { gerando: false, rascunho: data.resposta, editando: true })
    } catch (e) {
      setEstado(review.id, { gerando: false, erro: (e as Error).message || 'Erro ao gerar.' })
    }
  }

  async function salvarResposta(review: Review) {
    const estado = getEstado(review.id)
    setEstado(review.id, { gerando: true })
    try {
      const res = await fetch('/api/avaliacoes/salvar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id, resposta: estado.rascunho }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setEstado(review.id, { gerando: false, salvo: true, editando: false })
      setReviews(prev =>
        prev.map(r => r.id === review.id
          ? { ...r, response: estado.rascunho, responded_at: new Date().toISOString() }
          : r
        )
      )
    } catch (e) {
      setEstado(review.id, { gerando: false, erro: (e as Error).message || 'Erro ao salvar.' })
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-auros-text">Avaliações</h1>
        <p className="text-auros-subtle text-sm mt-1">{restaurantName}</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <FiltroBtn ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>
          Todas ({reviews.length})
        </FiltroBtn>
        <FiltroBtn ativo={filtro === 'urgentes'} urgente onClick={() => setFiltro('urgentes')}>
          Urgentes ≤3★ ({urgentes.length})
        </FiltroBtn>
      </div>

      {/* Lista */}
      {exibidas.length === 0 ? (
        <div className="bg-auros-card border border-auros-border rounded-2xl p-12 text-center">
          <div className="text-4xl text-auros-muted mb-4">◎</div>
          <p className="text-auros-text font-medium mb-2">
            {filtro === 'urgentes' ? 'Nenhuma avaliação urgente pendente ✓' : 'Nenhuma avaliação importada ainda'}
          </p>
          {filtro === 'todos' && (
            <p className="text-auros-subtle text-sm">
              As avaliações aparecerão aqui quando forem importadas do Google, TripAdvisor ou adicionadas manualmente.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {exibidas.map(review => {
            const estado = getEstado(review.id)
            const respondida = !!review.responded_at
            const urgente = review.rating <= 3

            return (
              <div
                key={review.id}
                className={`rounded-2xl border p-5 transition-all
                  ${urgente && !respondida
                    ? 'border-red-900/50 bg-red-950/10'
                    : respondida
                    ? 'border-auros-border bg-auros-card opacity-70'
                    : 'border-auros-border bg-auros-card'
                  }`}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-auros-text">{review.reviewer_name ?? 'Anônimo'}</span>
                    <span className="text-xs px-2 py-0.5 border border-auros-border rounded-full text-auros-subtle">
                      {review.platform}
                    </span>
                    {respondida && (
                      <span className="text-xs text-green-400">✓ Respondida</span>
                    )}
                    {urgente && !respondida && (
                      <span className="text-xs text-red-400 font-medium">⚠ Urgente</span>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <Estrelas rating={review.rating} />
                    <span className="text-xs text-auros-muted ml-1">
                      {new Date(review.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>

                {/* Conteúdo da review */}
                {review.content && (
                  <p className="text-sm text-auros-subtle leading-relaxed mb-4 italic">
                    &ldquo;{review.content}&rdquo;
                  </p>
                )}

                {/* Resposta existente */}
                {respondida && review.response && (
                  <div className="bg-auros-bg border border-auros-border rounded-xl p-4 mb-3">
                    <p className="text-xs font-medium text-auros-muted uppercase tracking-wider mb-2">Resposta do restaurante</p>
                    <p className="text-sm text-auros-text leading-relaxed">{review.response}</p>
                  </div>
                )}

                {/* Área de resposta IA */}
                {!respondida && (
                  <div>
                    {estado.erro && (
                      <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 mb-3">
                        <p className="text-red-400 text-sm">{estado.erro}</p>
                      </div>
                    )}

                    {estado.editando && (
                      <div className="mb-3">
                        <textarea
                          rows={4}
                          value={estado.rascunho}
                          onChange={e => setEstado(review.id, { rascunho: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text text-sm resize-none focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => salvarResposta(review)}
                            disabled={estado.gerando || !estado.rascunho.trim()}
                            className="px-4 py-2 bg-auros-gold text-black text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-auros-gold-light transition-all"
                          >
                            {estado.gerando ? 'Salvando...' : 'Salvar Resposta'}
                          </button>
                          <button
                            onClick={() => setEstado(review.id, { editando: false, rascunho: '' })}
                            className="px-4 py-2 border border-auros-border text-auros-subtle text-sm rounded-xl hover:border-auros-muted hover:text-auros-text transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => gerarResposta(review)}
                            className="ml-auto px-4 py-2 text-auros-subtle text-xs hover:text-auros-gold transition-colors"
                          >
                            ↺ Regerar
                          </button>
                        </div>
                      </div>
                    )}

                    {!estado.editando && (
                      <button
                        onClick={() => gerarResposta(review)}
                        disabled={estado.gerando}
                        className="flex items-center gap-2 px-4 py-2.5 bg-auros-gold/10 border border-auros-gold/30 text-auros-gold text-sm font-medium rounded-xl hover:bg-auros-gold/20 transition-all disabled:opacity-50"
                      >
                        {estado.gerando ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Gerando resposta...
                          </>
                        ) : '✦ Gerar Resposta com IA'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Estrelas({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-auros-gold' : 'text-auros-muted'}>★</span>
      ))}
    </div>
  )
}

function FiltroBtn({ ativo, urgente, onClick, children }: {
  ativo: boolean; urgente?: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${ativo
          ? urgente
            ? 'bg-red-900/30 border border-red-700/50 text-red-400'
            : 'bg-auros-gold/10 border border-auros-gold/30 text-auros-gold'
          : 'border border-auros-border text-auros-subtle hover:border-auros-muted hover:text-auros-text'
        }`}
    >
      {children}
    </button>
  )
}
