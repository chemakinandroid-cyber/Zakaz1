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

async function createOrderRow(supabase, payload) {
  const branchId = payload.branchId
  const shortNumber = payload.shortNumber
  const total = payload.total
  const customerName = payload.customerName
  const customerPhone = payload.customerPhone
  const comment = payload.comment

  const rows = [
    // Максимально полные варианты
    {
      branch_id: branchId,
      short_number: shortNumber,
      status: 'new',
      is_confirmed: false,
      total: total,
      customer_name: customerName,
      customer_phone: customerPhone,
      comment: comment,
    },
    {
      branch_id: branchId,
      short_number: shortNumber,
      status: 'new',
      is_confirmed: false,
      total: total,
      customer_name: customerName,
      customer_phone: customerPhone,
    },
    {
      branch_id: branchId,
      short_number: shortNumber,
      status: 'new',
      total: total,
      customer_name: customerName,
      customer_phone: customerPhone,
    },
    {
      branch_id: branchId,
      short_number: shortNumber,
      status: 'new',
      total: total,
      customer_phone: customerPhone,
    },
    {
      branch_id: branchId,
      short_number: shortNumber,
      status: 'new',
      total: total,
    },

    // Варианты с order_number / total_amount
    {
      branch_id: branchId,
      order_number: shortNumber,
      status: 'new',
      is_confirmed: false,
      total_amount: total,
      customer_name: customerName,
      customer_phone: customerPhone,
      comment: comment,
    },
    {
      branch_id: branchId,
      order_number: shortNumber,
      status: 'new',
      is_confirmed: false,
      total_amount: total,
      customer_name: customerName,
      customer_phone: customerPhone,
    },
    {
      branch_id: branchId,
      order_number: shortNumber,
      status: 'new',
      total_amount: total,
      customer_phone: customerPhone,
    },
    {
      branch_id: branchId,
      order_number: shortNumber,
      status: 'new',
      total_amount: total,
    },

    // Варианты без номера
    {
      branch_id: branchId,
      status: 'new',
      is_confirmed: false,
      total: total,
      customer_name: customerName,
      customer_phone: customerPhone,
      comment: comment,
    },
    {
      branch_id: branchId,
      status: 'new',
      is_confirmed: false,
      total: total,
      customer_phone: customerPhone,
    },
    {
      branch_id: branchId,
      status: 'new',
      total: total,
      customer_phone: customerPhone,
    },
    {
      branch_id: branchId,
      status: 'new',
      total: total,
    },

    // Совсем минимальные
    {
      status: 'new',
      total: total,
    },
  ]

  let lastError = null

  for (const row of rows) {
    const cleaned = Object.fromEntries(
      Object.entries(row).filter(([_, value]) => {
        if (value === undefined || value === null) return false
        if (typeof value === 'string' && value.trim() === '') return false
        return true
      })
    )

    const { data, error } = await tryInsertOrder(supabase, cleaned)

    if (!error && data) {
      return data
    }

    lastError = error
    console.error('ORDER_INSERT_FAIL:', cleaned, error)
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
    items.map((item) => ({
      order_id: orderId,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price,
    })),
  ]

  let lastError = null

  for (const rows of variants) {
    const { error } = await supabase.from('order_items').insert(rows)

    if (!error) return

    lastError = error
    console.error('ORDER_ITEMS_FAIL:', rows, error)
  }

  throw new Error(lastError?.message || 'Не удалось сохранить позиции заказа')
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

    const normalizedCart = rawItems
      .map((item) => ({
        id: item?.id ?? item?.item_id ?? item?.menu_item_id,
        quantity: Math.max(1, parseInt(item?.quantity, 10) || 1),
      }))
      .filter((item) => item.id != null)

    if (!normalizedCart.length) {
      return NextResponse.json(
        { error: 'Нет корректных позиций для заказа' },
        { status: 400 }
      )
    }

    const ids = [...new Set(normalizedCart.map((item) => item.id))]
    const menuRows = await loadMenuItemsByIds(supabase, ids)
    const menuMap = new Map(menuRows.map((row) => [String(row.id), mapMenuRow(row)]))
    const stopMap = await loadStopMap(supabase, branchId)

    const preparedItems = []

    for (const cartItem of normalizedCart) {
      const menuItem = menuMap.get(String(cartItem.id))

      if (!menuItem) {
        return NextResponse.json(
          { error: `Позиция с id ${cartItem.id} не найдена в menu_items` },
          { status: 400 }
        )
      }

      if (stopMap.get(String(cartItem.id)) === true) {
        return NextResponse.json(
          { error: `Позиция "${menuItem.name}" сейчас на стопе` },
          { status: 400 }
        )
      }

      preparedItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: cartItem.quantity,
        lineTotal: Number((menuItem.price * cartItem.quantity).toFixed(2)),
      })
    }

    const total = Number(
      preparedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
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

    await createOrderItems(supabase, order.id, preparedItems)

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      shortNumber: order.short_number ?? order.order_number ?? shortNumber,
      total,
      order,
    })
  } catch (e) {
    console.error('ORDER_ERROR:', e)

    return NextResponse.json(
      { error: e?.message || 'Ошибка оформления заказа' },
      { status: 500 }
    )
  }
}
