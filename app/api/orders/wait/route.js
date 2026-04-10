export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

// Реальное время приготовления — один повар, последовательно
const COOK_TIME = {
  shawarma: 7, burgers: 8, hotdogs: 7,
  quesadilla: 6, fries: 5, shashlik: 50,
  sauces: 0, drinks: 0, shawarma_addons: 0, other: 5,
}
// Время на каждую следующую единицу той же категории
const REPEAT_TIME = {
  shawarma: 6, burgers: 7, hotdogs: 5,
  quesadilla: 5, fries: 2, shashlik: 15, other: 4,
}

function normCat(c) {
  const r = String(c||'').trim().toLowerCase()
  return r === 'fryer' ? 'fries' : r || 'other'
}

function calcOrderCookTime(items) {
  if (!items?.length) return 8
  const cats = {}
  for (const item of items) {
    const cat = normCat(item.category)
    if (!cats[cat]) cats[cat] = 0
    cats[cat] += (item.quantity || 1)
  }
  let total = 0
  for (const [cat, qty] of Object.entries(cats)) {
    const base = COOK_TIME[cat] ?? COOK_TIME.other
    const repeat = REPEAT_TIME[cat] ?? REPEAT_TIME.other
    if (base === 0) continue
    total += base + Math.max(0, qty - 1) * repeat
  }
  return Math.max(5, total)
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const order_id = searchParams.get('order_id')
    if (!order_id) return Response.json({ wait_minutes: null })

    const supabase = getServerSupabase()
    const { data: order } = await supabase
      .from('orders').select('branch_id, status, created_at')
      .eq('id', order_id).maybeSingle()

    if (!order || ['completed','cancelled','expired','ready'].includes(order.status)) {
      return Response.json({ wait_minutes: null })
    }

    const { data: orderItems } = await supabase
      .from('order_items').select('quantity, item_id').eq('order_id', order_id)

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

    const thisOrderTime = calcOrderCookTime(itemsWithCat)

    const { data: aheadOrders } = await supabase
      .from('orders').select('id, created_at, status')
      .eq('branch_id', order.branch_id)
      .in('status', ['new','confirmed','preparing'])
      .neq('id', order_id)
      .lt('created_at', order.created_at)
      .order('created_at', { ascending: true })

    let queueTime = 0
    for (const ahead of (aheadOrders || [])) {
      const elapsed = Math.floor((Date.now() - new Date(ahead.created_at)) / 60000)
      queueTime += ahead.status === 'preparing' ? Math.max(2, 8 - elapsed) : 8
    }

    const elapsedMin = Math.floor((Date.now() - new Date(order.created_at)) / 60000)
    const remaining = Math.max(1, thisOrderTime + queueTime - elapsedMin)
    const hasShashlik = itemsWithCat.some(i => normCat(i.category) === 'shashlik')

    return Response.json({ wait_minutes: remaining, has_shashlik: hasShashlik, order_cook_time: thisOrderTime })
  } catch (e) {
    return Response.json({ wait_minutes: null })
  }
}
