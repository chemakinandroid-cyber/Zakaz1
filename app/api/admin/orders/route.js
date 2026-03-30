import { getServerSupabase } from '@/lib/serverSupabase'

const ACTIVE_STATUSES = ['new', 'confirmed', 'preparing', 'ready']

// GET /api/admin/orders?branch_id=nv-fr-002
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const branch_id = searchParams.get('branch_id')

    const supabase = getServerSupabase()

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (branch_id) query = query.eq('branch_id', branch_id)

    const { data: orders, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Загружаем позиции для активных заказов
    const activeIds = (orders || [])
      .filter((o) => ACTIVE_STATUSES.includes(o.status))
      .map((o) => o.id)

    let itemsMap = {}
    if (activeIds.length) {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', activeIds)

      for (const item of items || []) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = []
        itemsMap[item.order_id].push(item)
      }
    }

    // Загружаем отзывы для выданных заказов
    const doneIds = (orders || [])
      .filter(o => o.status === 'completed')
      .map(o => o.id)

    let reviewsMap = {}
    if (doneIds.length) {
      const { data: reviews } = await supabase
        .from('order_reviews')
        .select('order_id, rating, comment')
        .in('order_id', doneIds)

      for (const r of reviews || []) {
        reviewsMap[r.order_id] = r
      }
    }

    // Добавляем rating прямо в объект заказа
    const ordersWithReviews = (orders || []).map(o => ({
      ...o,
      review_rating: reviewsMap[o.id]?.rating || null,
      review_comment: reviewsMap[o.id]?.comment || null,
    }))

    return Response.json({ orders: ordersWithReviews, itemsMap })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/admin/orders — смена статуса
export async function PATCH(req) {
  try {
    const { id, status } = await req.json()

    const allowed = ['new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'expired']
    if (!id) return Response.json({ error: 'id обязателен' }, { status: 400 })
    if (!allowed.includes(status)) return Response.json({ error: 'Недопустимый статус' }, { status: 400 })

    const supabase = getServerSupabase()
    const patch = { status }
    if (status === 'confirmed') patch.is_confirmed = true

    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ order: data })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
