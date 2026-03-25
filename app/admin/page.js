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

export default function AdminPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(data || [])
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

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 18 }}>
      <h1>Админка</h1>
      {loading ? <div>Загрузка...</div> : null}
      <div style={{ display: 'grid', gap: 12 }}>
        {orders.map(order => (
          <div key={order.id} style={{ background: '#0b1b45', borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{order.short_number || order.id}</div>
                <div style={{ color: '#d9e4ff' }}>Точка: {order.branch_id}</div>
                <div style={{ color: '#d9e4ff' }}>Сумма: {order.total} ₽</div>
                <div style={{ color: '#d9e4ff' }}>Статус: {order.status}</div>
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
          </div>
        ))}
      </div>
    </main>
  )
}
