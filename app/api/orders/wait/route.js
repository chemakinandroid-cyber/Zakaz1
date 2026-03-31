export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

// Время приготовления по категории (минуты)
const COOK_TIME = {
  shawarma: 5,
  burgers: 6,
  hotdogs: 4,
  quesadilla: 5,
  fries: 5,
  shashlik: 50,  // шашлык готовится долго
  sauces: 0,
  drinks: 0,
  shawarma_addons: 0,
  other: 3,
}

function normCat(c) {
  const r = String(c||'').trim().toLowerCase()
  return r === 'fryer' ? 'fries' : r || 'other'
}

// Считаем время приготовления одного заказа по его составу
function calcOrderTime(items) {
  if (!items?.length) return 7 // базовое если нет данных

  // Берём максимальное время из всех категорий (готовятся параллельно)
  const cats = new Set(items.map(i => normCat(i.category)))
  let maxTime = 0
  for (const cat of cats) {
    const t = COOK_TIME[cat] ?? COOK_TIME.other
    if (t > maxTime) maxTime = t
  }

  // Если много позиций — добавляем немного времени
  const itemCount = items.reduce((s, i) => s + (i.quantity || 1), 0)
  const complexity = itemCount > 3 ? 3 : itemCount > 1 ? 1 : 0

  return maxTime + complexity
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const order_id = searchParams.get('order_id')
    if (!order_id) return Response.json({ wait_minutes: null })

    const supabase = getServerSupabase()

    // Получаем заказ и его состав
    const [{ data: order }, { data: orderItems }] = await Promise.all([
      supabase.from('orders').select('branch_id, status, created_at').eq('id', order_id).maybeSingle(),
      supabase.from('order_items').select('quantity, menu_item_id, item_name').eq('order_id', order_id),
    ])

    // Получаем категории через menu_items
    let itemsWithCat = orderItems || []
    if (itemsWithCat.length) {
      const menuIds = [...new Set(itemsWithCat.map(i => i.menu_item_id).filter(Boolean))]
      if (menuIds.length) {
        const { data: menuRows } = await supabase
          .from('menu_items').select('id, category').in('id', menuIds)
        const catMap = Object.fromEntries((menuRows||[]).map(r => [r.id, r.category]))
        itemsWithCat = itemsWithCat.map(i => ({ ...i, category: catMap[i.menu_item_id] || 'other' }))
      }
    }

    if (!order || ['completed', 'cancelled', 'expired', 'ready'].includes(order.status)) {
      return Response.json({ wait_minutes: null })
    }

    // Время на этот заказ
    const thisOrderTime = calcOrderTime(itemsWithCat)

    // Заказы в очереди ПЕРЕД этим (созданные раньше)
    const { data: aheadOrders } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('branch_id', order.branch_id)
      .in('status', ['new', 'confirmed', 'preparing'])
      .neq('id', order_id)
      .lt('created_at', order.created_at)

    // Суммируем время ожидания очереди
    let queueTime = 0
    if (aheadOrders?.length) {
      // Для каждого заказа в очереди берём базовые 7 мин (без состава для скорости)
      // Вычитаем уже потраченное время на них
      for (const ahead of aheadOrders) {
        const aheadElapsed = Math.floor((Date.now() - new Date(ahead.created_at)) / 60000)
        const aheadRemaining = Math.max(0, 7 - aheadElapsed)
        queueTime += aheadRemaining
      }
    }

    // Время уже потраченное на этот заказ
    const elapsedMin = Math.floor((Date.now() - new Date(order.created_at)) / 60000)
    const remaining = Math.max(1, thisOrderTime + queueTime - elapsedMin)

    // Есть ли шашлык? Предупреждаем отдельно
    const hasShashlik = itemsWithCat.some(i => normCat(i.category) === 'shashlik')

    return Response.json({
      wait_minutes: remaining,
      has_shashlik: hasShashlik,
      order_time: thisOrderTime,
    })
  } catch (e) {
    return Response.json({ wait_minutes: null })
  }
}
