'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Admin() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('orders').select('*')
    setOrders(data || [])
  }

  async function updateStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id)
    load()
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Админка</h1>
      {orders.map(o => (
        <div key={o.id} style={{ border: '1px solid #333', marginBottom: 10, padding: 10 }}>
          <div>{o.short_number}</div>
          <div>{o.status}</div>
          <button onClick={() => updateStatus(o.id, 'confirmed')}>Подтвердить</button>
          <button onClick={() => updateStatus(o.id, 'preparing')}>Готовится</button>
          <button onClick={() => updateStatus(o.id, 'ready')}>Готов</button>
          <button onClick={() => updateStatus(o.id, 'completed')}>Выдан</button>
        </div>
      ))}
    </div>
  )
}
