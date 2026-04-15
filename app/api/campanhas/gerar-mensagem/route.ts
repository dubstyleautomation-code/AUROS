import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { callAI, MODELS } from '@/lib/ai/callAI'

const Schema = z.object({
  segment: z.enum(['aniversariante_mes', 'inativo_60d', 'vip', 'novo', 'recorrente', 'todos']),
  channel: z.enum(['email', 'whatsapp', 'sms']),
  descricao: z.string().min(10).max(500),
  audiencia: z.number().int().min(0).default(0),
})

const SEGMENTO_LABEL: Record<string, string> = {
  aniversariante_mes: 'Clientes aniversariantes do mês',
  inativo_60d:        'Clientes inativos há mais de 60 dias',
  vip:                'Clientes VIP (frequentes ou alto ticket)',
  novo:               'Novos clientes (sem visitas ainda)',
  recorrente:         'Clientes recorrentes',
  todos:              'Todos os clientes',
}

const LIMITE_CHARS: Record<string, number> = {
  sms: 160, whatsapp: 500, email: 800,
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    const { segment, channel, descricao, audiencia } = parsed.data

    const admin = createAdminClient()
    const { data: restaurante } = await admin
      .from('restaurants').select('id, name').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    const { data: brand } = await admin
      .from('brand_contexts')
      .select('tone, avoid_words, hashtags')
      .eq('restaurant_id', restaurante.id)
      .maybeSingle()

    const resultado = await callAI({
      model: MODELS.SMART,
      system: `Você é especialista em marketing de relacionamento para ${restaurante.name}, um restaurante de alto padrão.
Crie mensagens de campanha personalizadas para envio via ${channel}.
Tom de voz: ${brand?.tone ?? 'elegante'}.
${brand?.avoid_words?.length ? `Palavras a evitar: ${brand.avoid_words.join(', ')}.` : ''}
${brand?.hashtags?.length && channel !== 'sms' ? `Hashtags da marca (usar com moderação): ${brand.hashtags.slice(0, 5).join(' ')}.` : ''}
Limite de caracteres por mensagem: ${LIMITE_CHARS[channel]}.
Use {primeiro_nome} como placeholder para personalização.
Nunca prometa descontos sem especificação. Seja autêntico e alinhado com a marca.
Retorne EXATAMENTE o JSON solicitado, sem markdown.`,
      prompt: `Crie 2 variações de mensagem de campanha para este público:

Segmento: ${SEGMENTO_LABEL[segment]}
Público estimado: ~${audiencia} clientes
Canal: ${channel}
Objetivo: ${descricao}

Retorne JSON:
{
  "variacoes": [
    { "letra": "A", "abordagem": "descrição curta da abordagem", "mensagem": "texto completo aqui" },
    { "letra": "B", "abordagem": "descrição curta da abordagem", "mensagem": "texto completo aqui" }
  ]
}`,
      restaurantId: restaurante.id,
      contentType: 'campaign',
      promptVersion: 'campaign-v1',
      metadata: { segment, channel, audiencia },
      maxTokens: 1024,
    })

    // Parsear JSON
    const jsonMatch = resultado.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ erro: 'Formato de resposta inválido da IA.' }, { status: 500 })
    }
    const { variacoes } = JSON.parse(jsonMatch[0])

    return NextResponse.json({ variacoes })
  } catch (error) {
    console.error('[API /campanhas/gerar-mensagem]', error)
    return NextResponse.json({ erro: 'Erro ao gerar mensagem.' }, { status: 500 })
  }
}
