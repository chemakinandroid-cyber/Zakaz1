'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function OrderPageInner() {
  const searchParams = useSearchParams()
  const numberFromQuery = searchParams.get('number')

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const orderNumber = useMemo(() => {
    if (numberFromQuery) return numberFromQuery
    if (typeof window !== 'undefined') {
      return localStorage.getItem('last_order_number') || ''
    }
    return ''
  }, [numberFromQuery])

  useEffect(() => {
    async function loadOrder() {
      if (!orderNumber) {
        setError('Номер заказа не найден')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()

      if (orderError || !orderData) {
        setError('Заказ не найден')
        setLoading(false)
        return
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderData.id)
        .order('id', { ascending: true })

      if (itemsError) {
        setError('Не удалось загрузить состав заказа')
        setLoading(false)
        return
      }

      setOrder(orderData)
      setItems(itemsData || [])
      setLoading(false)
    }

    loadOrder()
  }, [orderNumber])

  if (loading) {
    return <div className="p-6">Загрузка заказа...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold mb-4">Ваш заказ</h1>

        <div className="rounded-2xl border p-4 mb-4">
          <div><b>Номер:</b> {order.order_number}</div>
          <div><b>Статус:</b> {order.status || 'new'}</div>
          {order.customer_name ? <div><b>Имя:</b> {order.customer_name}</div> : null}
          {order.customer_phone ? <div><b>Телефон:</b> {order.customer_phone}</div> : null}
          {order.comment ? <div><b>Комментарий:</b> {order.comment}</div> : null}
          <div><b>Сумма:</b> {Number(order.total_amount || 0).toFixed(2)} ₽</div>
        </div>

        <div className="rounded-2xl border p-4">
          <h2 className="text-lg font-semibold mb-3">Состав заказа</h2>

          {items.length === 0 ? (
            <div>Позиции отсутствуют</div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{item.item_name}</div>
                    <div className="text-sm text-neutral-500">
                      {item.quantity} × {Number(item.price || 0).toFixed(2)} ₽
                    </div>
                  </div>
                  <div className="font-semibold">
                    {(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)} ₽
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="p-6">Загрузка страницы заказа...</div>}>
      <OrderPageInner />
    </Suspense>
  )
}
