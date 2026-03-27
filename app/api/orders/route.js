import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const body = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const branch_id = String(body.branch_id || '').trim()

    if (!branch_id) {
      return Response.json({ error: 'branch_id обязателен' }, { status: 400 })
    }

    if (!body.items || !body.items.length) {
      return Response.json({ error: 'Нет позиций' }, { status: 400 })
    }

    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')

    if (menuError) {
      return Response.json({ error: `Ошибка загрузки меню: ${menuError.message}` }, { status: 500 })
    }

    const { data: stopList, error: stopError } = await supabase
      .from('stop_list')
      .select('menu_item_id, is_stopped')
      .eq('branch_id', branch_id)

    if (stopError) {
      return Response.json({ error: `Ошибка проверки стоп-листа: ${stopError.message}` }, { status: 500 })
    }

    const stoppedIds = new Set(
      (stopList || [])
        .filter((i) => i.is_stopped)
        .map((i) => i.menu_item_id)
    )

    let total = 0

    const items = body.items.map((i) => {
      const menu = menuItems.find((m) => m.id === i.id)

      if (!menu) throw new Error('Товар не найден')

      if (Array.isArray(menu.branch_ids) && menu.branch_ids.length > 0 && !menu.branch_ids.includes(branch_id)) {
        throw new Error(`"${menu.name}" недоступен для выбранной точки`)
      }

      if (stoppedIds.has(menu.id)) {
        throw new Error(`"${menu.name}" в стопе`)
      }

      const quantity = Math.max(1, Number(i.quantity || 1))
      const price = Number(menu.price || 0)
      const lineTotal = price * quantity
      total += lineTotal

      return {
        item_id: menu.id,
        item_name: menu.name,
        price,
        quantity,
        line_total: lineTotal,
      }
    })

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          branch_id,
          customer_name: body.customer_name || null,
          customer_phone: body.customer_phone || null,
          comment: body.comment || null,
          total,
        },
      ])
      .select()
      .single()

    if (orderError) {
      return Response.json({ error: orderError.message }, { status: 500 })
    }

    const itemsToInsert = items.map((i) => ({
      ...i,
      order_id: order.id,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      return Response.json({ error: itemsError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      order,
      short_number: order.short_number,
      order_number: order.order_number,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
