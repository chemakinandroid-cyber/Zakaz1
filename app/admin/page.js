'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const STATUSES = [
  ['new', 'Новый'],
  ['awaiting_call', 'Ожидает звонка'],
  ['confirmed', 'Подтвержден'],
  ['preparing', 'Готовится'],
  ['ready', 'Готов'],
  ['completed', 'Выдан'],
  ['not_picked_up', 'Не забран'],
]

export default function AdminPage() {
  const [orders, setOrders] = useState([])
  const [orderItemsMap, setOrderItemsMap] = useState({})
  const [branchMap, setBranchMap] = useState({})
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!supabase) return
    setLoading(true)

    const [{ data: ordersData }, { data: branchesData }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('branches').select('id, name'),
    ])

    const nextOrders = ordersData || []
    setOrders(nextOrders)
    setBranchMap(
      Object.fromEntries((branchesData || []).map((branch) => [branch.id, branch.name]))
    )

    if (nextOrders.length) {
      const ids = nextOrders.map((order) => order.id)
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', ids)
        .order('created_at', { ascending: true })

      const grouped = {}
      for (const item of itemsData || []) {
        if (!grouped[item.order_id]) grouped[item.order_id] = []
        grouped[item.order_id].push(item)
      }
      setOrderItemsMap(grouped)
    } else {
      setOrderItemsMap({})
    }

    setLoading(false)
  }

  async function updateOrder(id, nextStatus) {
    if (!supabase) return
    const payload = { status: nextStatus }
    if (nextStatus === 'confirmed') payload.is_confirmed = true
    await supabase.from('orders').update(payload).eq('id', id)
    load()
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const totalNew = useMemo(
    () => orders.filter((order) => order.status === 'new' || order.status === 'awaiting_call').length,
    [orders]
  )

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1>Админка</h1>
        <div style={{ color: '#ffd08a', fontWeight: 800 }}>Новых заказов: {totalNew}</div>
      </div>

      {loading ? <div>Загрузка...</div> : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {orders.map(order => (
          <div key={order.id} style={{ background: '#0b1b45', borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 280 }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{order.short_number || order.order_number || order.id}</div>
                <div style={{ color: '#d9e4ff' }}>Точка: {branchMap[order.branch_id] || order.branch_id}</div>
                <div style={{ color: '#d9e4ff' }}>Сумма: {order.total} ₽</div>
                <div style={{ color: '#d9e4ff' }}>Статус: {order.status}</div>
                {order.customer_name ? <div style={{ color: '#d9e4ff' }}>Имя: {order.customer_name}</div> : null}
                {order.customer_phone ? <div style={{ color: '#d9e4ff' }}>Телефон: {order.customer_phone}</div> : null}
                {order.comment ? <div style={{ color: '#d9e4ff' }}>Комментарий: {order.comment}</div> : null}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: 'flex-end' }}>
                {STATUSES.map(([value, label]) => (
                  <button key={value} onClick={() => updateOrder(order.id, value)} style={{
                    padding: '10px 12px', borderRadius: 12,
                    border: value === order.status ? '1px solid #f4a01d' : '1px solid rgba(255,255,255,0.15)',
                    background: value === order.status ? 'rgba(244,160,29,0.15)' : '#081531',
                    color: '#fff', cursor: 'pointer'
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(orderItemsMap[order.id] || []).length ? (
              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                {(orderItemsMap[order.id] || []).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.item_name}</div>
                      <div style={{ color: '#c4d1f6', fontSize: 13 }}>
                        {item.quantity} × {item.price} ₽
                      </div>
                    </div>
                    <div style={{ fontWeight: 800 }}>{item.line_total} ₽</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  )
}
