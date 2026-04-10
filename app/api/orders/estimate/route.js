export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

const COOK_TIME = {
  shawarma: 7, burgers: 8, hotdogs: 7,
  quesadilla: 6, fries: 5, shashlik: 50,
  sauces: 0, drinks: 0, shawarma_addons: 0, other: 5,
}
const REPEAT_TIME = {
  shawarma: 6, burgers: 7, hotdogs: 5,
  quesadilla: 5, fries: 2, shashlik: 15, other: 4,
}

function normCat(c) {
  const r = String(c||'').trim().toLowerCase()
  return r === 'fryer' ? 'fries' : r || 'other'
}

function calcCookTime(items) {
  if (!items?.length) return 8
  const cats = {}
  for (const item of items) {
    const cat = normCat(item.category)
    if (!cats[cat]) cats[cat] = 0
    cats[cat] += (item.qty || item.quantity || 1)
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

export async function POST(req) {
  try {
    const { branch_id, items } = await req.json()
    if (!branch_id || !items?.length) return Response.json({ wait_minutes: 8 })

    const supabase = getServerSupabase()
    const itemIds = [...new Set(items.map(i => i.id).filter(Boolean))]
    const { data: menuRows } = await supabase
      .from('menu_items').select('id, category').in('id', itemIds)
    const catMap = Object.fromEntries((menuRows||[]).map(r => [r.id, r.category]))
    const itemsWithCat = items.map(i => ({ ...i, category: catMap[i.id] || 'other', quantity: i.qty || 1 }))

    const cookTime = calcCookTime(itemsWithCat)

    const { data: activeOrders } = await supabase
      .from('orders').select('id, created_at, status')
      .eq('branch_id', branch_id)
      .in('status', ['new','confirmed','preparing'])
      .order('created_at', { ascending: true })

    let queueTime = 0
    for (const ahead of (activeOrders || [])) {
      const elapsed = Math.floor((Date.now() - new Date(ahead.created_at)) / 60000)
      queueTime += ahead.status === 'preparing' ? Math.max(2, 8 - elapsed) : 8
    }

    const hasShashlik = itemsWithCat.some(i => normCat(i.category) === 'shashlik')

    return Response.json({
      wait_minutes: Math.max(1, cookTime + queueTime),
      has_shashlik: hasShashlik,
      queue_length: activeOrders?.length || 0,
      cook_time: cookTime,
    })
  } catch (e) {
    return Response.json({ wait_minutes: 8 })
  }
}
