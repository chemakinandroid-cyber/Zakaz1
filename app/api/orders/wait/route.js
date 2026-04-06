export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

// Базовое время приготовления по категории (минуты)
const BASE_TIME = {
  shawarma: 5,
  burgers: 6,
  hotdogs: 4,
  quesadilla: 6,
  fries: 4,
  shashlik: 50,
  sauces: 0,
  drinks: 0,
  shawarma_addons: 0,
  other: 4,
}

function normCat(c) {
  const r = String(c||'').trim().toLowerCase()
  return r === 'fryer' ? 'fries' : r || 'other'
}

// Считаем время приготовления одного заказа
function calcOrderCookTime(items) {
  if (!items?.length) return 7

  // Группируем по категории
  const cats = {}
  for (const item of items) {
    const cat = normCat(item.category)
    if (!cats[cat]) cats[cat] = 0
    cats[cat] += (item.quantity || 1)
  }

  // Максимальное время из всех категорий (готовятся параллельно)
  let maxTime = 0
  for (const [cat, qty] of Object.entries(cats)) {
    const base = BASE_TIME[cat] ?? BASE_TIME.other
    // Каждая дополнительная единица одной категории +1 мин
    const t = base + Math.max(0, qty - 1)
    if (t > maxTime) maxTime = t
  }

  // Сложность заказа: много разных категорий = дольше
  const catCount = Object.keys(cats).filter(c => BASE_TIME[c] > 0).length
  const complexity = catCount >= 3 ? 3 : catCount === 2 ? 1 : 0

  // Общее количество позиций
  const totalItems = items.reduce((s, i) => s + (i.quantity || 1), 0)
  const volumeBonus = totalItems >= 5 ? 3 : totalItems >= 3 ? 1 : 0

  return maxTime + complexity + volumeBonus
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const order_id = searchParams.get('order_id')
    if (!order_id) return Response.json({ wait_minutes: null })

    const supabase = getServerSupabase()

    // Получаем заказ
    const { data: order } = await supabase
      .from('orders')
      .select('branch_id, status, created_at')
      .eq('id', order_id)
      .maybeSingle()

    if (!order || ['completed', 'cancelled', 'expired', 'ready'].includes(order.status)) {
      return Response.json({ wait_minutes: null })
    }

    // Получаем состав заказа с категориями
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('quantity, item_id, item_name')
      .eq('order_id', order_id)

    // Получаем категории через menu_items
    let itemsWithCat = orderItems || []
    if (itemsWithCat.length) {
      const menuIds = [...new Set(itemsWithCat.map(i => i.item_id).filter(Boolean))]
      if (menuIds.length) {
        const { data: menuRows } = await supabase
          .from('menu_items').select('id, category').in('id', menuIds)
        const catMap = Object.fromEntries((menuRows||[]).map(r => [r.id, r.category]))
        itemsWithCat = itemsWithCat.map(i => ({ ...i, category: catMap[i.item_id] || 'other' }))
      }
    }

    // Время приготовления этого заказа
    const thisOrderTime = calcOrderCookTime(itemsWithCat)

    // Получаем все активные заказы в этой точке
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id, created_at, status')
      .eq('branch_id', order.branch_id)
      .in('status', ['new', 'confirmed', 'preparing'])
      .neq('id', order_id)
      .order('created_at', { ascending: true })

    // Считаем время очереди
    // Заказы в статусе "preparing" уже готовятся — считаем сколько им осталось
    // Заказы "confirmed" и "new" ещё впереди
    let queueTime = 0
    for (const ahead of (activeOrders || [])) {
      const aheadElapsed = Math.floor((Date.now() - new Date(ahead.created_at)) / 60000)
      if (ahead.status === 'preparing') {
        // Уже готовится — осталось примерно половина базового времени
        const remaining = Math.max(0, 7 - aheadElapsed)
        queueTime += remaining
      } else {
        // Ещё не начали — добавляем базовое время
        queueTime += Math.max(0, 7 - Math.floor(aheadElapsed / 2))
      }
    }

    // Время уже потраченное на этот заказ
    const elapsedMin = Math.floor((Date.now() - new Date(order.created_at)) / 60000)
    const remaining = Math.max(1, thisOrderTime + queueTime - elapsedMin)

    const hasShashlik = itemsWithCat.some(i => normCat(i.category) === 'shashlik')

    return Response.json({
      wait_minutes: remaining,
      has_shashlik: hasShashlik,
      order_cook_time: thisOrderTime,
      queue_time: queueTime,
    })
  } catch (e) {
    return Response.json({ wait_minutes: null })
  }
}
