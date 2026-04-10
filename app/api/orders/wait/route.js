export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

// Время приготовления одной порции (минуты)
const COOK_TIME = {
  // Основные блюда (гриль/сборка) — последовательно
  shawarma: 7,
  burgers: 8,
  hotdogs: 7,
  quesadilla: 6,
  shashlik: 50,
  // Фритюр — параллельно с основными, max 4 порции за раз
  fries: 4,          // картофель фри и по-деревенски
  nuggets: 4,        // наггетсы
  wings: 9,          // крылья (самые долгие)
  shrimp: 4,         // креветки
  cheese_sticks: 4,  // сырные палочки
  // Не требуют готовки
  sauces: 0, drinks: 0, shawarma_addons: 0, other: 0,
}

// Категории фритюра
const FRYER_CATS = new Set(['fries','nuggets','wings','shrimp','cheese_sticks'])

// Маппинг item_id prefix → категория фритюра
function getFryerSubCat(itemId, itemName) {
  const n = (itemName||'').toLowerCase()
  if (n.includes('крыл')) return 'wings'
  if (n.includes('креветк')) return 'shrimp'
  if (n.includes('наггет')) return 'nuggets'
  if (n.includes('сырные палочки') || n.includes('палочк')) return 'cheese_sticks'
  if (n.includes('картофел') || n.includes('фри') || n.includes('деревен')) return 'fries'
  return 'fries'
}

function normCat(c) {
  const r = String(c||'').trim().toLowerCase()
  return r === 'fryer' ? 'fries' : r || 'other'
}

// Считаем время фритюра с учётом параллельности (max 4 порции за загрузку)
function calcFryerTime(fryerItems) {
  if (!fryerItems.length) return 0

  // Группируем по загрузкам — максимум 4 порции за раз
  // Сортируем по времени убывания (самые долгие первыми)
  const portions = []
  for (const item of fryerItems) {
    const t = COOK_TIME[item.subCat] || 4
    for (let i = 0; i < item.qty; i++) {
      portions.push({ t, subCat: item.subCat })
    }
  }
  portions.sort((a,b) => b.t - a.t)

  // Жадно пакуем в загрузки по 4
  let totalFryerTime = 0
  let i = 0
  while (i < portions.length) {
    const batch = portions.slice(i, i+4)
    const batchTime = Math.max(...batch.map(p => p.t))
    totalFryerTime += batchTime
    i += 4
  }
  return totalFryerTime
}

// Считаем общее время заказа с параллельностью
function calcOrderCookTime(items) {
  if (!items?.length) return 8

  const mainItems = []  // гриль/сборка
  const fryerItems = [] // фритюр

  for (const item of items) {
    const cat = normCat(item.category)
    const qty = item.quantity || 1

    if (cat === 'fries' || cat === 'other' && FRYER_CATS.has(getFryerSubCat('', item.item_name||''))) {
      fryerItems.push({ subCat: getFryerSubCat(item.item_id||'', item.item_name||''), qty })
    } else if (['shawarma','burgers','hotdogs','quesadilla','shashlik'].includes(cat)) {
      mainItems.push({ cat, qty })
    } else if (cat === 'fries') {
      fryerItems.push({ subCat: 'fries', qty })
    }
  }

  // Время основных блюд — последовательно, но с коэффициентом перекрытия
  // Повар может начать следующее блюдо пока предыдущее доходит
  let mainTime = 0
  const uniqueCats = new Set(mainItems.map(i => i.cat))
  for (const item of mainItems) {
    const base = COOK_TIME[item.cat] || 5
    const repeatTime = item.cat === 'shawarma' ? 6 : item.cat === 'burgers' ? 7 : 5
    mainTime += base + Math.max(0, item.qty - 1) * repeatTime
  }
  // Если несколько разных категорий — применяем коэффициент перекрытия 0.8
  // Повар параллелит: пока котлета жарится — собирает шаурму
  if (uniqueCats.size >= 2) mainTime = Math.round(mainTime * 0.8)

  // Время фритюра
  const fryerTime = calcFryerTime(fryerItems)

  // Параллельность: фритюр идёт одновременно с основными блюдами
  // Но если основных нет — фритюр идёт сам по себе
  // Если фритюр дольше основных — добавляем разницу
  let total
  if (mainTime === 0) {
    total = fryerTime
  } else if (fryerTime <= mainTime) {
    // Фритюр успевает пока готовятся основные — параллельно
    total = mainTime
  } else {
    // Фритюр дольше — добавляем остаток
    total = mainTime + (fryerTime - mainTime)
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
      .from('order_items').select('quantity, item_id, item_name').eq('order_id', order_id)

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

    // Очередь
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
