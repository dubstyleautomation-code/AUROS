'use client'

import { useState, useEffect } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Segmento = 'aniversariante_mes' | 'inativo_60d' | 'vip' | 'novo' | 'recorrente' | 'todos'
type Canal    = 'email' | 'whatsapp' | 'sms'
type Status   = 'draft' | 'scheduled' | 'sent' | 'paused'

interface Campanha {
  id: string
  name: string
  segment: string
  channel: string
  status: Status
  scheduled_at: string | null
  sent_count: number | null
  created_at: string
}

interface Variacao {
  letra: string
  abordagem: string
  mensagem: string
}

const SEGMENTOS: { id: Segmento; label: string; desc: string }[] = [
  { id: 'aniversariante_mes', label: 'Aniversariantes',    desc: 'Clientes com aniversário este mês' },
  { id: 'inativo_60d',        label: 'Inativos',           desc: 'Sem visita há mais de 60 dias' },
  { id: 'vip',                label: 'VIP',                desc: 'Frequentes ou alto ticket' },
  { id: 'novo',               label: 'Novos',              desc: 'Ainda sem visitas registradas' },
  { id: 'recorrente',         label: 'Recorrentes',        desc: 'Visitam com regularidade' },
  { id: 'todos',              label: 'Todos',              desc: 'Toda a base de clientes' },
]

const CANAIS: { id: Canal; label: string; icone: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icone: '💬' },
  { id: 'email',    label: 'E-mail',   icone: '✉' },
  { id: 'sms',      label: 'SMS',      icone: '📱' },
]

