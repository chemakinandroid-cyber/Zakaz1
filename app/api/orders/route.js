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

async function loadStopMap(supabase, branchId) {
  try {
    let query = supabase.from('stop_list').select('menu_item_id, is_stopped')

    if (branchId !== null && branchId !== undefined && branchId !== '') {
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
        map.set(String(row.menu_item_id), Boolean(row?.is_stopped))
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
    throw new Error(`Не удалось загрузить menu_items: ${error.message}`)
  }

  return data || []
}

async function tryInsertOrder(supabase, row) {
  const { data, error } = await supabase
    .from('orders')
    .insert(row)
    .select('*')
    .single()

  return { data, error }
}

function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row).filter(([_, value]) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'string' && value.trim() === '') return false
      return true
    })
  )
}

async function createOrderRow(supabase, payload) {
  const branchId = payload.branchId
  const shortNumber = payload.shortNumber
  const total = payload.total
  const customerName = payload.customerName
  const customerPhone = payload.customerPhone
  const comment = payload.comment

  if (branchId === null || branchId === undefined || branchId === '') {
    throw new Error('Не выбран филиал (branch_id)')
  }

  const rows = [
    {
      branch_id: branchId,
      short_number: shortNumber,
      status: 'new',
      total,
    },
    {
      branch_id: branchId,
      order_number: shortNumber,
      status: 'new',
      total_amount: total,
    },
    {
      branch_id: branchId,
      status: 'new',
      total,
    },
  ]

  let lastError = null

  for (const rawRow of rows) {
    const row = cleanRow(rawRow)
    const { data, error } = await tryInsertOrder(supabase, row)

    if (!error && data) {
      return data
    }

    lastError = error
    console.error('ORDER_INSERT_FAIL:', row, error)
  }

  throw new Error(lastError?.message || 'Не удалось создать заказ')
}

async function createOrderItems(supabase, orderId, items) {
  const rows = items.map((item) => ({
    order_id: orderId,
    item_id: item.id,
    quantity: item.quantity,
    price: item.price,
  }))

  const { error } = await supabase.from('order_items').insert(rows)

  if (error) {
    throw new Error(error.message)
  }
}

function makeShortNumber() {
  return String(Date.now()).slice(-6)
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const branchId = body?.branch_id ?? body?.branchId ?? null
    const rawItems = Array.isArray(body?.items) ? body.items : []

    if (!branchId) {
      return NextResponse.json({ error: 'Нет branch_id' }, { status: 400 })
    }

    if (!rawItems.length) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 })
    }

    const cart = rawItems
      .map((item) => ({
        id: item?.id,
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
        return NextResponse.json({ error: `Нет позиции ${c.id}` }, { status: 400 })
      }

      if (stopMap.get(String(c.id)) === true) {
        return NextResponse.json({ error: `${m.name} на стопе` }, { status: 400 })
      }

      items.push({
        id: m.id,
        price: m.price,
        quantity: c.quantity,
      })
    }

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

    const order = await createOrderRow(supabase, {
      branchId,
      shortNumber: makeShortNumber(),
      total,
    })

    await createOrderItems(supabase, order.id, items)

    return NextResponse.json({ ok: true, orderId: order.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
