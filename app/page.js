'use client'

import { useEffect, useMemo, useState } from 'react'
import { FALLBACK_MENU } from '@/lib/menuFallback'

const BRANCHES = [
  {
    id: 'nv-fr-002',
    name: 'На Виражах — Аэропорт',
    phone: '+79024524222',
    address: 'Аэропорт, 7',
  },
  {
    id: 'nv-sh-001',
    name: 'На Виражах — Конечная',
    phone: '+79085932688',
    address: 'Конечная',
  },
]

const CATEGORY_LABELS = {
  shawarma: 'Шаурма',
  shawarma_addons: 'Добавки к шаурме',
  burgers: 'Бургеры',
  hotdogs: 'Хот-доги',
  shashlik: 'Шашлык',
  quesadilla: 'Кесадилья',
  fries: 'Фритюр',
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

const CART_STORAGE_KEY = 'navirazhah_cart_v3'

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
  const source = String(category || '').trim().toLowerCase()

  if (!source) return 'other'
  if (source === 'fryer') return 'fries'
  if (source === 'shawarma_addons') return 'shawarma_addons'
  if (source.includes('добав')) return 'shawarma_addons'
  if (source.includes('shawarma')) return source.includes('addon') ? 'shawarma_addons' : 'shawarma'
  if (source.includes('шаур')) return source.includes('добав') ? 'shawarma_addons' : 'shawarma'
  if (source.includes('burger') || source.includes('бургер')) return 'burgers'
  if (source.includes('hotdog') || source.includes('хот')) return 'hotdogs'
  if (source.includes('shash') || source.includes('шаш')) return 'shashlik'
  if (source.includes('ques') || source.includes('кесад')) return 'quesadilla'
  if (source.includes('fry') || source.includes('фрит') || source.includes('крыл') || source.includes('кревет') || source.includes('нагг') || source.includes('стрипс') || source.includes('палоч')) return 'fries'
  if (source.includes('sauce') || source.includes('соус')) return 'sauces'
  if (source.includes('drink') || source.includes('напит') || source.includes('чай') || source.includes('коф')) return 'drinks'

  return source
}

