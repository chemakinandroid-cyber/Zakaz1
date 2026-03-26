import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase env vars are missing')
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizeString(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapMenuRow(row) {
  return {
    id: row?.id,
    name:
      row?.name ??
      row?.title ??
      row?.item_name ??
      row?.product_name ??
      'Без названия',
    price: toNumber(
      row?.price ??
      row?.base_price ??
      row?.sale_price ??
      row?.cost ??
      0
    ),
  }
}

// 🔥 стоп-лист НЕ валит заказ
async function loadStopMap(supabase, branchId) {
  try {
    let query = supabase.from('stop_list').select('menu_item_id, is_stopped')

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data, error } = await query

    if (error) {
      console.error('STOP_LIST_ERROR:', error)
      return new Map()
    }

    const map = new Map()
    for (const row of data || []) {
      if (row?.menu_item_id != null) {
        map.set(String(row.menu_item_id), Boolean(row.is_stopped))
      }
    }

    return map
  } catch (e) {
    console.error('STOP_LIST_FATAL:', e)
    return new Map()
  }
}

async function loadMenuItemsByIds(supabase, ids) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .in('id', ids)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

// 🔥 УМНЫЙ ИНСЕРТ ЗАКАЗА (без привязки к comment)
async function createOrderRow(supabase, payload) {
  const baseVariants = [
    {
      branch_id: payload.branchId,
      short_number: payload.shortNumber,
      status: 'new',
      is_confirmed: false,
      total: payload.total,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
    },
    {
      branch_id: payload.branchId,
      order_number: payload.shortNumber,
      status: 'new',
      is_confirmed: false,
      total_amount: payload.total,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
    },
    {
      branch_id: payload.branchId,
      status: 'new',
      total: payload.total,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
    },
  ]

  const commentFields = ['comment', 'customer_comment', 'notes', 'note']

  let variants = [...baseVariants]

  if (payload.comment) {
    const withComments = []
    for (const base of baseVariants) {
      for (const field of commentFields) {
        withComments.push({ ...base, [field]: payload.comment })
      }
    }
    variants = [...withComments, ...variants]
  }

  let lastError = null

  for (const row of variants) {
    const { data, error } = await supabase
      .from('orders')
      .insert(row)
      .select('*')
      .single()

    if (!error && data) return data

    lastError = error
    console.error('ORDER INSERT FAIL:', error)
  }

  throw new Error(lastError?.message || 'Не удалось создать заказ')
}

async function createOrderItems(supabase, orderId, items) {
  const variants = [
    items.map((item) => ({
      order_id: orderId,
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      line_total: item.lineTotal,
    })),
    items.map((item) => ({
      order_id: orderId,
      menu_item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.lineTotal,
    })),
    items.map((item) => ({
      order_id: orderId,
      item_id: item.id,
      quantity: item.quantity,
      price: item.price,
    })),
  ]

  let lastError = null

  for (const rows of variants) {
    const { error } = await supabase.from('order_items').insert(rows)
    if (!error) return

    lastError = error
    console.error('ORDER ITEMS FAIL:', error)
  }

  throw new Error(lastError?.message || 'Не удалось сохранить позиции')
}

function makeShortNumber() {
  return String(Date.now()).slice(-6)
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const branchId = body?.branchId ?? body?.branch_id ?? null
    const customerName = normalizeString(body?.customerName ?? body?.customer_name)
    const customerPhone = normalizeString(body?.customerPhone ?? body?.customer_phone)
    const comment = normalizeString(body?.comment)

    const rawItems = Array.isArray(body?.items) ? body.items : []

    if (!rawItems.length) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 })
    }

    const cart = rawItems
      .map((item) => ({
        id: item?.id ?? item?.item_id ?? item?.menu_item_id,
        quantity: Math.max(1, parseInt(item?.quantity) || 1),
      }))
      .filter((i) => i.id != null)

    const ids = [...new Set(cart.map((i) => i.id))]

    const menuRows = await loadMenuItemsByIds(supabase, ids)
    const menuMap = new Map(menuRows.map((r) => [String(r.id), mapMenuRow(r)]))

    const stopMap = await loadStopMap(supabase, branchId)

    const items = []

    for (const c of cart) {
      const m = menuMap.get(String(c.id))

      if (!m) {
        return NextResponse.json(
          { error: `Нет позиции id ${c.id}` },
          { status: 400 }
        )
      }

      if (stopMap.get(String(c.id)) === true) {
        return NextResponse.json(
          { error: `${m.name} на стопе` },
          { status: 400 }
        )
      }

      items.push({
        id: m.id,
        name: m.name,
        price: m.price,
        quantity: c.quantity,
        lineTotal: Number((m.price * c.quantity).toFixed(2)),
      })
    }

    const total = Number(
      items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2)
    )

    const shortNumber = makeShortNumber()

    const order = await createOrderRow(supabase, {
      branchId,
      shortNumber,
      total,
      customerName,
      customerPhone,
      comment,
    })

    await createOrderItems(supabase, order.id, items)

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      shortNumber: order.short_number ?? order.order_number ?? shortNumber,
      total,
    })
  } catch (e) {
    console.error('ORDER ERROR:', e)

    return NextResponse.json(
      { error: e?.message || 'Ошибка оформления заказа' },
      { status: 500 }
    )
  }
}
