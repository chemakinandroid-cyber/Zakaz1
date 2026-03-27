'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LABELS = {
  new: 'Новый',
  awaiting_call: 'Ожидает звонка',
  confirmed: 'Заказ подтвержден',
  preparing: 'Готовится',
  ready: 'Готов',
  completed: 'Выдан',
  not_picked_up: 'Не забран',
  expired: 'Истёк',
}


const BRANCH_LABELS = {
  'nv-fr-002': 'На Виражах — Аэропорт',
  'nv-sh-001': 'На Виражах — Конечная',
  '1': 'На Виражах — Аэропорт',
}

function normalizeBranchName(branchId, branchRow) {
  return branchRow?.name || BRANCH_LABELS[String(branchId)] || String(branchId || '')
}

function OrderPageInner() {
  const searchParams = useSearchParams()
  const [number, setNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [branchName, setBranchName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function search(forcedNumber) {
    const searchNumber = String(forcedNumber ?? number).trim()
    setError('')
    setOrder(null)
    setItems([])
    setBranchName('')

    if (!searchNumber) {
      setError('Введите номер заказа')
      return
    }

    if (!supabase) {
      setError('Supabase не подключен')
      return
    }

    setLoading(true)

    let orderData = null
    let orderError = null

    const byShort = await supabase
      .from('orders')
      .select('*')
      .eq('short_number', searchNumber)
      .maybeSingle()

    orderData = byShort.data
    orderError = byShort.error

    if (!orderData && !orderError) {
      const byOrderNumber = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', searchNumber)
        .maybeSingle()
      orderData = byOrderNumber.data
      orderError = byOrderNumber.error
    }

    if (!orderData && !orderError) {
      const byId = await supabase
        .from('orders')
        .select('*')
        .eq('id', searchNumber)
        .maybeSingle()
      orderData = byId.data
      orderError = byId.error
    }

    if (orderError || !orderData) {
      setLoading(false)
      setError('Заказ не найден')
      return
    }

    const [{ data: orderItems }, { data: branchRow }] = await Promise.all([
      supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderData.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('branches')
        .select('id, name')
        .eq('id', orderData.branch_id)
        .maybeSingle(),
    ])

    setOrder(orderData)
    setItems(orderItems || [])
    setBranchName(normalizeBranchName(orderData.branch_id, branchRow))
    setLoading(false)
  }

  useEffect(() => {
    const initialNumber = String(searchParams.get('number') || '').trim()
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
        async (payload) => {
          const updated = payload.new
          setOrder(updated)
          const { data: branchRow } = await supabase
            .from('branches')
            .select('name')
            .eq('id', updated.branch_id)
            .maybeSingle()
          setBranchName(normalizeBranchName(updated.branch_id, branchRow))
        }
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
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Введите номер заказа"
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
      {error ? <div style={{ color: '#ffb4b4', marginBottom: 12 }}>{error}</div> : null}

      {order ? (
        <div style={{ background: '#0b1b45', borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{order.short_number || order.order_number || order.id}</div>
          <div style={{ color: '#d9e4ff', marginTop: 8 }}>Статус: {label}</div>
          <div style={{ color: '#d9e4ff', marginTop: 8 }}>Точка: {branchName || normalizeBranchName(order.branch_id)}</div>
          <div style={{ color: '#d9e4ff' }}>Сумма: {order.total} ₽</div>

          {items.length ? (
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 12,
                    padding: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
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
      ) : null}
    </main>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 18 }}>Загрузка страницы заказа...</div>}>
      <OrderPageInner />
    </Suspense>
  )
}
