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

    return Response.json({ orders: orders || [], itemsMap })
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
