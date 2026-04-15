import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const admin = createAdminClient()

    // Verificar que o cliente pertence ao restaurante do usuário
    const { data: restaurante } = await admin
      .from('restaurants').select('id').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    const { data: customer } = await admin
      .from('customers').select('id').eq('id', id).eq('restaurant_id', restaurante.id).maybeSingle()
    if (!customer) return NextResponse.json({ erro: 'Cliente não encontrado' }, { status: 404 })

    const { data: visits } = await admin
      .from('visits')
      .select('id, visited_at, party_size, avg_ticket, notes')
      .eq('customer_id', id)
      .order('visited_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ visits: visits ?? [] })
  } catch (error) {
    console.error('[API GET /hub/customers/[id]/visits]', error)
    return NextResponse.json({ erro: 'Erro ao buscar visitas.' }, { status: 500 })
  }
}
