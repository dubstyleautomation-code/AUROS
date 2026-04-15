'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Visita {
  visited_at: string
  avg_ticket: number | null
}

interface Cliente {
  id: string
  name: string
  email: string | null
  phone: string | null
  birthday: string | null
  notes: string | null
  created_at: string
  visits: Visita[]
}

type Segmento = 'VIP' | 'Recorrente' | 'Novo' | 'Dormante'

// ─── Lógica de segmentação ────────────────────────────────────────────────────

function getSegmento(cliente: Cliente): Segmento {
  const visitas = cliente.visits ?? []
  const agora = Date.now()
  const em60d = visitas.filter(v =>
    agora - new Date(v.visited_at).getTime() < 60 * 24 * 60 * 60 * 1000
  )
  const ticketMedio = visitas.reduce((s, v) => s + (v.avg_ticket ?? 0), 0) / (visitas.length || 1)

  if (visitas.length === 0) return 'Novo'
  if (em60d.length === 0) return 'Dormante'
  if (em60d.length >= 3 || ticketMedio >= 200) return 'VIP'
  return 'Recorrente'
}

function aniversarioProximo(birthday: string | null): number | null {
  if (!birthday) return null
  const hoje = new Date()
  const nasc = new Date(birthday)
  for (let i = 0; i <= 7; i++) {
    const check = new Date(hoje)
    check.setDate(hoje.getDate() + i)
    if (check.getMonth() === nasc.getMonth() && check.getDate() === nasc.getDate()) return i
  }
  return null
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HubClient({
  initialCustomers,
  restaurantId,
}: {
  initialCustomers: Cliente[]
  restaurantId: string
}) {
  const [clientes, setClientes] = useState<Cliente[]>(initialCustomers)
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [visitas, setVisitas] = useState<{ id: string; visited_at: string; party_size: number | null; avg_ticket: number | null; notes: string | null }[]>([])
  const [carregandoVisitas, setCarregandoVisitas] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', birthday: '', notes: '' })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  // Busca com debounce
  const buscarClientes = useCallback(async (q: string) => {
    setBuscando(true)
    try {
      const res = await fetch(`/api/hub/customers?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.ok) setClientes(data.customers)
    } finally {
      setBuscando(false)
    }
  }, [])

  useEffect(() => {
    if (busca.trim() === '') {
      setClientes(initialCustomers)
      return
    }
    const timer = setTimeout(() => buscarClientes(busca), 300)
    return () => clearTimeout(timer)
  }, [busca, buscarClientes, initialCustomers])

  // Abrir drawer e carregar visitas
  async function abrirCliente(cliente: Cliente) {
    setClienteSelecionado(cliente)
    setCarregandoVisitas(true)
    setVisitas([])
    try {
      const res = await fetch(`/api/hub/customers/${cliente.id}/visits`)
      const data = await res.json()
      if (res.ok) setVisitas(data.visits)
    } finally {
      setCarregandoVisitas(false)
    }
  }

  // Criar cliente
  async function criarCliente(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErroForm('')
    try {
      const res = await fetch('/api/hub/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setClientes(prev => [{ ...data.customer, visits: [] }, ...prev].sort((a, b) => a.name.localeCompare(b.name)))
      setModalAberto(false)
      setForm({ name: '', email: '', phone: '', birthday: '', notes: '' })
    } catch (e) {
      setErroForm((e as Error).message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-auros-text">Hub de Clientes</h1>
          <p className="text-auros-subtle text-sm mt-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="px-5 py-2.5 bg-auros-gold text-black text-sm font-semibold rounded-xl hover:bg-auros-gold-light transition-all"
        >
          ✦ Adicionar Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="mb-5 relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-auros-muted text-sm">◎</span>
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-xl bg-auros-card border border-auros-border
                     text-auros-text placeholder-auros-muted text-sm
                     focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
        />
        {buscando && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="animate-spin w-4 h-4 text-auros-gold" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Lista de clientes */}
      {clientes.length === 0 ? (
        <div className="bg-auros-card border border-auros-border rounded-2xl p-12 text-center">
          <div className="text-4xl text-auros-muted mb-4">◉</div>
          <p className="text-auros-text font-medium mb-2">
            {busca ? `Nenhum cliente encontrado para "${busca}"` : 'Nenhum cliente cadastrado ainda'}
          </p>
          {!busca && (
            <button
              onClick={() => setModalAberto(true)}
              className="mt-4 px-5 py-2.5 bg-auros-gold text-black text-sm font-semibold rounded-xl hover:bg-auros-gold-light transition-all"
            >
              Adicionar Primeiro Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-auros-card border border-auros-border rounded-2xl divide-y divide-auros-border">
          {clientes.map(c => {
            const segmento = getSegmento(c)
            const diasAniv = aniversarioProximo(c.birthday)
            return (
              <button
                key={c.id}
                onClick={() => abrirCliente(c)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-auros-bg transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-auros-muted/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-auros-text">{c.name.charAt(0).toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-auros-text">{c.name}</span>
                    <SegmentoBadge segmento={segmento} />
                    {diasAniv !== null && (
                      <span className="text-xs text-auros-gold">
                        🎂 {diasAniv === 0 ? 'Hoje!' : `em ${diasAniv}d`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-auros-muted mt-0.5 truncate">
                    {c.phone ?? c.email ?? 'Sem contato cadastrado'}
                  </p>
                </div>

                {/* Visitas */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-auros-text">{c.visits?.length ?? 0}</p>
                  <p className="text-xs text-auros-muted">visita{(c.visits?.length ?? 0) !== 1 ? 's' : ''}</p>
                </div>

                <span className="text-auros-muted text-xs">›</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Drawer de cliente ─── */}
      {clienteSelecionado && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setClienteSelecionado(null)}
          />
          <div className="fixed right-0 top-0 h-full w-96 bg-auros-card border-l border-auros-border z-50 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-auros-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-auros-muted/30 flex items-center justify-center">
                  <span className="text-base font-medium text-auros-text">
                    {clienteSelecionado.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-auros-text">{clienteSelecionado.name}</p>
                  <SegmentoBadge segmento={getSegmento(clienteSelecionado)} />
                </div>
              </div>
              <button
                onClick={() => setClienteSelecionado(null)}
                className="text-auros-muted hover:text-auros-text transition-colors text-xl"
              >×</button>
            </div>

            <div className="px-6 py-5 space-y-4 flex-1">
              {/* Informações */}
              <div className="space-y-2">
                {clienteSelecionado.phone && (
                  <p className="text-sm text-auros-subtle">📞 {clienteSelecionado.phone}</p>
                )}
                {clienteSelecionado.email && (
                  <p className="text-sm text-auros-subtle">✉ {clienteSelecionado.email}</p>
                )}
                {clienteSelecionado.birthday && (
                  <p className="text-sm text-auros-subtle">
                    🎂 {new Date(clienteSelecionado.birthday + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                )}
                {clienteSelecionado.notes && (
                  <p className="text-sm text-auros-subtle italic">"{clienteSelecionado.notes}"</p>
                )}
              </div>

              {/* Histórico de visitas */}
              <div>
                <p className="text-xs font-medium text-auros-subtle uppercase tracking-wider mb-3">
                  Histórico de Visitas
                </p>
                {carregandoVisitas ? (
                  <div className="flex items-center gap-2 text-auros-muted text-sm">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Carregando...
                  </div>
                ) : visitas.length === 0 ? (
                  <p className="text-sm text-auros-muted italic">Nenhuma visita registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {visitas.map(v => (
                      <div key={v.id} className="bg-auros-bg border border-auros-border rounded-xl px-4 py-3">
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-auros-text">
                            {new Date(v.visited_at).toLocaleDateString('pt-BR', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </p>
                          {v.avg_ticket && (
                            <p className="text-sm text-auros-gold font-medium">
                              R$ {Number(v.avg_ticket).toFixed(2)}
                            </p>
                          )}
                        </div>
                        {v.party_size && (
                          <p className="text-xs text-auros-muted mt-0.5">{v.party_size} pessoa{v.party_size !== 1 ? 's' : ''}</p>
                        )}
                        {v.notes && <p className="text-xs text-auros-muted mt-1 italic">{v.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Modal Novo Cliente ─── */}
      {modalAberto && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setModalAberto(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="bg-auros-card border border-auros-border rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-auros-text">Novo Cliente</h3>
                <button onClick={() => setModalAberto(false)} className="text-auros-muted hover:text-auros-text text-xl">×</button>
              </div>

              <form onSubmit={criarCliente} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">Nome *</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome completo"
                    className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text placeholder-auros-muted text-sm focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">Telefone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text placeholder-auros-muted text-sm focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">Aniversário</label>
                    <input
                      type="date"
                      value={form.birthday}
                      onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text text-sm focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="cliente@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text placeholder-auros-muted text-sm focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-1.5">Observações</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Preferências, restrições, observações..."
                    className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text placeholder-auros-muted text-sm resize-none focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                  />
                </div>

                {erroForm && (
                  <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm">{erroForm}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setModalAberto(false)}
                    className="flex-1 py-3 rounded-xl border border-auros-border text-auros-subtle text-sm hover:border-auros-muted hover:text-auros-text transition-all">
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvando}
                    className="flex-1 py-3 rounded-xl bg-auros-gold text-black font-semibold text-sm disabled:opacity-60 hover:bg-auros-gold-light transition-all">
                    {salvando ? 'Salvando...' : 'Salvar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Badge de segmento ────────────────────────────────────────────────────────

function SegmentoBadge({ segmento }: { segmento: Segmento }) {
  const estilos: Record<Segmento, string> = {
    VIP:        'bg-auros-gold/20 text-auros-gold border border-auros-gold/30',
    Recorrente: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    Novo:       'bg-green-500/10 text-green-400 border border-green-500/20',
    Dormante:   'bg-auros-muted/20 text-auros-muted border border-auros-border',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estilos[segmento]}`}>
      {segmento}
    </span>
  )
}
