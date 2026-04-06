export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

const BASE_TIME = {
  shawarma: 5, burgers: 6, hotdogs: 4, quesadilla: 6,
  fries: 4, shashlik: 50, sauces: 0, drinks: 0,
  shawarma_addons: 0, other: 4,
}

function normCat(c) {
  const r = String(c||'').trim().toLowerCase()
  return r === 'fryer' ? 'fries' : r || 'other'
}

function calcCookTime(items) {
  if (!items?.length) return 7
  const cats = {}
  for (const item of items) {
    const cat = normCat(item.category)
    if (!cats[cat]) cats[cat] = 0
    cats[cat] += (item.qty || item.quantity || 1)
  }
  let maxTime = 0
  for (const [cat, qty] of Object.entries(cats)) {
    const base = BASE_TIME[cat] ?? BASE_TIME.other
    const t = base + Math.max(0, qty - 1)
    if (t > maxTime) maxTime = t
  }
  const catCount = Object.keys(cats).filter(c => (BASE_TIME[c] ?? 0) > 0).length
  const complexity = catCount >= 3 ? 3 : catCount === 2 ? 1 : 0
  const totalItems = items.reduce((s, i) => s + (i.qty || i.quantity || 1), 0)
  const volumeBonus = totalItems >= 5 ? 3 : totalItems >= 3 ? 1 : 0
  return maxTime + complexity + volumeBonus
}

// POST /api/orders/estimate
// Body: { branch_id, items: [{id, qty}] }
// Returns: { wait_minutes, has_shashlik, queue_length }
export async function POST(req) {
  try {
    const { branch_id, items } = await req.json()
    if (!branch_id || !items?.length) return Response.json({ wait_minutes: 7 })

    const supabase = getServerSupabase()

    // Получаем категории товаров
    const itemIds = [...new Set(items.map(i => i.id).filter(Boolean))]
    const { data: menuRows } = await supabase
      .from('menu_items').select('id, category').in('id', itemIds)
    const catMap = Object.fromEntries((menuRows||[]).map(r => [r.id, r.category]))

    const itemsWithCat = items.map(i => ({
      ...i,
      category: catMap[i.id] || 'other',
      quantity: i.qty || 1,
    }))

    // Время приготовления этого заказа
    const cookTime = calcCookTime(itemsWithCat)

    // Очередь в этой точке
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id, created_at, status')
      .eq('branch_id', branch_id)
      .in('status', ['new', 'confirmed', 'preparing'])
      .order('created_at', { ascending: true })

    let queueTime = 0
    for (const ahead of (activeOrders || [])) {
      const elapsed = Math.floor((Date.now() - new Date(ahead.created_at)) / 60000)
      if (ahead.status === 'preparing') {
        queueTime += Math.max(0, 7 - elapsed)
      } else {
        queueTime += Math.max(0, 7 - Math.floor(elapsed / 2))
      }
    }

    const total = cookTime + queueTime
    const hasShashlik = itemsWithCat.some(i => normCat(i.category) === 'shashlik')

    return Response.json({
      wait_minutes: Math.max(1, total),
      has_shashlik: hasShashlik,
      queue_length: activeOrders?.length || 0,
      cook_time: cookTime,
    })
  } catch (e) {
    return Response.json({ wait_minutes: 7 })
  }
}
