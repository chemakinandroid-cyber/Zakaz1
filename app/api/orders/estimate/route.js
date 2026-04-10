export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

const COOK_TIME = {
  shawarma: 7, burgers: 8, hotdogs: 7, quesadilla: 6, shashlik: 50,
  fries: 4, nuggets: 4, wings: 9, shrimp: 4, cheese_sticks: 4,
  sauces: 0, drinks: 0, shawarma_addons: 0, other: 0,
}

function normCat(c) {
  const r = String(c||'').trim().toLowerCase()
  return r === 'fryer' ? 'fries' : r || 'other'
}

function getFryerSubCat(itemId, itemName) {
  const n = (itemName||'').toLowerCase()
  if (n.includes('крыл')) return 'wings'
  if (n.includes('креветк')) return 'shrimp'
  if (n.includes('наггет')) return 'nuggets'
  if (n.includes('палочк')) return 'cheese_sticks'
  return 'fries'
}

function calcFryerTime(fryerItems) {
  if (!fryerItems.length) return 0
  const portions = []
  for (const item of fryerItems) {
    const t = COOK_TIME[item.subCat] || 4
    for (let i = 0; i < item.qty; i++) portions.push(t)
  }
  portions.sort((a,b) => b-a)
  let total = 0, i = 0
  while (i < portions.length) {
    total += Math.max(...portions.slice(i, i+4))
    i += 4
  }
  return total
}

function calcCookTime(items) {
  if (!items?.length) return 8
  const mainItems = [], fryerItems = []
  for (const item of items) {
    const cat = normCat(item.category)
    const qty = item.qty || item.quantity || 1
    const name = item.item_name || item.name || ''
    if (cat === 'fries' || ['nuggets','wings','shrimp','cheese_sticks'].includes(getFryerSubCat('',name))) {
      fryerItems.push({ subCat: getFryerSubCat('', name), qty })
    } else if (['shawarma','burgers','hotdogs','quesadilla','shashlik'].includes(cat)) {
      mainItems.push({ cat, qty })
    }
  }
  let mainTime = 0
  for (const item of mainItems) {
    const base = COOK_TIME[item.cat] || 5
    const repeat = item.cat === 'shawarma' ? 6 : item.cat === 'burgers' ? 7 : 5
    mainTime += base + Math.max(0, item.qty - 1) * repeat
  }
  const fryerTime = calcFryerTime(fryerItems)
  let total = mainTime === 0 ? fryerTime : fryerTime <= mainTime ? mainTime : mainTime + (fryerTime - mainTime)
  return Math.max(5, total)
}

export async function POST(req) {
  try {
    const { branch_id, items } = await req.json()
    if (!branch_id || !items?.length) return Response.json({ wait_minutes: 8 })

    const supabase = getServerSupabase()
    const itemIds = [...new Set(items.map(i => i.id).filter(Boolean))]
    const { data: menuRows } = await supabase
      .from('menu_items').select('id, category, name').in('id', itemIds)
    const catMap = Object.fromEntries((menuRows||[]).map(r => [r.id, { category: r.category, name: r.name }]))
    const itemsWithCat = items.map(i => ({
      ...i,
      category: catMap[i.id]?.category || 'other',
      item_name: catMap[i.id]?.name || '',
      quantity: i.qty || 1,
    }))

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
