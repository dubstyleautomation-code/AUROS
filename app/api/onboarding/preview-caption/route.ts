import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { callAI, MODELS } from '@/lib/ai/callAI'

const PreviewSchema = z.object({
  nome: z.string().min(2),
  tipoCozinha: z.string().min(2),
  tom: z.enum(['storytelling', 'elegante', 'provocativo', 'tecnico']),
  palavrasEvitar: z.array(z.string()).default([]),
})

const TOM_DESC: Record<string, string> = {
  storytelling: 'narrativo e emocional, conta histórias sobre o lugar e as pessoas',
  elegante:     'sofisticado, conciso e de alto impacto — menos é mais',
  provocativo:  'intrigante, faz o leitor querer saber mais',
  tecnico:      'destaca técnica culinária, ingredientes e processo de preparo',
}

export async function POST(request: Request) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    // Validar
    const body = await request.json()
    const parsed = PreviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
    }
    const { nome, tipoCozinha, tom, palavrasEvitar } = parsed.data

    // Verificar chave Groq
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('sua_chave')) {
      return NextResponse.json(
        { erro: 'GROQ_API_KEY não configurada.' },
        { status: 503 }
      )
    }

    // Gerar prévia (FAST = rápido para onboarding)
    // Usamos restaurantId fictício pois ainda não foi criado
    const resultado = await callAI({
      model: MODELS.FAST,
      system: `Você é especialista em marketing gastronômico para restaurantes brasileiros de alto padrão.
Crie um caption autêntico e envolvente para o Instagram.
Restaurante: ${nome} — Cozinha ${tipoCozinha}.
Tom: ${TOM_DESC[tom]}.
${palavrasEvitar.length ? `Palavras a evitar: ${palavrasEvitar.join(', ')}.` : ''}
Regras: máximo 120 palavras, máximo 2 emojis, sem hashtags, sem clichês.
Retorne APENAS o texto do caption, sem aspas, sem prefixos.`,
      prompt: `Crie 1 caption de apresentação do restaurante ${nome} para o Instagram.
Deve capturar a essência da marca logo na primeira impressão.`,
      restaurantId: 'onboarding-preview',
      contentType: 'caption_preview',
      promptVersion: 'onboarding-v1',
      maxTokens: 256,
    })

    return NextResponse.json({ preview: resultado.content.trim() })

  } catch (error) {
    console.error('[API /onboarding/preview-caption]', error)
    return NextResponse.json({ erro: 'Não foi possível gerar a prévia.' }, { status: 500 })
  }
}
