// Wrapper de IA do AUROS MKT — Vercel AI SDK + Groq
// Loga automaticamente em ai_corpus_logs para análise e fine-tuning
import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Modelos disponíveis ───────────────────────────────────────────────────
// Groq usa chips LPU próprios — os mais rápidos do mercado
export const MODELS = {
  // Volume: captions, classificações, rascunhos — ultra rápido e barato
  FAST: 'gemma2-9b-it',

  // Qualidade: reviews, campanhas, brand voice — melhor custo-benefício
  SMART: 'llama-3.3-70b-versatile',

  // Premium: orquestração complexa, agentes, decisões críticas
  PREMIUM: 'llama-3.3-70b-versatile',
} as const

export type AurosModel = (typeof MODELS)[keyof typeof MODELS]

interface CallAIParams {
  model: AurosModel
  system?: string
  prompt: string
  restaurantId: string
  contentType: string
  promptVersion: string
  metadata?: Record<string, unknown>
  maxTokens?: number
}

interface CallAIResult {
  content: string
  inputTokens: number
  outputTokens: number
}

export async function callAI({
  model,
  system,
  prompt,
  restaurantId,
  contentType,
  promptVersion,
  metadata = {},
  maxTokens = 1024,
}: CallAIParams): Promise<CallAIResult> {
  // Inicializar cliente Groq
  const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
  })

  // Chamar a API via Vercel AI SDK + Groq provider
  const { text, usage } = await generateText({
    model: groq(model),
    system,
    messages: [{ role: 'user', content: prompt }],
    maxOutputTokens: maxTokens,
  })

  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0

  // Salvar no corpus — nunca deve bloquear a resposta principal
  try {
    const supabase = createAdminClient()
    await supabase.from('ai_corpus_logs').insert({
      restaurant_id: restaurantId,
      model,
      prompt_version: promptVersion,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      content_type: contentType,
      metadata: {
        ...metadata,
        prompt_preview: prompt.slice(0, 200),
      },
    })
  } catch (err) {
    console.error('[callAI] Erro ao salvar corpus log:', err)
  }

  return { content: text, inputTokens, outputTokens }
}
