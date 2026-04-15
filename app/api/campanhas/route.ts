import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// ─── GET: listar campanhas ────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: restaurante } = await admin
      .from('restaurants').select('id').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    const { data: campanhas } = await admin
      .from('campaigns')
      .select('id, name, segment, channel, status, scheduled_at, sent_count, created_at')
      .eq('restaurant_id', restaurante.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ campanhas: campanhas ?? [] })
  } catch (error) {
    console.error('[API GET /campanhas]', error)
    return NextResponse.json({ erro: 'Erro ao buscar campanhas.' }, { status: 500 })
  }
}

// ─── POST: criar campanha ─────────────────────────────────────────────────────
const CampanhaSchema = z.object({
  name: z.string().min(2).max(100),
  segment: z.enum(['aniversariante_mes', 'inativo_60d', 'vip', 'novo', 'recorrente', 'todos']),
  channel: z.enum(['email', 'whatsapp', 'sms']),
  template: z.string().min(10).max(2000),
  scheduled_at: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = CampanhaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const { name, segment, channel, template, scheduled_at } = parsed.data

    const admin = createAdminClient()
    const { data: restaurante } = await admin
      .from('restaurants').select('id').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    // Criar campanha
    const status = scheduled_at ? 'scheduled' : 'draft'
    const { data: campanha, error } = await admin
      .from('campaigns')
      .insert({
        restaurant_id: restaurante.id,
        name, segment, channel, template, status,
        scheduled_at: scheduled_at ?? null,
      })
      .select('id, name, segment, channel, status, scheduled_at, sent_count, created_at')
      .single()
    if (error) throw error

    // Registrar em generated_contents
    await admin.from('generated_contents').insert({
      restaurant_id: restaurante.id,
      type: 'campaign',
      content: template,
      model_used: 'llama-3.3-70b-versatile',
      prompt_version: 'campaign-v1',
    })

    return NextResponse.json({ campanha }, { status: 201 })
  } catch (error) {
    console.error('[API POST /campanhas]', error)
    return NextResponse.json({ erro: 'Erro ao criar campanha.' }, { status: 500 })
  }
}
