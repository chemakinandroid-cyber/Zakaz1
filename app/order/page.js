'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LABELS = {
  awaiting_call: 'Ожидает звонка',
  confirmed: 'Заказ подтвержден',
  preparing: 'Готовится',
  ready: 'Готов',
  completed: 'Выдан',
  not_picked_up: 'Не забран',
  expired: 'Истёк',
}

export default function OrderPage() {
  const searchParams = useSearchParams()
  const [number, setNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function search(forcedNumber) {
    const searchNumber = (forcedNumber ?? number).trim().toUpperCase()
    setError('')
    setOrder(null)

    if (!searchNumber) {
      setError('Введите номер заказа')
      return
    }

    if (!supabase) {
      setError('Supabase не подключен')
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('short_number', searchNumber)
      .maybeSingle()

    setLoading(false)

    if (error || !data) {
      setError('Заказ не найден')
      return
    }

    setOrder(data)
  }

  useEffect(() => {
    const initialNumber = (searchParams.get('number') || '').trim().toUpperCase()
    if (!initialNumber) return
    setNumber(initialNumber)
    search(initialNumber)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!supabase || !order?.id) return
    const channel = supabase
      .channel('order-status-' + order.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => setOrder(payload.new)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [order?.id])

  const label = useMemo(() => LABELS[order?.status] || '—', [order])

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 18 }}>
      <h1>Отслеживание заказа</h1>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value.toUpperCase())}
          placeholder="Введите номер, например NV-AB123"
          style={{
            flex: 1,
            minWidth: 260,
            padding: 14,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)',
            background: '#081531',
            color: '#fff',
          }}
        />
        <button
          onClick={() => search()}
          style={{ padding: '14px 18px', borderRadius: 12, border: 0, background: '#f4a01d', color: '#111', fontWeight: 800 }}
        >
          Найти
        </button>
      </div>
      {loading ? <div style={{ color: '#c4d1f6', marginBottom: 12 }}>Ищем заказ...</div> : null}
      {error ? <div style={{ color: '#ffb4b4' }}>{error}</div> : null}
      {order ? (
        <div style={{ background: '#0b1b45', borderRadius: 18, padding: 18, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{order.short_number}</div>
          <div style={{ color: '#d9e4ff', marginBottom: 16 }}>
            Статус: <b>{label}</b>
          </div>
          <div style={{ color: '#c4d1f6' }}>Точка: {order.branch_id}</div>
          <div style={{ color: '#c4d1f6' }}>Сумма: {order.total} ₽</div>
        </div>
      ) : null}
    </main>
  )
}
