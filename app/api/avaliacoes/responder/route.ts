import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { callAI, MODELS } from '@/lib/ai/callAI'

const Schema = z.object({
  reviewId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
    const { reviewId } = parsed.data

    const admin = createAdminClient()

    // Verificar que o restaurante pertence ao usuário
    const { data: restaurante } = await admin
      .from('restaurants').select('id, name').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    // Buscar a review
    const { data: review } = await admin
      .from('reviews')
      .select('id, platform, rating, content, reviewer_name, restaurant_id')
      .eq('id', reviewId)
      .eq('restaurant_id', restaurante.id)
      .single()
    if (!review) return NextResponse.json({ erro: 'Avaliação não encontrada' }, { status: 404 })

    // Buscar brand context para tom
    const { data: brand } = await admin
      .from('brand_contexts')
      .select('tone, avoid_words')
      .eq('restaurant_id', restaurante.id)
      .maybeSingle()

    const conteudoReview = review.content?.trim()
      ? review.content
      : `O cliente não deixou comentário escrito, apenas deu ${review.rating} estrela${review.rating !== 1 ? 's' : ''}.`

    const instrucaoTom = review.rating <= 3
      ? 'Reconheça o problema, peça desculpas genuínas e ofereça uma ação concreta (ex: "entre em contato conosco").'
      : 'Agradeça de forma personalizada, mencione algo específico do comentário do cliente.'

    const resultado = await callAI({
      model: MODELS.SMART,
      system: `Você é o gerente de relacionamento de ${restaurante.name}, um restaurante de alto padrão.
Sua função é responder avaliações de clientes no ${review.platform} de forma profissional e empática.
Tom de voz da marca: ${brand?.tone ?? 'elegante'}.
${brand?.avoid_words?.length ? `Palavras a evitar: ${brand.avoid_words.join(', ')}.` : ''}
Regras absolutas:
- Resposta em português brasileiro
- Máximo 120 palavras
- ${instrucaoTom}
- Nunca mencione competidores
- Nunca prometa desconto
- Assine com o nome do restaurante
Retorne APENAS o texto da resposta, sem aspas, sem prefixos.`,
      prompt: `Avaliação de ${review.reviewer_name ?? 'cliente'} (${review.rating} estrelas no ${review.platform}):
"${conteudoReview}"

Escreva a resposta oficial do restaurante.`,
      restaurantId: restaurante.id,
      contentType: 'review_response',
      promptVersion: 'review-v1',
      metadata: { reviewId, rating: review.rating, platform: review.platform },
      maxTokens: 256,
    })

    // Salvar em generated_contents
    await admin.from('generated_contents').insert({
      restaurant_id: restaurante.id,
      type: 'review_response',
      content: resultado.content.trim(),
      model_used: MODELS.SMART,
      prompt_version: 'review-v1',
    })

    return NextResponse.json({ resposta: resultado.content.trim() })

  } catch (error) {
    console.error('[API /avaliacoes/responder]', error)
    return NextResponse.json({ erro: 'Erro ao gerar resposta.' }, { status: 500 })
  }
}