function matchesBranch(item, branchId) {
  if (!Array.isArray(item?.branch_ids) || item.branch_ids.length === 0) return true
  return item.branch_ids.includes(branchId)
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/["«»]/g, '')
    .replace(/[—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalName(item) {
  const raw = String(item?.name || '').trim()
  const description = String(item?.description || '').toLowerCase()
  const normalized = normalizeText(raw)

  if (normalized === 'картофель фри' || (normalized === 'картофель фри 100 гр') || (normalized === 'картофель фри 100г')) {
    return 'Картофель фри 100 г'
  }

  if (normalized === 'картофель фри' && description.includes('100')) {
    return 'Картофель фри 100 г'
  }

  if (normalized === 'ред джет' || normalized === 'шаурма ред джет' || normalized === 'шаурма ред джет курица') {
    return item.variant === 'pork' ? 'Шаурма "Ред.Джет" — свинина' : 'Шаурма "Ред.Джет" — курица'
  }

  if (normalized === 'шаурма ред.джет курица' || normalized === 'шаурма ред джет курица') {
    return 'Шаурма "Ред.Джет" — курица'
  }

  if (normalized === 'шаурма ред.джет свинина' || normalized === 'шаурма ред джет свинина') {
    return 'Шаурма "Ред.Джет" — свинина'
  }

  return raw
}

function normalizeVariant(value) {
  const source = String(value || '').trim().toLowerCase()
  if (!source) return ''
  if (source.includes('кур')) return 'chicken'
  if (source.includes('свин')) return 'pork'
  return source
}

function pickBetterItem(current, candidate) {
  const currentDesc = String(current.description || '')
  const candidateDesc = String(candidate.description || '')

  const currentScore =
    (currentDesc.length > 0 ? 2 : 0) +
    (String(current.name || '').includes('100 г') ? 1 : 0)
  const candidateScore =
    (candidateDesc.length > 0 ? 2 : 0) +
    (String(candidate.name || '').includes('100 г') ? 1 : 0)

  return candidateScore > currentScore ? candidate : current
}

function prepareMenu(rawItems, branchId) {
  const filtered = (rawItems || [])
    .filter((item) => matchesBranch(item, branchId))
    .map((item) => {
      const category = normalizeCategory(item.category)
      const variant = normalizeVariant(item.variant)
      const name = canonicalName({ ...item, variant })
      return {
        ...item,
        category,
        variant,
        name,
      }
    })
    .filter((item) => item.category !== 'shawarma_addons')
    .filter((item) => {
      const normalizedName = normalizeText(item.name)
      if (normalizedName === 'картофель фри' && !String(item.description || '').includes('100')) {
        return false
      }
      return true
    })

  const unique = new Map()

  for (const item of filtered) {
    const key = [
      item.category,
      normalizeText(item.name),
      Number(item.price || 0),
    ].join('|')

    if (!unique.has(key)) {
      unique.set(key, item)
    } else {
      unique.set(key, pickBetterItem(unique.get(key), item))
    }
  }

  return Array.from(unique.values()).sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (categoryDiff !== 0) return categoryDiff
    if (a.price !== b.price) return Number(a.price || 0) - Number(b.price || 0)
    return String(a.name || '').localeCompare(String(b.name || ''), 'ru')
  })
}

function prepareShawarmaAddons(rawItems, branchId) {
  const explicit = (rawItems || [])
    .filter((item) => matchesBranch(item, branchId))
    .map((item) => ({ ...item, category: normalizeCategory(item.category) }))
    .filter((item) => item.category === 'shawarma_addons')

  const unique = new Map()
  for (const item of explicit) {
    const name = canonicalName(item)
    const key = `${normalizeText(name)}|${Number(item.price || 0)}`
    const normalized = { ...item, name, category: 'shawarma_addons' }
    if (!unique.has(key)) {
      unique.set(key, normalized)
    } else {
      unique.set(key, pickBetterItem(unique.get(key), normalized))
    }
  }

  const preferredOrder = [
    'курица 70 г',
    'свинина 70 г',
    'картофель фри 100 г',
    'перец халапеньо',
    'огурцы маринованные',
    'сладкая горчица',
    'сыр',
    'сырный соус',
    'лук фри',
  ]

  return Array.from(unique.values()).sort((a, b) => {
    const aIdx = preferredOrder.indexOf(normalizeText(a.name))
    const bIdx = preferredOrder.indexOf(normalizeText(b.name))
    const aRank = aIdx === -1 ? 999 : aIdx
    const bRank = bIdx === -1 ? 999 : bIdx
    if (aRank !== bRank) return aRank - bRank
    if (a.price !== b.price) return Number(a.price || 0) - Number(b.price || 0)
    return String(a.name || '').localeCompare(String(b.name || ''), 'ru')
  })
}

function buildSuggestions(sourceItem, allItems, addons, cartIds) {
  if (sourceItem.category === 'shawarma') {
    const filteredAddons = addons.filter((item) => !cartIds.has(item.id))
    if (filteredAddons.length) return filteredAddons
  }

  let allowedCategories = []
  if (sourceItem.category === 'burgers' || sourceItem.category === 'hotdogs') {
    allowedCategories = ['fries', 'sauces', 'drinks']
  } else if (sourceItem.category === 'fries') {
    allowedCategories = ['sauces', 'drinks']
  } else {
    allowedCategories = ['drinks', 'sauces']
  }

  return allItems
    .filter((item) => item.id !== sourceItem.id)
    .filter((item) => !cartIds.has(item.id))
    .filter((item) => allowedCategories.includes(item.category))
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.2 }}>{item.name}</div>
          <div style={{ color: isComingSoon ? '#9bb0e5' : '#ffb347', fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap' }}>
            {isComingSoon ? '—' : formatPrice(item.price)}
          </div>
        </div>

        <div style={{ marginTop: 8, color: '#d9e4ff', fontSize: 14, lineHeight: 1.45 }}>
          {item.description || 'Описание скоро добавим'}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                <button onClick={() => onDecrease(item.id)} style={qtyButtonStyle('#1f335f', '#fff')}>−</button>
                <div style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 18 }}>{quantity}</div>
                <button onClick={() => onIncrease(item.id)} style={qtyButtonStyle('#22c55e', '#071432')}>+</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function qtyButtonStyle(background, color) {
  return {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: 0,
    background,
    color,
    fontSize: 22,
    cursor: 'pointer',
    fontWeight: 800,
  }
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
  const [addons, setAddons] = useState([])
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
  const [previewNumber, setPreviewNumber] = useState('')
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
      if (Array.isArray(parsed?.items)) setCart(parsed.items)
      if (typeof parsed?.branch === 'string' && BRANCHES.some((b) => b.id === parsed.branch)) {
        setBranch(parsed.branch)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ branch, items: cart }))
    } catch {}
  }, [branch, cart])

  useEffect(() => {
    let active = true

    async function loadMenu() {
      setLoading(true)
      setErrorText('')

      try {
        const { createClient } = await import('@supabase/supabase-js')
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!url || !key) {
          const preparedFallback = prepareMenu(FALLBACK_MENU, branch)
          const preparedAddons = prepareShawarmaAddons(FALLBACK_MENU, branch)
          if (!active) return
          setItems(preparedFallback)
          setAddons(preparedAddons)
          setErrorText('Supabase не подключен, показано резервное меню')
          setLoading(false)
          return
        }

        const supabase = createClient(url, key)
        const [{ data: menuData, error: menuError }, { data: stopData, error: stopError }] = await Promise.all([
          supabase.from('menu_items').select('*').order('name', { ascending: true }),
          supabase.from('stop_list').select('menu_item_id, is_stopped').eq('branch_id', branch),
        ])

        if (!active) return

        if (menuError) {
          const preparedFallback = prepareMenu(FALLBACK_MENU, branch)
          const preparedAddons = prepareShawarmaAddons(FALLBACK_MENU, branch)
          setItems(preparedFallback)
          setAddons(preparedAddons)
          setErrorText('Не удалось загрузить меню из Supabase, показано резервное меню')
          setLoading(false)
          return
        }

        const stoppedIds = new Set(
          (stopData || []).filter((row) => row.is_stopped).map((row) => row.menu_item_id)
        )

        if (stopError) console.error(stopError)

        const available = (menuData || []).filter((item) => !stoppedIds.has(item.id))
        setItems(prepareMenu(available, branch))
        setAddons(prepareShawarmaAddons(available, branch))
        setLoading(false)
      } catch {
        if (!active) return
        const preparedFallback = prepareMenu(FALLBACK_MENU, branch)
        const preparedAddons = prepareShawarmaAddons(FALLBACK_MENU, branch)
        setItems(preparedFallback)
        setAddons(preparedAddons)
        setErrorText('Не удалось загрузить меню, показано резервное меню')
        setLoading(false)
      }
    }

    loadMenu()
    return () => {
      active = false
    }
  }, [branch])

  useEffect(() => {
    const availableIds = new Set([...items, ...addons].map((item) => item.id))
    setCart((prev) => prev.filter((item) => availableIds.has(item.id)))
  }, [items, addons])

  useEffect(() => {
    if (!checkoutOpen) return
    let active = true

    async function loadPreviewNumber() {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key) {
          setPreviewNumber('0001')
          return
        }
        const supabase = createClient(url, key)
        const { data, error } = await supabase
          .from('orders')
          .select('short_number, created_at')
          .eq('branch_id', branch)
          .order('created_at', { ascending: false })
          .limit(200)

        if (!active) return
        if (error) {
          setPreviewNumber('0001')
          return
        }

        const values = (data || [])
          .map((row) => String(row.short_number || '').trim())
          .filter((value) => /^\d{4}$/.test(value))
          .map((value) => Number(value))

        const next = (values.length ? Math.max(...values) : 0) + 1
        setPreviewNumber(String(next).padStart(4, '0'))
      } catch {
        if (!active) return
        setPreviewNumber('0001')
      }
    }

    loadPreviewNumber()
    return () => {
      active = false
    }
  }, [branch, checkoutOpen])

  const groupedItems = useMemo(() => {
    const grouped = {}
    for (const category of CATEGORY_ORDER) grouped[category] = []
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    }
    return grouped
  }, [items])

  const cartSummary = useMemo(() => {
    const byId = new Map([...items, ...addons].map((item) => [item.id, item]))
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
        return { ...source, quantity, lineTotal }
      })
      .filter(Boolean)

    return { items: normalized, count, total }
  }, [cart, items, addons])

  const currentBranch = BRANCHES.find((b) => b.id === branch) || BRANCHES[0]

  function getQuantity(itemId) {
    return cart.find((item) => item.id === itemId)?.quantity || 0
  }

  function openSuggestionsFor(item, nextCart) {
    const cartIds = new Set(nextCart.map((x) => x.id))
    const nextSuggestions = buildSuggestions(item, items, addons, cartIds)
    if (!nextSuggestions.length) return
    setSuggestionsSource(item)
    setSuggestions(nextSuggestions)
    setSuggestionsOpen(true)
  }

  function addToCart(item, options = { openSuggestions: true }) {
    let nextCart = []
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id)
      nextCart = existing
        ? prev.map((entry) => (entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry))
        : [...prev, { id: item.id, quantity: 1 }]
      return nextCart
    })

    if (options.openSuggestions) {
      setTimeout(() => {
        openSuggestionsFor(item, nextCart.length ? nextCart : [...cart, { id: item.id, quantity: 1 }])
      }, 0)
    }
  }

  function increaseQuantity(itemId) {
    setCart((prev) => prev.map((entry) => (entry.id === itemId ? { ...entry, quantity: entry.quantity + 1 } : entry)))
  }

  function decreaseQuantity(itemId) {
    setCart((prev) => prev.map((entry) => (entry.id === itemId ? { ...entry, quantity: entry.quantity - 1 } : entry)).filter((entry) => entry.quantity > 0))
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((entry) => entry.id !== itemId))
  }

  function clearCart() {
    setCart([])
  }

  async function submitOrder() {
    setSubmitError('')

    if (!cartSummary.items.length) return setSubmitError('Корзина пуста')
    if (!customerName.trim()) return setSubmitError('Укажите имя')
    if (!customerPhone.trim()) return setSubmitError('Укажите телефон')

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
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ branch, items: [] }))
      } catch {}

      const orderNumber = result?.short_number ?? result?.order?.short_number ?? result?.order?.order_number ?? result?.order?.id
      window.location.href = orderNumber ? `/order?number=${encodeURIComponent(orderNumber)}` : '/order'
    } catch {
      setSubmitError('Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '18px 14px 120px' }}>
      <div style={{ ...cardStyle, padding: 18, marginBottom: 18, background: 'linear-gradient(135deg, #0f255f 0%, #071432 100%)' }}>
        <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>На Виражах</div>
        <div style={{ color: '#cdd9fb', marginBottom: 14 }}>Полное меню с фильтрацией по стоп-листу для выбранной точки.</div>
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

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/order" style={{ color: '#d9e4ff', textDecoration: 'none' }}>Отследить заказ</a>
            <a href="/admin" style={{ color: '#d9e4ff', textDecoration: 'none' }}>Админка</a>
          </div>
        </div>
      </div>

      {errorText ? <div style={{ color: '#ffd6a0', marginBottom: 12 }}>{errorText}</div> : null}
      {loading ? <div style={{ color: '#d9e4ff' }}>Загрузка меню...</div> : null}

      {!loading && CATEGORY_ORDER.map((category) => {
        const categoryItems = groupedItems[category] || []
        if (!categoryItems.length) return null
        return (
          <AccordionSection
            key={category}
            title={CATEGORY_LABELS[category] || category}
            items={categoryItems}
            open={Boolean(openMap[category])}
            onToggle={() => setOpenMap((prev) => ({ ...prev, [category]: !prev[category] }))}
            getQuantity={getQuantity}
            onAdd={addToCart}
            onIncrease={increaseQuantity}
            onDecrease={decreaseQuantity}
          />
        )
      })}

      {cartSummary.count > 0 ? (
        <div style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 50 }}>
          <div style={{ ...cardStyle, padding: 14, background: 'rgba(6,15,36,0.95)', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>В корзине: {cartSummary.count}</div>
                <div style={{ color: '#d9e4ff' }}>На сумму {formatPrice(cartSummary.total)}</div>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                style={{ marginLeft: 'auto', border: 0, borderRadius: 14, background: '#f4a01d', color: '#111', fontWeight: 900, padding: '14px 18px', cursor: 'pointer' }}
              >
                Оформить заказ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {suggestionsOpen ? (
        <div onClick={() => setSuggestionsOpen(false)} style={overlayStyle(65)}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle(820)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Добавить к заказу</div>
                <div style={{ color: '#c4d1f6', marginTop: 6 }}>
                  {suggestionsSource?.category === 'shawarma' ? 'Показываем именно добавки к шаурме.' : 'Подходящие дополнения к выбранной позиции.'}
                </div>
              </div>
              <button onClick={() => setSuggestionsOpen(false)} style={closeStyle}>×</button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {suggestions.map((item) => (
                <div key={item.id} style={suggestionRowStyle}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{item.name}</div>
                    <div style={{ color: '#c4d1f6', fontSize: 13 }}>{(CATEGORY_LABELS[item.category] || item.category)} · {formatPrice(item.price)}</div>
                  </div>
                  <button onClick={() => addToCart(item, { openSuggestions: false })} style={greenButtonSmall}>Добавить</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button onClick={() => setSuggestionsOpen(false)} style={ghostButton}>Продолжить без добавок</button>
              <button onClick={() => { setSuggestionsOpen(false); setCheckoutOpen(true) }} style={orangeButton}>Перейти к оформлению</button>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div onClick={() => setCheckoutOpen(false)} style={overlayStyle(60)}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle(720)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Оформление заказа {previewNumber || '—'}</div>
              <button onClick={() => setCheckoutOpen(false)} style={closeStyle}>×</button>
            </div>

            <div style={{ color: '#c4d1f6', marginTop: 8 }}>Точка: {currentBranch.name}</div>
            <div style={{ color: '#ffd08a', marginTop: 8, marginBottom: 16, lineHeight: 1.4 }}>
              После звонка администратору по номеру {currentBranch.phone}{currentBranch.address ? ` ${currentBranch.address}` : ''}, назовите номер своего заказа для подтверждения.
            </div>

            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              {cartSummary.items.map((item) => (
                <div key={item.id} style={checkoutRowStyle}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: '#c4d1f6', fontSize: 13 }}>{formatPrice(item.price)} × {item.quantity}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => decreaseQuantity(item.id)} style={qtyButtonStyle('#1f335f', '#fff')}>−</button>
                    <div style={{ minWidth: 20, textAlign: 'center', fontWeight: 800 }}>{item.quantity}</div>
                    <button onClick={() => increaseQuantity(item.id)} style={qtyButtonStyle('#22c55e', '#071432')}>+</button>
                    <button onClick={() => removeFromCart(item.id)} style={removeBtnStyle}>Удалить</button>
                    <div style={{ minWidth: 72, textAlign: 'right', fontWeight: 800 }}>{formatPrice(item.lineTotal)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ваше имя" style={inputStyle} />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Телефон" style={inputStyle} />
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий к заказу" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {submitError ? <div style={{ color: '#ffb4b4', marginTop: 12 }}>{submitError}</div> : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#c4d1f6' }}>Итого</div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>{formatPrice(cartSummary.total)}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={clearCart} style={ghostButton}>Очистить корзину</button>
                <button disabled={submitting} onClick={submitOrder} style={{ ...greenButton, background: submitting ? '#64748b' : '#22c55e' }}>
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

const overlayStyle = (zIndex) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  zIndex,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  padding: 12,
})

const modalStyle = (maxWidth) => ({
  width: '100%',
  maxWidth,
  maxHeight: '90vh',
  overflow: 'auto',
  background: '#081531',
  borderRadius: 22,
  border: '1px solid rgba(255,255,255,0.08)',
  padding: 18,
})

const closeStyle = {
  background: 'transparent',
  border: 0,
  color: '#fff',
  fontSize: 28,
  cursor: 'pointer',
}

const suggestionRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  padding: '12px 14px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const greenButtonSmall = {
  border: 0,
  borderRadius: 12,
  background: '#22c55e',
  color: '#071432',
  fontWeight: 900,
  padding: '10px 14px',
  cursor: 'pointer',
}

const orangeButton = {
  border: 0,
  borderRadius: 14,
  background: '#f4a01d',
  color: '#111',
  fontWeight: 900,
  padding: '12px 16px',
  cursor: 'pointer',
}

const ghostButton = {
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  background: 'transparent',
  color: '#fff',
  fontWeight: 700,
  padding: '12px 16px',
  cursor: 'pointer',
}

const greenButton = {
  border: 0,
  borderRadius: 14,
  color: '#071432',
  fontWeight: 900,
  padding: '14px 20px',
  cursor: 'pointer',
}

const checkoutRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 12,
  flexWrap: 'wrap',
}

const removeBtnStyle = {
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  color: '#ffd6d6',
  fontWeight: 800,
  padding: '10px 12px',
  cursor: 'pointer',
}

const inputStyle = {
  padding: 14,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0b1b45',
  color: '#fff',
}
