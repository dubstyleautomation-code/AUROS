import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const segment = searchParams.get('segment')

    const admin = createAdminClient()
    const { data: restaurante } = await admin
      .from('restaurants').select('id').eq('owner_id', user.id).single()
    if (!restaurante) return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })

    const rid = restaurante.id

    let count = 0

    if (segment === 'todos') {
      const { count: c } = await admin
        .from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid)
      count = c ?? 0

    } else if (segment === 'novo') {
      // Clientes sem nenhuma visita
      const { data: todos } = await admin
        .from('customers').select('id').eq('restaurant_id', rid)
      const { data: comVisita } = await admin
        .from('visits').select('customer_id').eq('restaurant_id', rid)
      const comVisitaIds = new Set(comVisita?.map(v => v.customer_id) ?? [])
      count = (todos ?? []).filter(c => !comVisitaIds.has(c.id)).length

    } else if (segment === 'aniversariante_mes') {
      const mes = String(new Date().getMonth() + 1).padStart(2, '0')
      const { count: c } = await admin
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', rid)
        .ilike('birthday', `%-${mes}-%`)
      count = c ?? 0

    } else if (segment === 'inativo_60d') {
      const limite = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const { data: todos } = await admin
        .from('customers').select('id').eq('restaurant_id', rid)
      const { data: ativos } = await admin
        .from('visits').select('customer_id').eq('restaurant_id', rid).gte('visited_at', limite)
      const ativosIds = new Set(ativos?.map(v => v.customer_id) ?? [])
      count = (todos ?? []).filter(c => !ativosIds.has(c.id)).length

    } else {
      // vip e recorrente: aproximar com total de clientes com visitas
      const { count: c } = await admin
        .from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid)
      count = Math.floor((c ?? 0) * (segment === 'vip' ? 0.2 : 0.5))
    }

    return NextResponse.json({ count })
  } catch (error) {
    console.error('[API /campanhas/segmento-count]', error)
    return NextResponse.json({ erro: 'Erro ao contar.' }, { status: 500 })
  }
}
