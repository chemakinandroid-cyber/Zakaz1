'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const BRANCHES = [
  { id: 'airport', name: 'На Виражах — Аэропорт' },
  { id: 'konechnaya', name: 'На Виражах — Конечная' },
]

const CATEGORY_LABELS = {
  shawarma: 'Шаурма',
  burgers: 'Бургеры',
  hotdogs: 'Хот-доги',
  shashlik: 'Шашлык',
  quesadilla: 'Кесадилья',
  fryer: 'Фритюр',
  sauces: 'Соусы',
  drinks: 'Напитки',
}

const CATEGORY_ORDER = [
  'shawarma',
  'burgers',
  'hotdogs',
  'shashlik',
  'quesadilla',
  'fryer',
  'sauces',
  'drinks',
]

const cardStyle = {
  background: 'linear-gradient(180deg, #0b1b45 0%, #081531 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
}

const CART_KEY = 'navirazhah-cart-v1'

function getStopItemId(row) {
  return row?.item_id ?? row?.menu_item_id ?? null
}

function rowMeansStopped(row) {
  if (typeof row?.is_stopped === 'boolean') return row.is_stopped
  return true
}

function readCartFromStorage() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCartToStorage(cart) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

function ProductCard({ item, onAdd }) {
  const isDisabled = Number(item.price) <= 0 || item.isStopped

  return (
    <div
      style={{
        ...cardStyle,
        display: 'grid',
        gridTemplateColumns: '110px 1fr',
        gap: 14,
      }}
    >
      <div
        style={{
          height: 110,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #1c2d63, #0e1b40)',
          border: '1px dashed rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9bb0e5',
          fontSize: 12,
          textAlign: 'center',
          padding: 8,
        }}
      >
        Фото
        <br />
        скоро
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.2 }}>
            {item.name}
          </div>

          <div
            style={{
              color: isDisabled ? '#9bb0e5' : '#ffb347',
              fontWeight: 800,
              fontSize: 22,
              whiteSpace: 'nowrap',
            }}
          >
            {Number(item.price) > 0 ? `${item.price} ₽` : '—'}
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            color: '#d9e4ff',
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          {item.description || 'Описание скоро добавим'}
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(255,179,71,0.15)',
              color: '#ffd08a',
            }}
          >
            {CATEGORY_LABELS[item.category] || item.category}
          </span>

          {item.isStopped ? (
            <span
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(255,107,107,0.15)',
                color: '#ffb4b4',
              }}
            >
              На стопе
            </span>
          ) : null}

          {!item.isStopped && Number(item.price) <= 0 ? (
            <span
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(155,176,229,0.15)',
                color: '#9bb0e5',
              }}
            >
              Скоро в продаже
            </span>
          ) : null}

          <button
            disabled={isDisabled}
            onClick={() => onAdd(item)}
            style={{
              marginLeft: 'auto',
              border: 0,
              borderRadius: 12,
              background: isDisabled ? '#475569' : '#22c55e',
              color: '#071432',
              fontWeight: 700,
              padding: '10px 14px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.6 : 1,
            }}
          >
            В корзину
          </button>
        </div>
      </div>
    </div>
  )
}

