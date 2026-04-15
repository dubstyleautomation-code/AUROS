import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const SetupSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(100),
  tipoCozinha: z.string().min(2),
  tom: z.enum(['storytelling', 'elegante', 'provocativo', 'tecnico']),
  palavrasEvitar: z.array(z.string()).max(20).default([]),
  hashtags: z.array(z.string()).max(15).default([]),
})

// Gera slug único a partir do nome
function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function POST(request: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    // 2. Validar input
    const body = await request.json()
    const parsed = SetupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }
    const { nome, tipoCozinha, tom, palavrasEvitar, hashtags } = parsed.data

    const admin = createAdminClient()

    // 3. Verificar se já tem restaurante
    const { data: existente } = await admin
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    let restaurantId: string

    if (existente) {
      // Atualizar nome
      await admin.from('restaurants').update({ name: nome }).eq('id', existente.id)
      restaurantId = existente.id
    } else {
      // Criar novo restaurante (slug com fallback para duplicatas)
      const slug = slugify(nome)
      const { data: novo, error } = await admin
        .from('restaurants')
        .insert({ name: nome, slug, owner_id: user.id, plan: 'starter' })
        .select('id')
        .single()

      if (error) {
        // Slug duplicado — adiciona sufixo aleatório
        const slugUnico = `${slug}-${Math.random().toString(36).slice(2, 6)}`
        const { data: novoB } = await admin
          .from('restaurants')
          .insert({ name: nome, slug: slugUnico, owner_id: user.id, plan: 'starter' })
          .select('id')
          .single()
        restaurantId = novoB!.id
      } else {
        restaurantId = novo!.id
      }
    }

    // 4. Upsert brand_context
    await admin.from('brand_contexts').upsert(
      {
        restaurant_id: restaurantId,
        tone: tom,
        avoid_words: palavrasEvitar,
        hashtags,
        personas: [{ cuisine_type: tipoCozinha }],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'restaurant_id' }
    )

    return NextResponse.json({ ok: true, restaurantId })

  } catch (error) {
    console.error('[API /onboarding/setup]', error)
    return NextResponse.json({ erro: 'Erro ao salvar configurações.' }, { status: 500 })
  }
}
