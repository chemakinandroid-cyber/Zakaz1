'use client'

import { useEffect, useMemo, useState } from 'react'

const BRANCHES = [
  { id: 'nv-fr-002', name: 'На Виражах — Аэропорт' },
  { id: 'nv-sh-001', name: 'На Виражах — Конечная' },
]

const CATEGORY_LABELS = {
  shawarma: 'Шаурма',
  burgers: 'Бургеры',
  hotdogs: 'Хот-доги',
  shashlik: 'Шашлык',
  quesadilla: 'Кесадилья',
  fries: 'Фритюр',
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
  'fries',
  'sauces',
  'drinks',
]

const CART_STORAGE_KEY = 'navirazhah_cart_v2'

const cardStyle = {
  background: 'linear-gradient(180deg, #0b1b45 0%, #081531 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
}

function formatPrice(value) {
  return `${Number(value || 0)} ₽`
}

function normalizeCategory(category) {
  return category === 'fryer' ? 'fries' : category
}

function matchesBranch(item, branchId) {
  if (!Array.isArray(item?.branch_ids) || item.branch_ids.length === 0) return true
  return item.branch_ids.includes(branchId)
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function isShawarmaAddon(item) {
  const joined = [
    item?.category,
    item?.subcategory,
    item?.group,
    item?.group_name,
    item?.section,
    item?.type,
    item?.tags,
    item?.name,
    item?.description,
  ]
    .map(normalizeText)
    .join(' ')

  if (!joined) return false

  return (
    joined.includes('shawarma_addons') ||
    joined.includes('shawarma-addons') ||
    joined.includes('добавки к шаурме') ||
    joined.includes('добавка к шаурме') ||
    joined.includes('добавки для шаурмы') ||
    joined.includes('добавка для шаурмы')
  )
}

function buildSuggestions(sourceItem, allItems, cartIds) {
  const normalizedSourceCategory = normalizeCategory(sourceItem.category)
  const sourceVariant = sourceItem.variant || null

  let suggestions = []

  if (normalizedSourceCategory === 'shawarma') {
    suggestions = allItems.filter((item) => {
      if (item.id === sourceItem.id) return false
      if (cartIds.has(item.id)) return false
      if (Number(item.price) <= 0) return false
      if (!isShawarmaAddon(item)) return false

      if (sourceVariant === 'chicken' && item.variant === 'pork') return false
      if (sourceVariant === 'pork' && item.variant === 'chicken') return false

      return true
    })

    if (!suggestions.length) {
      suggestions = allItems.filter((item) => {
        if (item.id === sourceItem.id) return false
        if (cartIds.has(item.id)) return false
        if (Number(item.price) <= 0) return false

        const normalizedItemCategory = normalizeCategory(item.category)
        if (!['sauces', 'drinks'].includes(normalizedItemCategory)) return false

        if (sourceVariant === 'chicken' && item.variant === 'pork') return false
        if (sourceVariant === 'pork' && item.variant === 'chicken') return false

        return true
      })
    }
  } else {
    let allowedCategories = []
    if (normalizedSourceCategory === 'burgers' || normalizedSourceCategory === 'hotdogs') {
      allowedCategories = ['fries', 'sauces', 'drinks']
    } else if (normalizedSourceCategory === 'fries') {
      allowedCategories = ['sauces', 'drinks']
    } else {
      allowedCategories = ['drinks', 'sauces']
    }

    suggestions = allItems.filter((item) => {
      if (item.id === sourceItem.id) return false
      if (cartIds.has(item.id)) return false
      if (Number(item.price) <= 0) return false

      const normalizedItemCategory = normalizeCategory(item.category)
      if (!allowedCategories.includes(normalizedItemCategory)) return false

      if (sourceVariant === 'chicken' && item.variant === 'pork') return false
      if (sourceVariant === 'pork' && item.variant === 'chicken') return false

      return true
    })
  }

  const categoryPriority = {
    shawarma_addons: 1,
    sauces: 2,
    drinks: 3,
    fries: 4,
  }

  return suggestions
    .sort((a, b) => {
      const ca = categoryPriority[normalizeCategory(a.category)] || (isShawarmaAddon(a) ? 1 : 99)
      const cb = categoryPriority[normalizeCategory(b.category)] || (isShawarmaAddon(b) ? 1 : 99)
      if (ca !== cb) return ca - cb
      return Number(a.price || 0) - Number(b.price || 0)
    })
    .slice(0, 6)
}

function ProductCard({ item, quantity, onAdd, onIncrease, onDecrease }) {
  const isComingSoon = Boolean(item.coming_soon) || Number(item.price) <= 0
  const inCart = quantity > 0

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
            {isComingSoon ? '—' : formatPrice(item.price)}
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
            {CATEGORY_LABELS[normalizeCategory(item.category)] || item.category}
          </span>

          {item.variant ? (
            <span
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                color: '#d9e4ff',
              }}
            >
              {item.variant === 'chicken' ? 'Курица' : item.variant === 'pork' ? 'Свинина' : item.variant}
            </span>
          ) : null}

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
        </div>

        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          <button
            disabled={isComingSoon}
            onClick={() => {
              if (!inCart) onAdd(item)
            }}
            style={{
              width: '100%',
              border: 0,
              borderRadius: 12,
              background: isComingSoon ? '#475569' : inCart ? '#f4a01d' : '#22c55e',
              color: isComingSoon ? '#dbe5f9' : '#071432',
              fontWeight: 800,
              padding: '12px 14px',
              cursor: isComingSoon ? 'not-allowed' : inCart ? 'default' : 'pointer',
              opacity: isComingSoon ? 0.6 : 1,
            }}
          >
            {inCart ? 'В корзине' : 'В корзину'}
          </button>

          {inCart ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '8px 10px',
              }}
            >
              <div style={{ color: '#d9e4ff', fontSize: 13 }}>Количество в корзине</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => onDecrease(item.id)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: 0,
                    background: '#1f335f',
                    color: '#fff',
                    fontSize: 22,
                    cursor: 'pointer',
                  }}
                >
                  −
                </button>
                <div style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 18 }}>
                  {quantity}
                </div>
                <button
                  onClick={() => onIncrease(item.id)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: 0,
                    background: '#22c55e',
                    color: '#071432',
                    fontSize: 22,
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AccordionSection({ title, items, open, onToggle, getQuantity, onAdd, onIncrease, onDecrease }) {
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
            <ProductCard
              key={item.id}
              item={item}
              quantity={getQuantity(item.id)}
              onAdd={onAdd}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default function Page() {
  const [branch, setBranch] = useState(BRANCHES[0].id)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [cart, setCart] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsSource, setSuggestionsSource] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [comment, setComment] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [openMap, setOpenMap] = useState({
    shawarma: true,
    burgers: true,
    hotdogs: true,
    shashlik: false,
    quesadilla: false,
    fries: true,
    sauces: false,
    drinks: false,
  })

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)

      if (Array.isArray(parsed?.items)) {
        setCart(parsed.items)
      }

      const rawSavedBranch = parsed?.branch
      const savedBranch = typeof rawSavedBranch === 'string' ? rawSavedBranch : BRANCHES[0].id

      if (BRANCHES.some((b) => b.id === savedBranch)) {
        setBranch(savedBranch)
      } else {
        setBranch(BRANCHES[0].id)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ branch, items: cart })
      )
    } catch {}
  }, [branch, cart])

  useEffect(() => {
    let active = true

    async function loadMenu() {
      setLoading(true)
      setErrorText('')

      const { createClient } = await import('@supabase/supabase-js')
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key) {
        if (!active) return
        setItems([])
        setErrorText('Supabase не подключен')
        setLoading(false)
        return
      }

      const supabase = createClient(url, key)

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

      const stoppedIds = new Set(
        (stopData || [])
          .filter((row) => row.is_stopped)
          .map((row) => row.menu_item_id)
      )

      if (stopError) {
        console.error(stopError)
      }

      const filteredMenu = (menuData || [])
        .filter((item) => matchesBranch(item, branch))
        .filter((item) => !stoppedIds.has(item.id))
        .map((item) => ({
          ...item,
          category: normalizeCategory(item.category),
        }))

      setItems(filteredMenu)
      setLoading(false)
    }

    loadMenu()

    return () => {
      active = false
    }
  }, [branch])

  useEffect(() => {
    const availableIds = new Set(items.map((item) => item.id))
    setCart((prev) => prev.filter((item) => availableIds.has(item.id)))
  }, [items])

  const groupedItems = useMemo(() => {
    const grouped = {}

    for (const category of CATEGORY_ORDER) {
      grouped[category] = []
    }

    for (const item of items) {
      const category = normalizeCategory(item.category || 'other')
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    }

    return grouped
  }, [items])

  const cartSummary = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]))
    let count = 0
    let total = 0

    const normalized = cart
      .map((entry) => {
        const source = byId.get(entry.id)
        if (!source) return null
        const quantity = Number(entry.quantity || 0)
        if (quantity <= 0) return null
        const lineTotal = Number(source.price || 0) * quantity
        count += quantity
        total += lineTotal
        return {
          ...source,
          quantity,
          lineTotal,
        }
      })
      .filter(Boolean)

    return { items: normalized, count, total }
  }, [cart, items])

  function getQuantity(itemId) {
    return cart.find((item) => item.id === itemId)?.quantity || 0
  }

  function openSuggestionsFor(item, nextCart) {
    const cartIds = new Set(nextCart.map((x) => x.id))
    const nextSuggestions = buildSuggestions(item, items, cartIds)
    if (!nextSuggestions.length) return
    setSuggestionsSource(item)
    setSuggestions(nextSuggestions)
    setSuggestionsOpen(true)
  }

  function addToCart(item, options = { openSuggestions: true }) {
    let nextCart = []
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id)
      if (existing) {
        nextCart = prev.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        )
      } else {
        nextCart = [...prev, { id: item.id, quantity: 1 }]
      }
      return nextCart
    })

    if (options.openSuggestions) {
      setTimeout(() => {
        openSuggestionsFor(item, nextCart.length ? nextCart : [...cart, { id: item.id, quantity: 1 }])
      }, 0)
    }
  }

  function increaseQuantity(itemId) {
    setCart((prev) =>
      prev.map((entry) =>
        entry.id === itemId ? { ...entry, quantity: entry.quantity + 1 } : entry
      )
    )
  }

  function decreaseQuantity(itemId) {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.id === itemId ? { ...entry, quantity: entry.quantity - 1 } : entry
        )
        .filter((entry) => entry.quantity > 0)
    )
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((entry) => entry.id !== itemId))
  }

  function clearCart() {
    setCart([])
    setSuggestionsOpen(false)
  }

  async function submitOrder() {
    setSubmitError('')

    if (!cartSummary.items.length) {
      setSubmitError('Корзина пуста')
      return
    }

    if (!customerName.trim()) {
      setSubmitError('Укажите имя')
      return
    }

    if (!customerPhone.trim()) {
      setSubmitError('Укажите телефон')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: branch,
          customer_name: customerName,
          customer_phone: customerPhone,
          comment,
          items: cartSummary.items.map((item) => ({ id: item.id, quantity: item.quantity })),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setSubmitError(result?.error || 'Не удалось оформить заказ')
        return
      }

      setCart([])
      setCheckoutOpen(false)
      setSuggestionsOpen(false)
      setCustomerName('')
      setCustomerPhone('')
      setComment('')
      try {
        window.localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({ branch, items: [] })
        )
      } catch {}

      const orderNumber =
        result?.short_number ??
        result?.order?.short_number ??
        result?.order?.order_number ??
        result?.order?.id

      if (orderNumber) {
        window.location.href = `/order?number=${encodeURIComponent(orderNumber)}`
        return
      }

      window.location.href = '/order'
    } catch {
      setSubmitError('Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '18px 14px 120px' }}>
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

      {loading ? <div style={{ color: '#cdd9fb', padding: '8px 4px 18px' }}>Загрузка меню...</div> : null}
      {!loading && errorText ? <div style={{ color: '#ffb4b4', padding: '8px 4px 18px' }}>{errorText}</div> : null}

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
              getQuantity={getQuantity}
              onAdd={addToCart}
              onIncrease={increaseQuantity}
              onDecrease={decreaseQuantity}
              onToggle={() =>
                setOpenMap((prev) => ({
                  ...prev,
                  [categoryKey]: !prev[categoryKey],
                }))
              }
            />
          )
        })}

      {cartSummary.count > 0 ? (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 12,
            background: 'rgba(8,21,49,0.96)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 18,
            padding: 14,
            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
            zIndex: 50,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>В корзине: {cartSummary.count}</div>
              <div style={{ color: '#d9e4ff' }}>На сумму {formatPrice(cartSummary.total)}</div>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              style={{
                marginLeft: 'auto',
                border: 0,
                borderRadius: 14,
                background: '#f4a01d',
                color: '#111',
                fontWeight: 900,
                padding: '14px 18px',
                cursor: 'pointer',
              }}
            >
              Оформить заказ
            </button>
          </div>
        </div>
      ) : null}

      {suggestionsOpen ? (
        <div
          onClick={() => setSuggestionsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 65,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 820,
              maxHeight: '85vh',
              overflow: 'auto',
              background: '#081531',
              borderRadius: 22,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Добавить к заказу</div>
                <div style={{ color: '#c4d1f6', marginTop: 6 }}>
                  {suggestionsSource?.category === 'shawarma'
                    ? 'Сначала показываем именно добавки к шаурме из меню.'
                    : 'Подходящие дополнения к выбранной позиции.'}
                </div>
              </div>
              <button
                onClick={() => setSuggestionsOpen(false)}
                style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 28, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>{item.name}</div>
                    <div style={{ color: '#c4d1f6', fontSize: 13 }}>
                      {(CATEGORY_LABELS[item.category] || item.category)} · {formatPrice(item.price)}
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(item, { openSuggestions: false })}
                    style={{
                      border: 0,
                      borderRadius: 12,
                      background: '#22c55e',
                      color: '#071432',
                      fontWeight: 900,
                      padding: '10px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Добавить
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button
                onClick={() => setSuggestionsOpen(false)}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  background: 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '12px 16px',
                  cursor: 'pointer',
                }}
              >
                Продолжить без добавок
              </button>
              <button
                onClick={() => {
                  setSuggestionsOpen(false)
                  setCheckoutOpen(true)
                }}
                style={{
                  border: 0,
                  borderRadius: 14,
                  background: '#f4a01d',
                  color: '#111',
                  fontWeight: 900,
                  padding: '12px 16px',
                  cursor: 'pointer',
                }}
              >
                Перейти к оформлению
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div
          onClick={() => setCheckoutOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflow: 'auto',
              background: '#081531',
              borderRadius: 22,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Оформление заказа</div>
              <button
                onClick={() => setCheckoutOpen(false)}
                style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 28, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ color: '#c4d1f6', marginTop: 8, marginBottom: 16 }}>
              Точка: {BRANCHES.find((b) => b.id === branch)?.name || branch}
            </div>

            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              {cartSummary.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 220, flex: '1 1 240px' }}>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: '#c4d1f6', fontSize: 13 }}>
                      {formatPrice(item.price)} × {item.quantity}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: 0,
                        background: '#1f335f',
                        color: '#fff',
                        fontSize: 22,
                        cursor: 'pointer',
                      }}
                    >
                      −
                    </button>
                    <div style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 18 }}>
                      {item.quantity}
                    </div>
                    <button
                      onClick={() => increaseQuantity(item.id)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: 0,
                        background: '#22c55e',
                        color: '#071432',
                        fontSize: 22,
                        cursor: 'pointer',
                        fontWeight: 800,
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 10,
                        background: 'transparent',
                        color: '#ffb4b4',
                        fontWeight: 800,
                        padding: '9px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      Удалить
                    </button>
                  </div>

                  <div style={{ fontWeight: 800, minWidth: 90, textAlign: 'right' }}>
                    {formatPrice(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ваше имя"
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: '#0b1b45',
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
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: '#0b1b45',
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
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: '#0b1b45',
                  color: '#fff',
                  resize: 'vertical',
                }}
              />
            </div>

            {submitError ? <div style={{ color: '#ffb4b4', marginTop: 12 }}>{submitError}</div> : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#c4d1f6' }}>Итого</div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>{formatPrice(cartSummary.total)}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
                <button
                  onClick={clearCart}
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14,
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 800,
                    padding: '14px 18px',
                    cursor: 'pointer',
                  }}
                >
                  Очистить корзину
                </button>
                <button
                  disabled={submitting}
                  onClick={submitOrder}
                  style={{
                    border: 0,
                    borderRadius: 14,
                    background: submitting ? '#64748b' : '#22c55e',
                    color: '#071432',
                    fontWeight: 900,
                    padding: '14px 20px',
                    cursor: submitting ? 'default' : 'pointer',
                  }}
                >
                  {submitting ? 'Оформляем...' : 'Подтвердить заказ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