function AccordionSection({ title, items, open, onToggle, onAdd }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          background: '#f4a01d',
          color: '#111',
          border: 0,
          borderRadius: 14,
          padding: '14px 16px',
          fontWeight: 800,
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        {title} {open ? '−' : '+'}
      </button>

      {open ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <ProductCard key={item.id} item={item} onAdd={onAdd} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function CartDrawer({
  open,
  onClose,
  cart,
  total,
  branch,
  onIncrement,
  onDecrement,
  onRemove,
  onSubmit,
  submitting,
  submitError,
}) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!open) return
    const savedName = window.localStorage.getItem('navirazhah-customer-name') || ''
    const savedPhone = window.localStorage.getItem('navirazhah-customer-phone') || ''
    setCustomerName(savedName)
    setCustomerPhone(savedPhone)
  }, [open])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('navirazhah-customer-name', customerName)
  }, [customerName])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('navirazhah-customer-phone', customerPhone)
  }, [customerPhone])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 90,
        }}
      />

      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(100%, 460px)',
          background: '#071432',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 91,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Корзина</div>
              <div style={{ color: '#c4d1f6', fontSize: 14, marginTop: 4 }}>
                Точка выдачи: {BRANCHES.find((item) => item.id === branch)?.name || branch}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'transparent', color: '#fff', border: 0, fontSize: 26, cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {!cart.length ? (
            <div style={{ color: '#c4d1f6' }}>Корзина пуста</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {cart.map((item) => (
                <div key={item.id} style={{ ...cardStyle, padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ color: '#c4d1f6', marginTop: 6 }}>{item.price} ₽ × {item.quantity}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginTop: 10 }}>
                    <div style={{ fontWeight: 800, color: '#ffd08a' }}>{item.price * item.quantity} ₽</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => onDecrement(item.id)} style={qtyBtnStyle}>−</button>
                      <button onClick={() => onIncrement(item.id)} style={qtyBtnStyle}>+</button>
                      <button onClick={() => onRemove(item.id)} style={removeBtnStyle}>Убрать</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 18, ...cardStyle }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Оформление заказа</div>

            <div style={{ display: 'grid', gap: 10 }}>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ваше имя"
                style={inputStyle}
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Телефон"
                style={inputStyle}
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Комментарий к заказу"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <div style={{ color: '#c4d1f6', fontSize: 13 }}>Итого</div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>{total} ₽</div>
              </div>
              <button
                disabled={!cart.length || submitting}
                onClick={() => onSubmit({ customer_name: customerName, customer_phone: customerPhone, comment })}
                style={{
                  border: 0,
                  borderRadius: 14,
                  background: !cart.length || submitting ? '#475569' : '#f4a01d',
                  color: '#111',
                  fontWeight: 900,
                  padding: '14px 16px',
                  cursor: !cart.length || submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Оформляем...' : 'Оформить заказ'}
              </button>
            </div>

            {submitError ? <div style={{ marginTop: 10, color: '#ffb4b4' }}>{submitError}</div> : null}
          </div>
        </div>
      </aside>
    </>
  )
}

const inputStyle = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: '#081531',
  color: '#fff',
  padding: '12px 14px',
  boxSizing: 'border-box',
}

const qtyBtnStyle = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#081531',
  color: '#fff',
  borderRadius: 10,
  minWidth: 36,
  height: 36,
  cursor: 'pointer',
}

const removeBtnStyle = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,107,107,0.12)',
  color: '#fff',
  borderRadius: 10,
  padding: '0 12px',
  height: 36,
  cursor: 'pointer',
}

