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

const STORAGE_KEY = 'na-virazhah-cart-v1'

const cardStyle = {
  background: 'linear-gradient(180deg, #0b1b45 0%, #081531 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
}

function formatMoney(value) {
  return `${Number(value || 0)} ₽`
}

function readStoredCart() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredCart(value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function ProductCard({ item, onAdd }) {
  const isComingSoon = Number(item.price) <= 0

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
              color: isComingSoon ? '#9bb0e5' : '#ffb347',
              fontWeight: 800,
              fontSize: 22,
              whiteSpace: 'nowrap',
            }}
          >
            {isComingSoon ? '—' : formatMoney(item.price)}
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

          {isComingSoon ? (
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
            disabled={isComingSoon}
            onClick={() => onAdd(item)}
            style={{
              marginLeft: 'auto',
              border: 0,
              borderRadius: 12,
              background: isComingSoon ? '#475569' : '#22c55e',
              color: '#071432',
              fontWeight: 700,
              padding: '10px 14px',
              cursor: isComingSoon ? 'not-allowed' : 'pointer',
              opacity: isComingSoon ? 0.6 : 1,
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

function CartPanel({
  branch,
  cartItems,
  total,
  onIncrease,
  onDecrease,
  onRemove,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  comment,
  setComment,
  creating,
  createError,
  createSuccess,
  onSubmit,
  onClear,
}) {
  return (
    <aside
      style={{
        ...cardStyle,
        position: 'sticky',
        top: 14,
        alignSelf: 'start',
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Корзина</div>
      <div style={{ color: '#cdd9fb', marginBottom: 14 }}>Точка: {branch}</div>

      {cartItems.length === 0 ? (
        <div style={{ color: '#c4d1f6', lineHeight: 1.5 }}>
          Корзина пока пустая. Добавь позиции из меню.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
            {cartItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <button
                    onClick={() => onRemove(item.id)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      color: '#ff9f9f',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Удалить
                  </button>
                </div>
                <div style={{ color: '#cdd9fb', marginTop: 6 }}>{formatMoney(item.price)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => onDecrease(item.id)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: '#081531',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    −
                  </button>
                  <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</div>
                  <button
                    onClick={() => onIncrease(item.id)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: '#081531',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                  <div style={{ marginLeft: 'auto', fontWeight: 800 }}>
                    {formatMoney(item.price * item.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 20, fontWeight: 900 }}>
            <span>Итого</span>
            <span>{formatMoney(total)}</span>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ваше имя"
              style={{
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: '#081531',
                color: '#fff',
              }}
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Телефон"
              style={{
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: '#081531',
                color: '#fff',
              }}
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий к заказу"
              rows={3}
              style={{
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: '#081531',
                color: '#fff',
                resize: 'vertical',
              }}
            />

            {createError ? <div style={{ color: '#ffb4b4' }}>{createError}</div> : null}
            {createSuccess ? <div style={{ color: '#94f7b1' }}>{createSuccess}</div> : null}

            <button
              onClick={onSubmit}
              disabled={creating}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: 0,
                background: '#f4a01d',
                color: '#111',
                fontWeight: 900,
                cursor: creating ? 'wait' : 'pointer',
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? 'Оформляем...' : 'Оформить заказ'}
            </button>

            <button
              onClick={onClear}
              disabled={creating}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: '#081531',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Очистить корзину
            </button>
          </div>
        </>
      )}
    </aside>
  )
}

export default function Page() {
  const [branch, setBranch] = useState('airport')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
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
  const [cartByBranch, setCartByBranch] = useState({})
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [comment, setComment] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  useEffect(() => {
    setCartByBranch(readStoredCart())
  }, [])

  useEffect(() => {
    writeStoredCart(cartByBranch)
  }, [cartByBranch])

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
        .select('menu_item_id, is_stopped')
        .eq('branch_id', branch)

      if (!active) return

      if (stopError) {
        setItems(menuData || [])
        setErrorText('')
        setLoading(false)
        return
      }

      const stoppedIds = new Set(
        (stopData || [])
          .filter((row) => row.is_stopped)
          .map((row) => row.menu_item_id)
      )

      const filteredMenu = (menuData || []).filter((item) => !stoppedIds.has(item.id))

      setItems(filteredMenu)
      setLoading(false)
    }

    loadMenu()

    return () => {
      active = false
    }
  }, [branch])

  const cartItems = useMemo(() => cartByBranch[branch] || [], [cartByBranch, branch])

  const groupedItems = useMemo(() => {
    const grouped = {}
    for (const category of CATEGORY_ORDER) grouped[category] = []
    for (const item of items) {
      const category = item.category || 'other'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    }
    return grouped
  }, [items])

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cartItems]
  )

  function updateBranchCart(nextItems) {
    setCartByBranch((prev) => ({ ...prev, [branch]: nextItems }))
  }

  function addToCart(item) {
    setCreateError('')
    setCreateSuccess('')
    updateBranchCart(
      cartItems.some((cartItem) => cartItem.id === item.id)
        ? cartItems.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          )
        : [
            ...cartItems,
            {
              id: item.id,
              name: item.name,
              price: Number(item.price || 0),
              quantity: 1,
            },
          ]
    )
  }

  function increase(id) {
    updateBranchCart(
      cartItems.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    )
  }

  function decrease(id) {
    updateBranchCart(
      cartItems
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    )
  }

  function removeItem(id) {
    updateBranchCart(cartItems.filter((item) => item.id !== id))
  }

  function clearCart() {
    setCreateError('')
    setCreateSuccess('')
    updateBranchCart([])
  }

  async function submitOrder() {
    setCreateError('')
    setCreateSuccess('')

    if (!cartItems.length) {
      setCreateError('Корзина пуста')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: branch,
          customer_name: customerName,
          customer_phone: customerPhone,
          comment,
          items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity })),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setCreateError(result?.error || 'Не удалось оформить заказ')
        return
      }

      updateBranchCart([])
      setComment('')
      setCreateSuccess(`Заказ ${result?.order?.short_number || ''} успешно создан`)

      if (typeof window !== 'undefined') {
        window.location.href = `/order?number=${encodeURIComponent(result?.order?.short_number || '')}`
      }
    } catch {
      setCreateError('Не удалось оформить заказ')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main style={{ maxWidth: 1320, margin: '0 auto', padding: '18px 14px 48px' }}>
      <div
        style={{
          ...cardStyle,
          padding: 18,
          marginBottom: 18,
          background: 'linear-gradient(135deg, #0f255f 0%, #071432 100%)',
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>На Виражах</div>

        <div style={{ color: '#cdd9fb', marginBottom: 14 }}>
          Полное меню с фильтрацией по стоп-листу для выбранной точки.
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {BRANCHES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBranch(b.id)}
              style={{
                border: branch === b.id ? '1px solid #f4a01d' : '1px solid rgba(255,255,255,0.1)',
                background: branch === b.id ? 'rgba(244,160,29,0.16)' : 'rgba(255,255,255,0.03)',
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
            style={{ color: '#9fd4ff', textDecoration: 'none', alignSelf: 'center' }}
          >
            Админка
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div style={{ display: 'grid', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr)' }}>
            {loading ? (
              <div style={{ color: '#cdd9fb', padding: '8px 4px 18px' }}>Загрузка меню...</div>
            ) : null}

            {!loading && errorText ? (
              <div style={{ color: '#ffb4b4', padding: '8px 4px 18px' }}>{errorText}</div>
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
                    open={!!openMap[categoryKey]}
                    onAdd={addToCart}
                    onToggle={() =>
                      setOpenMap((prev) => ({
                        ...prev,
                        [categoryKey]: !prev[categoryKey],
                      }))
                    }
                  />
                )
              })}
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <CartPanel
              branch={BRANCHES.find((b) => b.id === branch)?.name || branch}
              cartItems={cartItems}
              total={total}
              onIncrease={increase}
              onDecrease={decrease}
              onRemove={removeItem}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              comment={comment}
              setComment={setComment}
              creating={creating}
              createError={createError}
              createSuccess={createSuccess}
              onSubmit={submitOrder}
              onClear={clearCart}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
