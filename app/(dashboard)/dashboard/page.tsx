import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

// Cards de métricas com dados reais do Supabase
async function buscarMetricas(restaurantId: string) {
  const supabase = await createClient()

  const inicio60d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [clientesAtivos, reviewsSemResposta, reviewsUrgentes, conteudosMes] = await Promise.all([
    // Clientes distintos com visita nos últimos 60 dias
    supabase
      .from('visits')
      .select('customer_id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('visited_at', inicio60d),

    // Reviews sem resposta
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .is('responded_at', null),

    // Reviews urgentes: nota <= 3 e sem resposta
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .lte('rating', 3)
      .is('responded_at', null),

    // Conteúdos gerados este mês
    supabase
      .from('generated_contents')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', inicioMes),
  ])

  return {
    clientesAtivos: clientesAtivos.count ?? 0,
    reviewsSemResposta: reviewsSemResposta.count ?? 0,
    reviewsUrgentes: reviewsUrgentes.count ?? 0,
    conteudosMes: conteudosMes.count ?? 0,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar restaurante do usuário
  const { data: restaurante } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user!.id)
    .single()

  // Se não tem restaurante cadastrado ainda, mostrar onboarding
  if (!restaurante) {
    return <OnboardingVazio email={user!.email!} />
  }

  const metricas = await buscarMetricas(restaurante.id)

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-auros-text">
          {restaurante.name}
        </h1>
        <p className="text-auros-subtle text-sm mt-1">
          Visão geral · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard
          titulo="Clientes Ativos"
          valor={String(metricas.clientesAtivos)}
          descricao="últimos 60 dias"
          cor="gold"
        />
        <MetricCard
          titulo="Sem Resposta"
          valor={String(metricas.reviewsSemResposta)}
          descricao="avaliações pendentes"
          cor={metricas.reviewsSemResposta > 0 ? 'alerta' : 'normal'}
        />
        <MetricCard
          titulo="Urgentes"
          valor={String(metricas.reviewsUrgentes)}
          descricao="reviews ≤ 3 estrelas"
          cor={metricas.reviewsUrgentes > 0 ? 'critico' : 'normal'}
        />
        <MetricCard
          titulo="Conteúdos"
          valor={String(metricas.conteudosMes)}
          descricao="gerados este mês"
          cor="normal"
        />
      </div>

      {/* Ações rápidas */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-auros-subtle uppercase tracking-wider mb-4">
          Ações rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AcaoCard
            href="/studio/caption"
            icone="✦"
            titulo="Gerar Caption"
            descricao="Crie captions para Instagram com IA"
          />
          <AcaoCard
            href="/avaliacoes"
            icone="◎"
            titulo="Responder Avaliações"
            descricao="Gerencie avaliações do Google e TripAdvisor"
            urgente={metricas.reviewsUrgentes > 0}
          />
          <AcaoCard
            href="/hub"
            icone="◉"
            titulo="Hub de Clientes"
            descricao="Veja quem está ativo e quem precisa de atenção"
          />
        </div>
      </div>

      {/* Atividade recente — placeholder */}
      <div>
        <h2 className="text-sm font-medium text-auros-subtle uppercase tracking-wider mb-4">
          Atividade recente
        </h2>
        <div className="bg-auros-card border border-auros-border rounded-2xl divide-y divide-auros-border">
          <AtividadeItem texto="Nenhuma atividade registrada ainda." tempo="" vazia />
        </div>
      </div>
    </div>
  )
}

/* ─── Componentes auxiliares ─── */

function MetricCard({ titulo, valor, descricao, cor }: {
  titulo: string; valor: string; descricao: string
  cor: 'gold' | 'normal' | 'alerta' | 'critico'
}) {
  const corValor = {
    gold: 'text-auros-gold',
    normal: 'text-auros-text',
    alerta: 'text-amber-400',
    critico: 'text-red-400',
  }[cor]

  return (
    <div className="bg-auros-card border border-auros-border rounded-2xl p-5">
      <p className="text-xs font-medium text-auros-subtle uppercase tracking-wider mb-3">{titulo}</p>
      <p className={`text-3xl font-semibold ${corValor} mb-1`}>{valor}</p>
      <p className="text-xs text-auros-muted">{descricao}</p>
    </div>
  )
}

function AcaoCard({ href, icone, titulo, descricao, urgente }: {
  href: string; icone: string; titulo: string; descricao: string; urgente?: boolean
}) {
  return (
    <Link
      href={href}
      className="bg-auros-card border border-auros-border rounded-2xl p-5
                 hover:border-auros-gold/50 hover:bg-auros-bg transition-all group relative"
    >
      {urgente && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <div className="text-auros-gold text-lg mb-3 group-hover:text-auros-gold-light transition-colors">
        {icone}
      </div>
      <p className="text-sm font-medium text-auros-text mb-1">{titulo}</p>
      <p className="text-xs text-auros-subtle leading-relaxed">{descricao}</p>
    </Link>
  )
}

function AtividadeItem({ texto, tempo, vazia }: { texto: string; tempo: string; vazia?: boolean }) {
  return (
    <div className="px-5 py-4 flex items-center gap-3">
      {!vazia && <div className="w-1.5 h-1.5 rounded-full bg-auros-gold flex-shrink-0" />}
      <p className={`text-sm flex-1 ${vazia ? 'text-auros-muted italic' : 'text-auros-text'}`}>
        {texto}
      </p>
      {tempo && <span className="text-xs text-auros-muted">{tempo}</span>}
    </div>
  )
}

function OnboardingVazio({ email }: { email: string }) {
  return (
    <div className="flex items-center justify-center h-full px-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-auros-gold/10 border border-auros-gold/20
                        flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl text-auros-gold">✦</span>
        </div>
        <h2 className="text-xl font-semibold text-auros-text mb-3">
          Bem-vindo ao AUROS
        </h2>
        <p className="text-auros-subtle text-sm leading-relaxed mb-6">
          Sua conta foi criada. O próximo passo é configurar o perfil do seu restaurante
          para começar a usar o Studio, o Hub de Clientes e as Campanhas.
        </p>
        <p className="text-auros-muted text-xs">{email}</p>
      </div>
    </div>
  )
}