const STATUS_LABEL: Record<Status, { label: string; classe: string }> = {
  draft:     { label: 'Rascunho',  classe: 'text-auros-muted border-auros-border bg-auros-bg' },
  scheduled: { label: 'Agendada',  classe: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  sent:      { label: 'Enviada',   classe: 'text-green-400 border-green-500/30 bg-green-500/10' },
  paused:    { label: 'Pausada',   classe: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CampanhasClient({
  initialCampanhas,
  restaurantName,
}: {
  initialCampanhas: Campanha[]
  restaurantName: string
}) {
  const [campanhas, setCampanhas] = useState<Campanha[]>(initialCampanhas)
  const [drawerAberto, setDrawerAberto] = useState(false)

  // Form
  const [segmento, setSegmento] = useState<Segmento | ''>('')
  const [canal, setCanal] = useState<Canal | ''>('')
  const [descricao, setDescricao] = useState('')
  const [template, setTemplate] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [audiencia, setAudiencia] = useState<number | null>(null)
  const [carregandoAudiencia, setCarregandoAudiencia] = useState(false)

  // IA
  const [variacoes, setVariacoes] = useState<Variacao[]>([])
  const [gerandoMensagem, setGerandoMensagem] = useState(false)
  const [erroIA, setErroIA] = useState('')

  // Salvar
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  // Buscar audiência ao selecionar segmento
  useEffect(() => {
    if (!segmento) { setAudiencia(null); return }
    setCarregandoAudiencia(true)
    fetch(`/api/campanhas/segmento-count?segment=${segmento}`)
      .then(r => r.json())
      .then(d => setAudiencia(d.count ?? 0))
      .catch(() => setAudiencia(null))
      .finally(() => setCarregandoAudiencia(false))
  }, [segmento])

  function resetForm() {
    setSegmento(''); setCanal(''); setDescricao(''); setTemplate('')
    setScheduledAt(''); setAudiencia(null); setVariacoes([])
    setErroIA(''); setErroForm('')
  }

  async function gerarMensagem() {
    if (!segmento || !canal || descricao.length < 10) return
    setGerandoMensagem(true); setErroIA(''); setVariacoes([])
    try {
      const res = await fetch('/api/campanhas/gerar-mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment: segmento, channel: canal, descricao, audiencia: audiencia ?? 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setVariacoes(data.variacoes)
    } catch (e) {
      setErroIA((e as Error).message || 'Erro ao gerar mensagem.')
    } finally {
      setGerandoMensagem(false)
    }
  }

  async function salvar(status: 'draft' | 'scheduled') {
    if (!segmento || !canal || !template.trim()) return
    setSalvando(true); setErroForm('')

    const nomeAuto = `${SEGMENTOS.find(s => s.id === segmento)?.label} — ${canal} — ${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`

    try {
      const res = await fetch('/api/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomeAuto,
          segment: segmento,
          channel: canal,
          template,
          scheduled_at: status === 'scheduled' && scheduledAt ? scheduledAt : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setCampanhas(prev => [data.campanha, ...prev])
      setDrawerAberto(false)
      resetForm()
    } catch (e) {
      setErroForm((e as Error).message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const podeGerar = segmento !== '' && canal !== '' && descricao.length >= 10
  const podeSalvar = template.trim().length >= 10

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-auros-text">Campanhas</h1>
          <p className="text-auros-subtle text-sm mt-1">{restaurantName}</p>
        </div>
        <button
          onClick={() => { resetForm(); setDrawerAberto(true) }}
          className="px-5 py-2.5 bg-auros-gold text-black text-sm font-semibold rounded-xl hover:bg-auros-gold-light transition-all"
        >
          ✦ Nova Campanha
        </button>
      </div>

      {/* Lista de campanhas */}
      {campanhas.length === 0 ? (
        <div className="bg-auros-card border border-auros-border rounded-2xl p-12 text-center">
          <div className="text-4xl text-auros-muted mb-4">◈</div>
          <p className="text-auros-text font-medium mb-2">Nenhuma campanha criada ainda</p>
          <p className="text-auros-subtle text-sm mb-6">Crie sua primeira campanha com mensagens personalizadas por IA.</p>
          <button
            onClick={() => { resetForm(); setDrawerAberto(true) }}
            className="px-5 py-2.5 bg-auros-gold text-black text-sm font-semibold rounded-xl hover:bg-auros-gold-light transition-all"
          >
            Criar Primeira Campanha
          </button>
        </div>
      ) : (
        <div className="bg-auros-card border border-auros-border rounded-2xl divide-y divide-auros-border">
          {campanhas.map(c => {
            const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.draft
            const segLabel = SEGMENTOS.find(s => s.id === c.segment)?.label ?? c.segment
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-auros-text">{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.classe}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-auros-muted">
                    <span>{segLabel}</span>
                    <span>·</span>
                    <span>{CANAIS.find(ch => ch.id === c.channel)?.icone} {c.channel}</span>
                    {c.scheduled_at && (
                      <>
                        <span>·</span>
                        <span>{new Date(c.scheduled_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    )}
                  </div>
                </div>
                {c.sent_count ? (
                  <div className="text-right">
                    <p className="text-sm font-medium text-auros-text">{c.sent_count}</p>
                    <p className="text-xs text-auros-muted">enviados</p>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Drawer Nova Campanha ─── */}
      {drawerAberto && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerAberto(false)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-auros-card border-l border-auros-border z-50 flex flex-col overflow-y-auto">

            {/* Cabeçalho do drawer */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-auros-border flex-shrink-0">
              <h3 className="text-lg font-semibold text-auros-text">Nova Campanha</h3>
              <button onClick={() => setDrawerAberto(false)} className="text-auros-muted hover:text-auros-text text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Segmento */}
              <div>
                <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-2">
                  Segmento
                  {audiencia !== null && (
                    <span className="ml-2 normal-case font-normal text-auros-gold">
                      {carregandoAudiencia ? '...' : `~${audiencia} clientes`}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SEGMENTOS.map(s => (
                    <button key={s.id} onClick={() => setSegmento(s.id)}
                      className={`p-3 rounded-xl text-left transition-all
                        ${segmento === s.id
                          ? 'bg-auros-gold/10 border border-auros-gold'
                          : 'border border-auros-border hover:border-auros-muted'}`}>
                      <p className={`text-sm font-medium ${segmento === s.id ? 'text-auros-gold' : 'text-auros-text'}`}>{s.label}</p>
                      <p className="text-xs text-auros-muted mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Canal */}
              <div>
                <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-2">Canal</label>
                <div className="flex gap-2">
                  {CANAIS.map(ch => (
                    <button key={ch.id} onClick={() => setCanal(ch.id)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all
                        ${canal === ch.id
                          ? 'bg-auros-gold/10 border border-auros-gold text-auros-gold'
                          : 'border border-auros-border text-auros-subtle hover:border-auros-muted hover:text-auros-text'}`}>
                      <span>{ch.icone}</span>{ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-2">
                  Objetivo da Campanha
                </label>
                <textarea
                  rows={3}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Reativar clientes que não visitam há 2 meses com uma mensagem especial..."
                  className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text placeholder-auros-muted text-sm resize-none focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                />
              </div>

              {/* Botão gerar */}
              <button
                onClick={gerarMensagem}
                disabled={!podeGerar || gerandoMensagem}
                className="w-full py-3 bg-auros-gold/10 border border-auros-gold/30 text-auros-gold text-sm font-medium rounded-xl hover:bg-auros-gold/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {gerandoMensagem ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Gerando com IA...
                  </>
                ) : '✦ Gerar Mensagem com IA'}
              </button>

              {erroIA && (
                <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{erroIA}</p>
                </div>
              )}

              {/* Variações geradas */}
              {variacoes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-auros-subtle uppercase tracking-wider">Escolha uma variação</p>
                  {variacoes.map(v => (
                    <button
                      key={v.letra}
                      onClick={() => setTemplate(v.mensagem)}
                      className={`w-full text-left p-4 rounded-xl border transition-all
                        ${template === v.mensagem
                          ? 'border-auros-gold bg-auros-gold/5'
                          : 'border-auros-border hover:border-auros-muted'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center
                          ${template === v.mensagem ? 'bg-auros-gold text-black' : 'bg-auros-muted/30 text-auros-subtle'}`}>
                          {v.letra}
                        </span>
                        <span className="text-xs text-auros-muted">{v.abordagem}</span>
                      </div>
                      <p className="text-sm text-auros-text leading-relaxed">{v.mensagem}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Template editável */}
              <div>
                <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-2">
                  Mensagem Final
                  {canal && (
                    <span className="ml-2 normal-case font-normal text-auros-muted">
                      {template.length} / {canal === 'sms' ? 160 : canal === 'whatsapp' ? 500 : 800} chars
                    </span>
                  )}
                </label>
                <textarea
                  rows={5}
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  placeholder="Escreva ou edite a mensagem aqui. Use {primeiro_nome} para personalizar..."
                  className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text placeholder-auros-muted text-sm resize-none focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                />
              </div>

              {/* Agendamento (opcional) */}
              <div>
                <label className="block text-xs font-medium text-auros-subtle uppercase tracking-wider mb-2">
                  Data de Envio <span className="normal-case font-normal text-auros-muted">(opcional — deixe em branco para salvar como rascunho)</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-auros-bg border border-auros-border text-auros-text text-sm focus:outline-none focus:border-auros-gold focus:ring-1 focus:ring-auros-gold"
                />
              </div>

              {erroForm && (
                <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{erroForm}</p>
                </div>
              )}
            </div>

            {/* Footer com botões */}
            <div className="border-t border-auros-border px-6 py-4 flex gap-3 flex-shrink-0">
              <button
                onClick={() => salvar('draft')}
                disabled={!podeSalvar || salvando}
                className="flex-1 py-3 rounded-xl border border-auros-border text-auros-subtle text-sm font-medium hover:border-auros-muted hover:text-auros-text transition-all disabled:opacity-40"
              >
                Salvar Rascunho
              </button>
              <button
                onClick={() => salvar('scheduled')}
                disabled={!podeSalvar || !scheduledAt || salvando}
                className="flex-1 py-3 rounded-xl bg-auros-gold text-black text-sm font-semibold hover:bg-auros-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? 'Salvando...' : 'Agendar Campanha'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
