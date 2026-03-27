'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BRANCHES } from '@/lib/menuFallback'

const LABELS = {
  new: 'Новый',
  awaiting_call: 'Ожидает звонка',
  confirmed: 'Заказ подтверждён',
  preparing: 'Готовится',
  ready: 'Готов',
  completed: 'Выдан',
  not_picked_up: 'Не забран',
  expired: 'Истёк',
}

const BRANCH_NAME_BY_ID = Object.fromEntries(BRANCHES.map((branch) => [branch.id, branch.name]))

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return String(value)
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim())
}

function normalizeNumber(value) {
  return String(value || '').trim()
}

async function loadBranchName(branchId) {
  if (BRANCH_NAME_BY_ID[branchId]) return BRANCH_NAME_BY_ID[branchId]
  if (!supabase || !branchId) return branchId || ''
  const { data } = await supabase.from('branches').select('name').eq('id', branchId).maybeSingle()
  return data?.name || branchId
}

function pickBestOrder(rows, searchValue) {
  if (!rows?.length) return null
  const normalized = normalizeNumber(searchValue)
  const stripped = normalized.replace(/^0+/, '')

  const scored = rows.map((row) => {
    let score = 0
    const shortNum = normalizeNumber(row.short_number)
    const orderNum = normalizeNumber(row.order_number)
    const rowId = normalizeNumber(row.id)

    if (shortNum === normalized) score += 100
    if (stripped && shortNum === stripped) score += 90
    if (orderNum === normalized) score += 80
    if (normalized && orderNum.endsWith(`-${normalized}`)) score += 70
    if (stripped && orderNum.endsWith(`-${stripped}`)) score += 65
    if (rowId === normalized) score += 60

    const created = row.created_at ? new Date(row.created_at).getTime() : 0
    return { row, score, created }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.created - a.created
  })

  return scored[0]?.row || null
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
    const searchNumber = normalizeNumber(forcedNumber ?? number)
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
      const stripped = searchNumber.replace(/^0+/, '')
      const shortCandidates = Array.from(new Set([searchNumber, stripped].filter(Boolean)))
      const results = []

      if (shortCandidates.length) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .in('short_number', shortCandidates)
          .order('created_at', { ascending: false })
        if (Array.isArray(data)) results.push(...data)
      }

      const { data: exactOrderNumber } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', searchNumber)
        .order('created_at', { ascending: false })
      if (Array.isArray(exactOrderNumber)) results.push(...exactOrderNumber)

      const suffixCandidates = Array.from(new Set([searchNumber, stripped].filter(Boolean)))
      for (const suffix of suffixCandidates) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .ilike('order_number', `%-${suffix}`)
          .order('created_at', { ascending: false })
        if (Array.isArray(data)) results.push(...data)
      }

      if (isUuid(searchNumber)) {
        const { data } = await supabase.from('orders').select('*').eq('id', searchNumber).limit(1)
        if (Array.isArray(data)) results.push(...data)
      }

      const uniqueMap = new Map()
      for (const row of results) uniqueMap.set(row.id, row)
      const found = pickBestOrder(Array.from(uniqueMap.values()), searchNumber)

      if (!found) {
        setError('Заказ не найден')
        setLoading(false)
        return
      }

      const [{ data: orderItems }, resolvedBranchName] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', found.id).order('created_at', { ascending: true }),
        loadBranchName(found.branch_id),
      ])

      setOrder(found)
      setItems(orderItems || [])
      setBranchName(resolvedBranchName)
      setLoading(false)
    } catch {
      setLoading(false)
      setError('Не удалось загрузить заказ')
    }
  }

  useEffect(() => {
    const initialNumber = normalizeNumber(searchParams.get('number') || '')
    if (!initialNumber) return
    setNumber(initialNumber)
    search(initialNumber)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!supabase || !order?.id) return
    const channel = supabase
      .channel(`order-status-${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` }, async (payload) => {
        const updated = payload.new
        setOrder(updated)
        setBranchName(await loadBranchName(updated.branch_id))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order?.id])

  const summary = useMemo(() => {
    const total = (items || []).reduce((sum, item) => sum + Number(item.line_total || 0), 0)
    const count = (items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    return { total, count }
  }, [items])

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 80px' }}>
      <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 20 }}>Отслеживание заказа</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Введите номер заказа"
          style={{ flex: 1, padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: '#09183e', color: '#fff' }}
        />
        <button
          onClick={() => search()}
          disabled={loading}
          style={{ border: 0, borderRadius: 14, background: '#f4a01d', color: '#111', fontWeight: 900, padding: '0 18px', cursor: 'pointer' }}
        >
          {loading ? 'Поиск...' : 'Найти'}
        </button>
      </div>

      {error ? <div style={{ color: '#ffb4b4', marginBottom: 16 }}>{error}</div> : null}

      {order ? (
        <div style={{ background: '#081531', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 18 }}>
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            <div><span style={{ color: '#9bb0e5' }}>Номер заказа:</span> <b>{order.short_number || order.order_number || order.id}</b></div>
            <div><span style={{ color: '#9bb0e5' }}>Точка:</span> <b>{branchName || order.branch_id}</b></div>
            <div><span style={{ color: '#9bb0e5' }}>Статус:</span> <b>{LABELS[order.status] || order.status || '—'}</b></div>
            <div><span style={{ color: '#9bb0e5' }}>Создан:</span> <b>{formatDate(order.created_at)}</b></div>
            <div><span style={{ color: '#9bb0e5' }}>Позиций:</span> <b>{summary.count}</b></div>
            <div><span style={{ color: '#9bb0e5' }}>Сумма:</span> <b>{summary.total} ₽</b></div>
          </div>

          {items.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{item.item_name}</div>
                    <div style={{ color: '#c4d1f6', fontSize: 13 }}>{item.quantity} × {item.price} ₽</div>
                  </div>
                  <div style={{ fontWeight: 800 }}>{item.line_total} ₽</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#c4d1f6' }}>Состав заказа пока не загружен.</div>
          )}
        </div>
      ) : null}
    </main>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 80px' }}>Загрузка...</main>}>
      <OrderPageInner />
    </Suspense>
  )
}
