import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CampanhasClient from './CampanhasClient'

export default async function CampanhasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: restaurante } = await admin
    .from('restaurants').select('id, name').eq('owner_id', user.id).single()

  if (!restaurante) redirect('/onboarding')

  const { data: campanhas } = await admin
    .from('campaigns')
    .select('id, name, segment, channel, status, scheduled_at, sent_count, created_at')
    .eq('restaurant_id', restaurante.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <CampanhasClient
      initialCampanhas={(campanhas ?? []) as any[]}
      restaurantName={restaurante.name}
    />
  )
}
