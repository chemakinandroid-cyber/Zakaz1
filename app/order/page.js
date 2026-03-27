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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  )
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
    const rawNumber = String(forcedNumber ?? number).trim()
    const normalized = rawNumber.replace(/^0+/, '')

    setError('')
    setOrder(null)
    setItems([])
    setBranchName('')

    if (!rawNumber) {
      setError('Введите номер заказа')
      return
    }

    if (!supabase) {
      setError('Supabase не подключен')
      return
    }

    setLoading(true)

    try {
      const candidates = []

      const shortCandidates = [rawNumber]
      if (normalized && normalized !== rawNumber) shortCandidates.push(normalized)

      const { data: byShort, error: byShortError } = await supabase
        .from('orders')
        .select('*')
        .in('short_number', shortCandidates)
        .order('created_at', { ascending: false })

      if (byShortError) throw byShortError
      if (Array.isArray(byShort)) candidates.push(...byShort)

      if (!candidates.length) {
        const orderNumberCandidates = [rawNumber]
        if (normalized && normalized !== rawNumber) orderNumberCandidates.push(normalized)

        const { data: byOrderNumber, error: byOrderNumberError } = await supabase
          .from('orders')
          .select('*')
          .in('order_number', orderNumberCandidates)
          .order('created_at', { ascending: false })

        if (byOrderNumberError) throw byOrderNumberError
        if (Array.isArray(byOrderNumber)) candidates.push(...byOrderNumber)
      }

      if (!candidates.length && /^\d+$/.test(rawNumber)) {
        const { data: bySuffix, error: bySuffixError } = await supabase
          .from('orders')
          .select('*')
          .ilike('order_number', `%${rawNumber}`)
          .order('created_at', { ascending: false })

        if (bySuffixError) throw bySuffixError
        if (Array.isArray(bySuffix)) candidates.push(...bySuffix)
      }

      if (!candidates.length && isUuid(rawNumber)) {
        const { data: byId, error: byIdError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', rawNumber)
          .limit(1)

        if (byIdError) throw byIdError
        if (Array.isArray(byId)) candidates.push(...byId)
      }

      const seen = new Set()
      const uniqueCandidates = candidates.filter((row) => {
        if (!row?.id || seen.has(row.id)) return false
        seen.add(row.id)
        return true
      })

      const orderData = uniqueCandidates[0]
      if (!orderData) {
        setError('Заказ не найден')
        setLoading(false)
        return
      }

      const [{ data: orderItems, error: itemsError }, { data: branchRow }] = await Promise.all([
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

      if (itemsError) throw itemsError

      setOrder(orderData)
      setItems(orderItems || [])
      setBranchName(branchRow?.name || BRANCH_LABELS[orderData.branch_id] || orderData.branch_id)
    } catch {
      setError('Заказ не найден')
    } finally {
      setLoading(false)
    }
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
          setBranchName(branchRow?.name || BRANCH_LABELS[updated.branch_id] || updated.branch_id)
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
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            border: 0,
            background: '#f4a01d',
            color: '#111',
            fontWeight: 800,
          }}
        >
          Найти
        </button>
      </div>

      {loading ? <div style={{ color: '#c4d1f6', marginBottom: 12 }}>Ищем заказ...</div> : null}
      {error ? <div style={{ color: '#ffb4b4', marginBottom: 12 }}>{error}</div> : null}

      {order ? (
        <div
          style={{
            background: '#0b1b45',
            borderRadius: 18,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: 42, fontWeight: 900 }}>{order.short_number || order.order_number || order.id}</div>
          <div style={{ color: '#d9e4ff', marginTop: 8 }}>Статус: {label}</div>
          <div style={{ color: '#d9e4ff', marginTop: 8 }}>Точка: {branchName || BRANCH_LABELS[order.branch_id] || order.branch_id}</div>
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
