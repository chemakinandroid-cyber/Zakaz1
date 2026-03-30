import { getServerSupabase } from '@/lib/serverSupabase'

const MAX_ACTIVE_ORDERS = 10
const ACTIVE_STATUSES   = ['new','confirmed','preparing','ready']

export async function POST(req) {
  try {
    const body = await req.json()
    const supabase = getServerSupabase()

    const branch_id       = String(body.branch_id||'').trim()
    const customer_name   = String(body.customer_name||'').trim()
    const customer_phone  = String(body.customer_phone||'').trim()

    if (!branch_id)      return Response.json({error:'branch_id обязателен'},{status:400})
    if (!customer_name)  return Response.json({error:'Укажите имя'},{status:400})
    if (!customer_phone) return Response.json({error:'Укажите телефон'},{status:400})
    if (!Array.isArray(body.items)||!body.items.length)
      return Response.json({error:'Корзина пуста'},{status:400})

    // Проверка времени работы
    const { data: branchRow } = await supabase
      .from('branches')
      .select('open, close, cutoff')
      .eq('id', branch_id)
      .maybeSingle()

    // Также ищем по name если не нашли по id
    let scheduleRow = branchRow
    if (!scheduleRow) {
      const BRANCH_NAMES = { 'nv-fr-002': 'На Виражах — Аэропорт', 'nv-sh-001': 'На Виражах — Конечная' }
      const branchName = BRANCH_NAMES[branch_id]
      if (branchName) {
        const { data } = await supabase.from('branches').select('open, close, cutoff').eq('name', branchName).maybeSingle()
        scheduleRow = data
      }
    }

    if (scheduleRow?.cutoff) {
      // Время в Улан-Удэ UTC+8
      const now = new Date()
      const nowUB = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      const nowMin = nowUB.getUTCHours() * 60 + nowUB.getUTCMinutes()
      const [ch, cm] = scheduleRow.cutoff.split(':').map(Number)
      const [oh, om] = (scheduleRow.open || '00:00').split(':').map(Number)
      const cutoffMin = ch * 60 + cm
      const openMin   = oh * 60 + om
      if (nowMin < openMin || nowMin >= cutoffMin) {
        return Response.json({ error: `Приём заказов закрыт. Работаем с ${scheduleRow.open} до ${scheduleRow.cutoff}` }, { status: 403 })
      }
    }

    // Защита от спама — не более 3 заказов с одного телефона за 2 часа
    if (customer_phone) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const { count: phoneCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_phone', customer_phone)
        .gte('created_at', twoHoursAgo)

      if (phoneCount >= 3) {
        return Response.json(
          { error: 'Слишком много заказов с этого номера. Попробуйте через 2 часа.' },
          { status: 429 }
        )
      }
    }

    // Лимит активных заказов
    const {count:activeCount} = await supabase
      .from('orders').select('id',{count:'exact',head:true})
      .eq('branch_id',branch_id).in('status',ACTIVE_STATUSES)

    if (activeCount >= MAX_ACTIVE_ORDERS)
      return Response.json({error:'Точка временно перегружена. Попробуйте через несколько минут.'},{status:429})

    // Загружаем меню и стоп-лист
    const [{data:menuItems,error:menuError},{data:stopList}] = await Promise.all([
      supabase.from('menu_items').select('id,name,price,branch_ids,category,variant,coming_soon'),
      supabase.from('stop_list').select('menu_item_id').eq('branch_id',branch_id).eq('is_stopped',true),
    ])
    if (menuError) return Response.json({error:'Ошибка загрузки меню'},{status:500})

    const stoppedIds = new Set((stopList||[]).map(r=>r.menu_item_id))
    const menuById   = Object.fromEntries((menuItems||[]).map(m=>[m.id,m]))

    let total = 0
    const orderItems = []

    for (const entry of body.items) {
      const menu = menuById[entry.id]
      if (!menu)         return Response.json({error:'Товар не найден'},{status:400})
      if (menu.coming_soon) return Response.json({error:`"${menu.name}" ещё не в продаже`},{status:400})
      if (stoppedIds.has(menu.id)) return Response.json({error:`"${menu.name}" временно недоступен`},{status:400})
      if (Array.isArray(menu.branch_ids)&&menu.branch_ids.length>0&&!menu.branch_ids.includes(branch_id))
        return Response.json({error:`"${menu.name}" недоступен для этой точки`},{status:400})

      const qty       = Math.max(1, Math.floor(Number(entry.qty||entry.quantity)||1))
      const modifiers = Array.isArray(entry.modifiers) ? entry.modifiers : []

      // Валидируем модификаторы
      const modsTotal = modifiers.reduce((s,m)=>{
        const mod = menuById[m.id]
        return s + Number(mod?.price||m.price||0)
      },0)

      const unitPrice = Number(menu.price||0) + modsTotal
      const lineTotal = unitPrice * qty
      total += lineTotal

      orderItems.push({
        item_id:   menu.id,
        item_name: menu.name,
        price:     Number(menu.price||0),
        quantity:  qty,
        line_total: lineTotal,
        modifiers:  modifiers.length ? JSON.stringify(modifiers) : null,
      })
    }

    // Атомарный номер (RPC → fallback)
    let shortNumber
    const {data:rpcResult,error:rpcError} = await supabase
      .rpc('next_order_number',{p_branch_id:branch_id})

    if (!rpcError && rpcResult) {
      shortNumber = String(rpcResult).padStart(4,'0')
    } else {
      const {data:counter} = await supabase
        .from('order_counters').select('last_number').eq('branch_id',branch_id).maybeSingle()
      const nextNum = (Number(counter?.last_number)||0)+1
      shortNumber = String(nextNum).padStart(4,'0')
      await supabase.from('order_counters')
        .upsert({branch_id,last_number:nextNum},{onConflict:'branch_id'})
    }

    const order_number = `${branch_id}-${shortNumber}`

    const {data:order,error:orderError} = await supabase
      .from('orders')
      .insert([{branch_id,order_number,short_number:shortNumber,status:'new',total,customer_name,customer_phone,comment:String(body.comment||'').trim()||null}])
      .select().single()

    if (orderError) return Response.json({error:orderError.message},{status:500})

    const {error:itemsError} = await supabase
      .from('order_items')
      .insert(orderItems.map(i=>({...i,order_id:order.id})))

    if (itemsError) return Response.json({error:itemsError.message},{status:500})

    // Push-уведомление (не блокируем ответ клиенту)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL||''}/api/push/send`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ branch_id, order_number: order.short_number||order.order_number, order_id: order.id }),
    }).catch(()=>{})

    // Отправляем push-уведомление оператору (fire & forget)
    try {
      const pushUrl = new URL('/api/push/send', req.url).toString()
      fetch(pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id,
          title: `🔔 Новый заказ ${shortNumber}`,
          body: `${customer_name} · ${total} ₽`,
          order_number: shortNumber,
        }),
      }).catch(() => {})
    } catch {}

    return Response.json({success:true,order,short_number:order.short_number})
  } catch(e) {
    console.error('POST /api/orders error:',e)
    return Response.json({error:e.message||'Ошибка сервера'},{status:500})
  }
}
