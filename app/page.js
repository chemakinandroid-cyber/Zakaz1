'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Page() {
  const [items, setItems] = useState([])

  useEffect(() => {
    supabase.from('menu_items').select('*').then(({ data }) => setItems(data || []))
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Меню</h1>
      {items.map(i => (
        <div key={i.id} style={{ border: '1px solid #333', padding: 10, marginBottom: 10 }}>
          <b>{i.name}</b>
          <div>{i.description}</div>
          <div>{i.price} ₽</div>
        </div>
      ))}
    </div>
  )
}
