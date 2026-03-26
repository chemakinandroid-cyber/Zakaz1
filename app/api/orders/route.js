import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const body = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const branch_id = body.branch_id // ❗ НИКАКИХ Number()

    if (!branch_id) {
      return Response.json({ error: 'branch_id обязателен' }, { status: 400 })
    }

    if (!body.items || !body.items.length) {
      return Response.json({ error: 'Нет позиций' }, { status: 400 })
    }

    // 🔹 Получаем меню
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')

    if (menuError) {
      return Response.json({ error: 'Ошибка загрузки меню' }, { status: 500 })
    }

    // 🔹 Проверяем стоп-лист (теперь тоже TEXT!)
    const { data: stopList } = await supabase
      .from('stop_list')
      .select('menu_item_id, is_stopped')
      .eq('branch_id', branch_id)

    const stoppedIds = new Set(
      (stopList || [])
        .filter((i) => i.is_stopped)
        .map((i) => i.menu_item_id)
    )

    // 🔹 Собираем заказ
    let total = 0

    const items = body.items.map((i) => {
      const menu = menuItems.find((m) => m.id === i.id)

      if (!menu) throw new Error('Товар не найден')

      if (stoppedIds.has(menu.id)) {
        throw new Error(`"${menu.name}" в стопе`)
      }

      const lineTotal = menu.price * i.quantity
      total += lineTotal

      return {
        item_id: menu.id,
        item_name: menu.name,
        price: menu.price,
        quantity: i.quantity,
        line_total: lineTotal,
      }
    })

    // 🔹 Создаем заказ
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          branch_id,
          customer_name: body.customer_name,
          customer_phone: body.customer_phone,
          comment: body.comment,
          total,
        },
      ])
      .select()
      .single()

    if (orderError) {
      return Response.json({ error: orderError.message }, { status: 500 })
    }

    // 🔹 Добавляем позиции
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
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
