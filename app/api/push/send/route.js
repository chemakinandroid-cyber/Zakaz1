import webpush from 'web-push'
import { getServerSupabase } from '@/lib/serverSupabase'

webpush.setVapidDetails(
  'mailto:admin@navirazhah.ru',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const STATUS_MESSAGES = {
  confirmed: {
    title: '✅ Заказ подтверждён!',
    body: 'Ваш заказ принят и готовится. Ждите!'
  },
  ready: {
    title: '🔔 Заказ готов!',
    body: 'Ваш заказ готов к выдаче. Подходите!'
  },
}

// POST /api/push/send — отправляем push клиенту по order_id
export async function POST(req) {
  try {
    const { order_id, status } = await req.json()
    if (!order_id || !status) return Response.json({ error: 'Нет order_id или status' }, { status: 400 })

    const message = STATUS_MESSAGES[status]
    if (!message) return Response.json({ success: true, skipped: true }) // Статус не требует push

    const supabase = getServerSupabase()

    // Получаем подписку и данные заказа
    const [{ data: subRow }, { data: order }] = await Promise.all([
      supabase.from('push_subscriptions').select('subscription').eq('order_id', order_id).maybeSingle(),
      supabase.from('orders').select('short_number').eq('id', order_id).maybeSingle(),
    ])

    if (!subRow?.subscription) return Response.json({ success: true, skipped: 'no subscription' })

    const num = order?.short_number || ''
    const subscription = JSON.parse(subRow.subscription)

    await webpush.sendNotification(subscription, JSON.stringify({
      title: message.title,
      body: `Заказ ${num} — ${message.body}`,
      tag: `order-${order_id}-${status}`,
      url: `/order?number=${num}`,
    }))

    return Response.json({ success: true })
  } catch (e) {
    console.error('Push send error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
