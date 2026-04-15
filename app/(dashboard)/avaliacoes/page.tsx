import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AvaliacoesClient from './AvaliacoesClient'

export default async function AvaliacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: restaurante } = await admin
    .from('restaurants').select('id, name').eq('owner_id', user.id).single()

  if (!restaurante) redirect('/onboarding')

  const { data: reviews } = await admin
    .from('reviews')
    .select('id, platform, rating, content, reviewer_name, created_at, responded_at, response')
    .eq('restaurant_id', restaurante.id)
    .order('rating', { ascending: true })
    .order('responded_at', { ascending: true, nullsFirst: true })

  return (
    <AvaliacoesClient
      initialReviews={reviews ?? []}
      restaurantName={restaurante.name}
    />
  )
}
