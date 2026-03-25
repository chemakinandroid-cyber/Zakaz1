'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const STATUSES = [
  ['awaiting_call', 'Ожидает звонка'],
  ['confirmed', 'Подтвержден'],
  ['preparing', 'Готовится'],
  ['ready', 'Готов'],
  ['completed', 'Выдан'],
  ['not_picked_up', 'Не забран'],
]

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return value
  }
}

export default function AdminPage() {
  const [orders, setOrders] = useState([])
  const [itemsByOrder, setItemsByOrder] = useState({})
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!supabase) return
    setLoading(true)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    const nextOrders = ordersData || []
    setOrders(nextOrders)

    if (nextOrders.length) {
      const ids = nextOrders.map((order) => order.id)
      const { data: itemRows } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', ids)
        .order('id', { ascending: true })

      const grouped = {}
      for (const row of itemRows || []) {
        if (!grouped[row.order_id]) grouped[row.order_id] = []
        grouped[row.order_id].push(row)
      }
      setItemsByOrder(grouped)
    } else {
      setItemsByOrder({})
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

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 18 }}>
      <h1>Админка заказов</h1>
      {loading ? <div>Загрузка...</div> : null}
      <div style={{ display: 'grid', gap: 12 }}>
        {orders.map((order) => {
          const orderItems = itemsByOrder[order.id] || []
          return (
            <div
              key={order.id}
              style={{
                background: '#0b1b45',
                borderRadius: 18,
                padding: 16,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 260 }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{order.short_number || order.id}</div>
                  <div style={{ color: '#d9e4ff' }}>Точка: {order.branch_id}</div>
                  <div style={{ color: '#d9e4ff' }}>Сумма: {order.total} ₽</div>
                  <div style={{ color: '#d9e4ff' }}>Статус: {order.status}</div>
                  <div style={{ color: '#d9e4ff' }}>Имя: {order.customer_name || '—'}</div>
                  <div style={{ color: '#d9e4ff' }}>Телефон: {order.customer_phone || '—'}</div>
                  <div style={{ color: '#d9e4ff' }}>Создан: {formatDate(order.created_at)}</div>
                  {order.comment ? <div style={{ color: '#d9e4ff', marginTop: 6 }}>Комментарий: {order.comment}</div> : null}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: 'flex-end' }}>
                  {STATUSES.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => updateOrder(order.id, value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: value === order.status ? '1px solid #f4a01d' : '1px solid rgba(255,255,255,0.15)',
                        background: value === order.status ? 'rgba(244,160,29,0.15)' : '#081531',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {orderItems.length ? (
                <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Состав заказа</div>
                  {orderItems.map((item, index) => (
                    <div
                      key={`${order.id}-${index}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <div>
                        {item.item_name || `Позиция ${item.item_id || item.menu_item_id || ''}`}
                      </div>
                      <div>
                        {item.quantity || 0} × {item.price || 0} ₽
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </main>
  )
}
