import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  reviewId: z.string().uuid(),
  resposta: z.string().min(1).max(2000),
})

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
    const { reviewId, resposta } = parsed.data

    const admin = createAdminClient()

    // Verificar pertencimento antes de atualizar
    const { data: restaurante } = await admin
      .from('restaurants').select('id').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    const { error } = await admin
      .from('reviews')
      .update({
        response: resposta,
        responded_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('restaurant_id', restaurante.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API PATCH /avaliacoes/salvar]', error)
    return NextResponse.json({ erro: 'Erro ao salvar resposta.' }, { status: 500 })
  }
}
