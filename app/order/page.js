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

const BRANCH_NAMES = {
  '1': 'На Виражах — Конечная',
  '2': 'На Виражах — Аэропорт',
  'nv-sh-001': 'На Виражах — Конечная',
  'nv-fr-002': 'На Виражах — Аэропорт',
}

function normalizeDigits(value) {
  return String(value || '').trim().replace(/^0+/, '') || '0'
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim())
}

function buildSearchCandidates(rawValue) {
  const value = String(rawValue || '').trim()
  const compact = value.replace(/\s+/g, '')
  const numeric = normalizeDigits(compact)
  const variants = new Set([value, compact, numeric])

  if (/^\d+$/.test(compact)) {
    variants.add(compact.padStart(4, '0'))
    variants.add(compact.padStart(3, '0'))
  }

  return Array.from(variants).filter(Boolean)
}

function pickBestOrder(rows, requestedValue) {
  if (!Array.isArray(rows) || rows.length === 0) return null

  const trimmed = String(requestedValue || '').trim()
  const compact = trimmed.replace(/\s+/g, '')
  const digits = normalizeDigits(compact)

  const score = (row) => {
    const shortNumber = String(row?.short_number || '').trim()
    const orderNumber = String(row?.order_number || '').trim()
    const id = String(row?.id || '').trim()

    if (shortNumber === compact) return 100
    if (normalizeDigits(shortNumber) === digits) return 95
    if (orderNumber === compact) return 90
    if (orderNumber.endsWith(`-${compact}`)) return 85
    if (id === compact) return 80
    if (shortNumber.includes(compact)) return 70
    if (orderNumber.includes(compact)) return 60
    return 0
  }

  return [...rows]
    .sort((a, b) => {
      const diff = score(b) - score(a)
      if (diff !== 0) return diff
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })[0]
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function resolveBranchName(orderRow, branchRow) {
  return (
    branchRow?.name ||
    BRANCH_NAMES[String(orderRow?.branch_id || '').trim()] ||
    String(orderRow?.branch_id || '').trim() ||
    '—'
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

  async function loadOrderDetails(orderRow) {
    const [{ data: orderItems, error: orderItemsError }, { data: branchRow }] = await Promise.all([
      supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderRow.id),
      supabase
        .from('branches')
        .select('id, name')
        .eq('id', orderRow.branch_id)
        .maybeSingle(),
    ])

    if (orderItemsError) {
      throw orderItemsError
    }

    const sortedItems = [...(orderItems || [])].sort((a, b) => {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    })

    setOrder(orderRow)
    setItems(sortedItems)
    setBranchName(resolveBranchName(orderRow, branchRow))
  }

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

    try {
      const candidates = buildSearchCandidates(searchNumber)
      const orParts = []

      for (const candidate of candidates) {
        const safe = candidate.replace(/[,%]/g, '')
        orParts.push(`short_number.eq.${safe}`)
        orParts.push(`order_number.eq.${safe}`)
        if (isUuid(safe)) {
          orParts.push(`id.eq.${safe}`)
        }
      }

      const { data: rows, error: rowsError } = await supabase
        .from('orders')
        .select('*')
        .or(orParts.join(','))
        .order('created_at', { ascending: false })
        .limit(20)

      if (rowsError) {
        throw rowsError
      }

      const bestOrder = pickBestOrder(rows || [], searchNumber)

      if (!bestOrder) {
        setError('Заказ не найден')
        return
      }

      await loadOrderDetails(bestOrder)
    } catch (e) {
      console.error('order search error', e)
      setError('Не удалось загрузить заказ')
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
          const { data: branchRow } = await supabase
            .from('branches')
            .select('id, name')
            .eq('id', updated.branch_id)
            .maybeSingle()

          setOrder(updated)
          setBranchName(resolveBranchName(updated, branchRow))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order?.id])

  const label = useMemo(() => LABELS[order?.status] || '—', [order])
  const displayNumber = order?.short_number || order?.order_number || order?.id || ''
  const createdAt = formatDateTime(order?.created_at)

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 18 }}>
      <h1>Отслеживание заказа</h1>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search()
          }}
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
          disabled={loading}
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            border: 0,
            background: '#f4a01d',
            color: '#111',
            fontWeight: 800,
            opacity: loading ? 0.8 : 1,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Поиск...' : 'Найти'}
        </button>
      </div>

      {loading ? <div style={{ color: '#c4d1f6', marginBottom: 12 }}>Ищем заказ...</div> : null}
      {error ? <div style={{ color: '#ffb4b4', marginBottom: 12 }}>{error}</div> : null}

      {order ? (
        <div style={{ background: '#0b1b45', borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{displayNumber}</div>
          <div style={{ color: '#d9e4ff', marginTop: 8 }}>Статус: {label}</div>
          <div style={{ color: '#d9e4ff', marginTop: 8 }}>Точка: {branchName}</div>
          {createdAt ? <div style={{ color: '#c4d1f6', marginTop: 8 }}>Создан: {createdAt}</div> : null}
          <div style={{ color: '#d9e4ff', marginTop: 8 }}>Сумма: {order.total} ₽</div>

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
