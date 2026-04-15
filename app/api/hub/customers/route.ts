import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// ─── GET: buscar clientes com filtro opcional ─────────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    const admin = createAdminClient()
    const { data: restaurante } = await admin
      .from('restaurants').select('id').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    let query = admin
      .from('customers')
      .select('id, name, email, phone, birthday, notes, created_at, visits(visited_at, avg_ticket)')
      .eq('restaurant_id', restaurante.id)
      .order('name')
      .limit(100)

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: customers, error } = await query
    if (error) throw error

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('[API GET /hub/customers]', error)
    return NextResponse.json({ erro: 'Erro ao buscar clientes.' }, { status: 500 })
  }
}

// ─── POST: criar novo cliente ─────────────────────────────────────────────────
const NovoClienteSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().min(8, 'Telefone inválido').max(20).optional().or(z.literal('')),
  birthday: z.string().optional().or(z.literal('')), // ISO date YYYY-MM-DD
  notes: z.string().max(500).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = NovoClienteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const { name, email, phone, birthday, notes } = parsed.data

    const admin = createAdminClient()
    const { data: restaurante } = await admin
      .from('restaurants').select('id').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    const { data: customer, error } = await admin
      .from('customers')
      .insert({
        restaurant_id: restaurante.id,
        name,
        email: email || null,
        phone: phone || null,
        birthday: birthday || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .select('id, name, email, phone, birthday, notes, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error('[API POST /hub/customers]', error)
    return NextResponse.json({ erro: 'Erro ao criar cliente.' }, { status: 500 })
  }
}
