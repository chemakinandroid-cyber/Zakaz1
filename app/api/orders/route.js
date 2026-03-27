import { getServerSupabase } from '@/lib/serverSupabase'

const MAX_ACTIVE_ORDERS = 10
const ACTIVE_STATUSES = ['new', 'confirmed', 'preparing', 'ready']

export async function POST(req) {
  try {
    const body = await req.json()
    const supabase = getServerSupabase()

    const branch_id = String(body.branch_id || '').trim()
    if (!branch_id) return Response.json({ error: 'branch_id обязателен' }, { status: 400 })

    const customer_name = String(body.customer_name || '').trim()
    const customer_phone = String(body.customer_phone || '').trim()
    if (!customer_name) return Response.json({ error: 'Укажите имя' }, { status: 400 })
    if (!customer_phone) return Response.json({ error: 'Укажите телефон' }, { status: 400 })

    if (!Array.isArray(body.items) || !body.items.length) {
      return Response.json({ error: 'Корзина пуста' }, { status: 400 })
    }

    // Проверяем лимит активных заказов
    const { count: activeCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branch_id)
      .in('status', ACTIVE_STATUSES)

    if (activeCount >= MAX_ACTIVE_ORDERS) {
      return Response.json(
        { error: 'Точка временно перегружена. Попробуйте через несколько минут.' },
        { status: 429 }
      )
    }

    // Загружаем меню
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price, branch_ids, category, variant, coming_soon')

    if (menuError) return Response.json({ error: 'Ошибка загрузки меню' }, { status: 500 })

    // Стоп-лист
    const { data: stopList } = await supabase
      .from('stop_list')
      .select('menu_item_id')
      .eq('branch_id', branch_id)
      .eq('is_stopped', true)

    const stoppedIds = new Set((stopList || []).map((r) => r.menu_item_id))
    const menuById = Object.fromEntries((menuItems || []).map((m) => [m.id, m]))

    // Валидируем и считаем
    let total = 0
    const orderItems = []

    for (const entry of body.items) {
      const menu = menuById[entry.id]
      if (!menu) return Response.json({ error: `Товар не найден` }, { status: 400 })
      if (menu.coming_soon) return Response.json({ error: `"${menu.name}" ещё не в продаже` }, { status: 400 })
      if (stoppedIds.has(menu.id)) return Response.json({ error: `"${menu.name}" временно недоступен` }, { status: 400 })
      if (Array.isArray(menu.branch_ids) && menu.branch_ids.length > 0 && !menu.branch_ids.includes(branch_id)) {
        return Response.json({ error: `"${menu.name}" недоступен для этой точки` }, { status: 400 })
      }

      const qty = Math.max(1, Math.floor(Number(entry.qty || entry.quantity) || 1))
      const price = Number(menu.price || 0)
      const lineTotal = price * qty
      total += lineTotal

      orderItems.push({ item_id: menu.id, item_name: menu.name, price, quantity: qty, line_total: lineTotal })
    }

    // Атомарный номер через RPC (если функция создана), иначе fallback
    let shortNumber
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('next_order_number', { p_branch_id: branch_id })

    if (!rpcError && rpcResult) {
      shortNumber = String(rpcResult).padStart(4, '0')
    } else {
      // Fallback: читаем + инкрементируем вручную
      const { data: counter } = await supabase
        .from('order_counters')
        .select('last_number')
        .eq('branch_id', branch_id)
        .maybeSingle()

      const nextNum = (Number(counter?.last_number) || 0) + 1
      shortNumber = String(nextNum).padStart(4, '0')

      await supabase
        .from('order_counters')
        .upsert({ branch_id, last_number: nextNum }, { onConflict: 'branch_id' })
    }

    const order_number = `${branch_id}-${shortNumber}`

    // Создаём заказ
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        branch_id,
        order_number,
        short_number: shortNumber,
        status: 'new',
        total,
        customer_name,
        customer_phone,
        comment: String(body.comment || '').trim() || null,
      }])
      .select()
      .single()

    if (orderError) return Response.json({ error: orderError.message }, { status: 500 })

    // Позиции заказа
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })))

    if (itemsError) return Response.json({ error: itemsError.message }, { status: 500 })

    return Response.json({ success: true, order, short_number: order.short_number })
  } catch (e) {
    console.error('POST /api/orders error:', e)
    return Response.json({ error: e.message || 'Ошибка сервера' }, { status: 500 })
  }
}
