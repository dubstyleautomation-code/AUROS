import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// Validação de input com Zod
const InputSchema = z.object({
  descricao: z.string().min(10, 'Descreva melhor o que será publicado').max(500),
  tom: z.enum(['storytelling', 'elegante', 'provocativo', 'tecnico']),
  cta: z.string().max(100),
  hashtags: z.number().int().min(1).max(15).default(5),
})

const TOM_DESC: Record<string, string> = {
  storytelling: 'narrativo e emocional, conta uma história sobre o prato ou o lugar',
  elegante:     'sofisticado, conciso e de alto impacto — menos é mais',
  provocativo:  'intrigante, faz o leitor querer saber mais, usa perguntas ou mistério',
  tecnico:      'destaca a técnica culinária, os ingredientes especiais e o processo de preparo',
}

export async function POST(request: Request) {
  try {
    // 1. Verificar autenticação
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    // 2. Validar input
    const body = await request.json()
    const parsed = InputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const { descricao, tom, cta, hashtags } = parsed.data

    // 3. Buscar restaurante e brand context
    const admin = createAdminClient()
    const { data: restaurante } = await admin
      .from('restaurants')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!restaurante) {
      return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })
    }

    const { data: brand } = await admin
      .from('brand_contexts')
      .select('tone, avoid_words, hashtags')
      .eq('restaurant_id', restaurante.id)
      .maybeSingle()

    // 4. Verificar chave da Groq
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('sua_chave')) {
      return NextResponse.json(
        { erro: 'GROQ_API_KEY não configurada. Adicione sua chave em .env.local.' },
        { status: 503 }
      )
    }

    // 5. Gerar captions com Grok via callAI()
    const { callAI, MODELS } = await import('@/lib/ai/callAI')

    const systemPrompt = `Você é um especialista em marketing gastronômico para restaurantes de alto padrão brasileiros.
Crie captions autênticos, sofisticados e envolventes para o Instagram.

Restaurante: ${restaurante.name}
${brand ? `Tom de voz da marca: ${brand.tone}` : ''}
${brand?.avoid_words?.length ? `Palavras a evitar: ${brand.avoid_words.join(', ')}` : ''}

Regras absolutas:
- Nunca use linguagem genérica ou clichê ("venha nos visitar!", "não perca!", etc.)
- Público: adultos 30-55 anos, classes A/B
- Máximo 3 emojis por variação, sempre ao final de parágrafos
- Hashtags na última linha, separadas do corpo do texto
- Retorne EXATAMENTE o JSON solicitado, sem markdown ou texto adicional`

    const userPrompt = `Crie 3 variações de caption para este post:

Assunto: ${descricao}
Tom desta publicação: ${TOM_DESC[tom]}
Chamada para ação: ${cta}
Número de hashtags: ${hashtags}
${brand?.hashtags?.length ? `Hashtags preferidas da marca: ${brand.hashtags.slice(0, 10).join(' ')}` : ''}

Retorne JSON no formato:
{
  "variacoes": [
    { "letra": "A", "foco": "Storytelling emocional", "texto": "caption completo aqui" },
    { "letra": "B", "foco": "Produto e técnica", "texto": "caption completo aqui" },
    { "letra": "C", "foco": "Experiência e ambiente", "texto": "caption completo aqui" }
  ]
}`

    const resultado = await callAI({
      model: MODELS.SMART,          // grok-4-1-fast-reasoning — qualidade + custo baixo
      system: systemPrompt,
      prompt: userPrompt,
      restaurantId: restaurante.id,
      contentType: 'caption',
      promptVersion: 'caption-v1',
      metadata: { tom, cta, hashtags },
      maxTokens: 2048,
    })

    // 6. Parsear resposta do Grok
    const jsonMatch = resultado.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ erro: 'Formato de resposta inválido da IA' }, { status: 500 })
    }

    const { variacoes } = JSON.parse(jsonMatch[0])

    // 7. Salvar no banco
    await admin.from('generated_contents').insert(
      variacoes.map((v: { letra: string; texto: string }) => ({
        restaurant_id: restaurante.id,
        type: 'caption',
        content: v.texto,
        model_used: MODELS.SMART,
        prompt_version: 'caption-v1',
      }))
    )

    return NextResponse.json({ variacoes })

  } catch (error) {
    console.error('[API /studio/caption]', error)
    return NextResponse.json(
      { erro: 'Erro interno ao gerar captions. Tente novamente.' },
      { status: 500 }
    )
  }
}