export default function Page() {
  const [branch, setBranch] = useState('airport')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [cart, setCart] = useState([])
  const [openMap, setOpenMap] = useState({
    shawarma: true,
    burgers: true,
    hotdogs: true,
    shashlik: false,
    quesadilla: false,
    fryer: true,
    sauces: false,
    drinks: false,
  })

  useEffect(() => {
    setCart(readCartFromStorage())
  }, [])

  useEffect(() => {
    writeCartToStorage(cart)
  }, [cart])

  useEffect(() => {
    let active = true

    async function loadMenu() {
      setLoading(true)
      setErrorText('')

      if (!supabase) {
        if (!active) return
        setItems([])
        setErrorText('Supabase не подключен')
        setLoading(false)
        return
      }

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true })

      if (!active) return

      if (menuError) {
        setItems([])
        setErrorText('Не удалось загрузить меню')
        setLoading(false)
        return
      }

      const { data: stopData, error: stopError } = await supabase
        .from('stop_list')
        .select('item_id, menu_item_id, is_stopped, branch_id')
        .eq('branch_id', branch)

      if (!active) return

      const stoppedIds = new Set(
        (stopData || [])
          .filter(rowMeansStopped)
          .map(getStopItemId)
          .filter(Boolean)
      )

      const normalizedMenu = (menuData || []).map((item) => ({
        ...item,
        isStopped: !stopError && stoppedIds.has(item.id),
      }))

      setItems(normalizedMenu)
      setLoading(false)
    }

    loadMenu()

    return () => {
      active = false
    }
  }, [branch])

  const groupedItems = useMemo(() => {
    const grouped = {}

    for (const category of CATEGORY_ORDER) {
      grouped[category] = []
    }

    for (const item of items) {
      const category = item.category || 'other'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    }

    return grouped
  }, [items])

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  )

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cart]
  )

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id)
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        )
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price || 0), quantity: 1 }]
    })
    setDrawerOpen(true)
  }

  function incrementItem(itemId) {
    setCart((prev) => prev.map((item) => item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item))
  }

  function decrementItem(itemId) {
    setCart((prev) => prev.flatMap((item) => {
      if (item.id !== itemId) return [item]
      if (item.quantity <= 1) return []
      return [{ ...item, quantity: item.quantity - 1 }]
    }))
  }

  function removeItem(itemId) {
    setCart((prev) => prev.filter((item) => item.id !== itemId))
  }

  async function submitOrder(form) {
    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: branch,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          comment: form.comment,
          items: cart,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'Не удалось оформить заказ')
      }

      setCart([])
      writeCartToStorage([])
      window.location.href = `/order?number=${encodeURIComponent(result.order.short_number)}`
    } catch (error) {
      setSubmitError(error?.message || 'Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '18px 14px 110px' }}>
        <div
          style={{
            ...cardStyle,
            padding: 18,
            marginBottom: 18,
            background: 'linear-gradient(135deg, #0f255f 0%, #071432 100%)',
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>
            На Виражах
          </div>

          <div style={{ color: '#cdd9fb', marginBottom: 14 }}>
            Полное меню с учетом стоп-листа, корзиной и оформлением заказа.
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {BRANCHES.map((b) => (
              <button
                key={b.id}
                onClick={() => setBranch(b.id)}
                style={{
                  border:
                    branch === b.id
                      ? '1px solid #f4a01d'
                      : '1px solid rgba(255,255,255,0.1)',
                  background:
                    branch === b.id
                      ? 'rgba(244,160,29,0.16)'
                      : 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {b.name}
              </button>
            ))}

            <a
              href="/order"
              style={{
                marginLeft: 'auto',
                color: '#9fd4ff',
                textDecoration: 'none',
                alignSelf: 'center',
              }}
            >
              Отследить заказ
            </a>

            <a
              href="/admin"
              style={{
                color: '#9fd4ff',
                textDecoration: 'none',
                alignSelf: 'center',
              }}
            >
              Админка
            </a>
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#cdd9fb', padding: '8px 4px 18px' }}>
            Загрузка меню...
          </div>
        ) : null}

        {!loading && errorText ? (
          <div style={{ color: '#ffb4b4', padding: '8px 4px 18px' }}>
            {errorText}
          </div>
        ) : null}

        {!loading &&
          CATEGORY_ORDER.map((categoryKey) => {
            const categoryItems = groupedItems[categoryKey] || []
            if (!categoryItems.length) return null

            return (
              <AccordionSection
                key={categoryKey}
                title={CATEGORY_LABELS[categoryKey] || categoryKey}
                items={categoryItems}
                onAdd={addToCart}
                open={!!openMap[categoryKey]}
                onToggle={() =>
                  setOpenMap((prev) => ({
                    ...prev,
                    [categoryKey]: !prev[categoryKey],
                  }))
                }
              />
            )
          })}
      </main>

      <button
        onClick={() => setDrawerOpen(true)}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 80,
          border: 0,
          borderRadius: 999,
          background: '#f4a01d',
          color: '#111',
          fontWeight: 900,
          padding: '14px 18px',
          cursor: 'pointer',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        }}
      >
        Корзина · {cartCount} · {total} ₽
      </button>

      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cart={cart}
        total={total}
        branch={branch}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
        onSubmit={submitOrder}
        submitting={submitting}
        submitError={submitError}
      />
    </>
  )
}
