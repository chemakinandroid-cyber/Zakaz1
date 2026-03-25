'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OrderPage() {
  const [status, setStatus] = useState('')

  useEffect(() => {
    const channel = supabase
      .channel('orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setStatus(payload.new.status)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return <div style={{ padding: 20 }}>Статус: {status}</div>
}
