import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/serverSupabase'

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').trim()
}

function makeShortNumber() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let tail = ''
  for (let i = 0; i < 5; i += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `NV-${tail}`
}

function pickStopItemId(row) {
  return row?.item_id ?? row?.menu_item_id ?? null
}

function isStopped(row) {
  if (typeof row?.is_stopped === 'boolean') return row.is_stopped
  return true
}

async function tryInsertOrder(supabase, payloads) {
  let lastError = null

  for (const payload of payloads) {
    const { data, error } = await supabase.from('orders').insert(payload).select('*').single()
    if (!error && data) {
      return { data, payload }
    }
    lastError = error
  }

  throw lastError || new Error('Не удалось создать заказ')
}

async function tryInsertOrderItems(supabase, rowsVariants) {
  let lastError = null

  for (const rows of rowsVariants) {
    const { error } = await supabase.from('order_items').insert(rows)
    if (!error) return { ok: true }
    lastError = error
  }

  throw lastError || new Error('Не удалось сохранить позиции заказа')
}

export async function POST(request) {
  try {
    const supabase = getServerSupabase()
    const body = await request.json()

    const branchId = String(body?.branch_id || '').trim()
    const customerName = String(body?.customer_name || '').trim()
    const customerPhone = normalizePhone(body?.customer_phone)
    const comment = String(body?.comment || '').trim()
    const cartItems = Array.isArray(body?.items) ? body.items : []

    if (!branchId) {
      return NextResponse.json({ error: 'Не указана точка выдачи' }, { status: 400 })
    }

    if (!customerName) {
      return NextResponse.json({ error: 'Укажите имя' }, { status: 400 })
    }

    if (!customerPhone) {
      return NextResponse.json({ error: 'Укажите телефон' }, { status: 400 })
    }

    if (!cartItems.length) {
      return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 })
    }

    const uniqueIds = [...new Set(cartItems.map((item) => item?.id).filter(Boolean))]

    const [{ data: menuData, error: menuError }, { data: stopRows, error: stopError }] = await Promise.all([
      supabase
        .from('menu_items')
        .select('id, name, price, category, description')
        .in('id', uniqueIds),
      supabase
        .from('stop_list')
        .select('item_id, menu_item_id, is_stopped, branch_id')
        .eq('branch_id', branchId),
    ])

    if (menuError) {
      return NextResponse.json({ error: 'Не удалось проверить меню' }, { status: 500 })
    }

    if (stopError) {
      return NextResponse.json({ error: 'Не удалось проверить стоп-лист' }, { status: 500 })
    }

    const menuById = new Map((menuData || []).map((item) => [item.id, item]))
    const stoppedIds = new Set((stopRows || []).filter(isStopped).map(pickStopItemId).filter(Boolean))

    const normalizedItems = []
    for (const rawItem of cartItems) {
      const itemId = rawItem?.id
      const quantity = Number(rawItem?.quantity || 0)
      const menuItem = menuById.get(itemId)

      if (!menuItem) {
        return NextResponse.json({ error: 'Одна из позиций больше недоступна в меню' }, { status: 400 })
      }

      if (stoppedIds.has(itemId)) {
        return NextResponse.json({ error: `Позиция «${menuItem.name}» сейчас на стопе` }, { status: 400 })
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: 'Некорректное количество товара' }, { status: 400 })
      }

      const price = Number(menuItem.price || 0)
      if (!price || price <= 0) {
        return NextResponse.json({ error: `Позиция «${menuItem.name}» сейчас недоступна для заказа` }, { status: 400 })
      }

      normalizedItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price,
        quantity,
        lineTotal: price * quantity,
      })
    }

    const total = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0)
    const shortNumber = makeShortNumber()

    const orderPayloads = [
      {
        branch_id: branchId,
        short_number: shortNumber,
        status: 'awaiting_call',
        is_confirmed: false,
        total,
        customer_name: customerName,
        customer_phone: customerPhone,
        comment,
      },
      {
        branch_id: branchId,
        short_number: shortNumber,
        status: 'awaiting_call',
        total,
        customer_name: customerName,
        customer_phone: customerPhone,
        comment,
      },
      {
        branch_id: branchId,
        short_number: shortNumber,
        status: 'awaiting_call',
        total,
      },
    ]

    const { data: insertedOrder } = await tryInsertOrder(supabase, orderPayloads)

    const itemVariants = [
      normalizedItems.map((item) => ({
        order_id: insertedOrder.id,
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        line_total: item.lineTotal,
      })),
      normalizedItems.map((item) => ({
        order_id: insertedOrder.id,
        item_id: item.id,
        price: item.price,
        quantity: item.quantity,
        total: item.lineTotal,
      })),
      normalizedItems.map((item) => ({
        order_id: insertedOrder.id,
        menu_item_id: item.id,
        price: item.price,
        quantity: item.quantity,
        total: item.lineTotal,
      })),
      normalizedItems.map((item) => ({
        order_id: insertedOrder.id,
        item_id: item.id,
        price: item.price,
        quantity: item.quantity,
      })),
      normalizedItems.map((item) => ({
        order_id: insertedOrder.id,
        menu_item_id: item.id,
        price: item.price,
        quantity: item.quantity,
      })),
    ]

    await tryInsertOrderItems(supabase, itemVariants)

    return NextResponse.json({
      ok: true,
      order: {
        id: insertedOrder.id,
        short_number: insertedOrder.short_number || shortNumber,
        status: insertedOrder.status || 'awaiting_call',
        total: insertedOrder.total || total,
      },
    })
  } catch (error) {
    console.error('POST /api/orders failed', error)
    return NextResponse.json(
      { error: error?.message || 'Не удалось оформить заказ' },
      { status: 500 }
    )
  }
}
