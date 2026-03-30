import { getServerSupabase } from '@/lib/serverSupabase'

// POST /api/push/subscribe — сохраняем подписку клиента
export async function POST(req) {
  try {
    const { subscription, order_id } = await req.json()
    if (!subscription?.endpoint) return Response.json({ error: 'Нет подписки' }, { status: 400 })
    if (!order_id) return Response.json({ error: 'Нет order_id' }, { status: 400 })

    const supabase = getServerSupabase()

    const { error } = await supabase.from('push_subscriptions').upsert({
      order_id,
      endpoint: subscription.endpoint,
      subscription: JSON.stringify(subscription),
      created_at: new Date().toISOString(),
    }, { onConflict: 'order_id' })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
