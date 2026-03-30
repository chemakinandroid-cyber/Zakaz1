import { getServerSupabase } from '@/lib/serverSupabase'

// POST — сохранить подписку
export async function POST(req) {
  try {
    const { subscription, branch_id } = await req.json()
    if (!subscription?.endpoint) return Response.json({ error: 'Нет подписки' }, { status: 400 })

    const supabase = getServerSupabase()
    await supabase.from('push_subscriptions').upsert({
      endpoint:  subscription.endpoint,
      p256dh:    subscription.keys.p256dh,
      auth:      subscription.keys.auth,
      branch_id: branch_id || null,
    }, { onConflict: 'endpoint' })

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — удалить подписку (отписка)
export async function DELETE(req) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) return Response.json({ error: 'Нет endpoint' }, { status: 400 })

    const supabase = getServerSupabase()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
