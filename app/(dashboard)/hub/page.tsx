import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import HubClient from './HubClient'

export default async function HubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: restaurante } = await admin
    .from('restaurants').select('id, name').eq('owner_id', user.id).single()

  if (!restaurante) redirect('/onboarding')

  // Carga inicial: clientes com visitas para segmentação
  const { data: customers } = await admin
    .from('customers')
    .select('id, name, email, phone, birthday, notes, created_at, visits(visited_at, avg_ticket)')
    .eq('restaurant_id', restaurante.id)
    .order('name')
    .limit(100)

  return (
    <HubClient
      initialCustomers={customers ?? []}
      restaurantId={restaurante.id}
    />
  )
}
