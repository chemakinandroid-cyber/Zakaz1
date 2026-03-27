'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BRANCHES, BRANCH_CONTACTS, CATEGORY_LABELS, FALLBACK_MENU } from '@/lib/menuFallback'

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

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/["'`«»]/g, '')
    .replace(/[—–-]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCategory(category, name = '') {
  const raw = normalizeText(category)
  const rawName = normalizeText(name)

  if (raw === 'fryer' || raw === 'fries' || raw.includes('фрит')) return 'fryer'
  if (raw === 'shawarma' || raw.includes('шаур')) return 'shawarma'
  if (raw.includes('burger') || raw.includes('бург')) return 'burgers'
  if (raw.includes('hot') || raw.includes('хот') || raw.includes('дог')) return 'hotdogs'
  if (raw.includes('sauce') || raw.includes('соус')) return 'sauces'
  if (raw.includes('drink') || raw.includes('напит')) return 'drinks'
  if (raw.includes('shash') || raw.includes('шаш')) return 'shashlik'
  if (raw.includes('ques') || raw.includes('кесад')) return 'quesadilla'
  if (raw.includes('addon') || raw.includes('добав')) return 'shawarma_addons'

  if (rawName.includes('шаурма')) return 'shawarma'
  if (rawName.includes('бургер')) return 'burgers'
  if (rawName.includes('хот') || rawName.includes('датский') || rawName.includes('австрийский')) return 'hotdogs'
  if (rawName.includes('шашлык')) return 'shashlik'
  if (rawName.includes('кесад')) return 'quesadilla'
  if (rawName.includes('соус')) return 'sauces'
  if (rawName.includes('чай') || rawName.includes('кофе') || rawName.includes('морс') || rawName.includes('лимонад')) return 'drinks'

  return raw || 'other'
}

function inferVariant(item) {
  const own = normalizeText(item?.variant)
  const text = `${normalizeText(item?.name)} ${normalizeText(item?.description)}`
  if (own === 'chicken' || own.includes('кур')) return 'chicken'
  if (own === 'pork' || own.includes('свин')) return 'pork'
  if (text.includes('кур')) return 'chicken'
  if (text.includes('свин')) return 'pork'
  return ''
}

function matchesBranch(item, branchId) {
  if (!Array.isArray(item?.branch_ids) || item.branch_ids.length === 0) return true
  return item.branch_ids.includes(branchId)
}

function itemKey(item) {
  return [
    normalizeCategory(item.category, item.name),
    normalizeText(item.name),
    inferVariant(item),
    Number(item.price || 0),
  ].join('|')
}

function chooseBetterItem(a, b) {
  const score = (item) => {
    let total = 0
    if (item.description) total += Math.min(String(item.description).length, 300)
    if (Array.isArray(item.branch_ids) && item.branch_ids.length) total += 20
    if (!item.coming_soon) total += 10
    if (item.category === 'shawarma_addons') total += 5
    return total
  }
  return score(b) > score(a) ? b : a
}

function dedupeItems(items) {
  const map = new Map()
  for (const item of items) {
    const key = itemKey(item)
    const existing = map.get(key)
    map.set(key, existing ? chooseBetterItem(existing, item) : item)
  }
  return Array.from(map.values())
}

function mergeWithFallback(dbItems) {
  const fallbackMap = new Map(FALLBACK_MENU.map((item) => [itemKey(item), item]))

  const normalizedDb = dbItems.map((item) => {
    const normalized = {
      ...item,
      category: normalizeCategory(item.category, item.name),
      variant: inferVariant(item),
    }
    const fb = fallbackMap.get(itemKey(normalized))
    return {
      ...fb,
      ...normalized,
      category: normalized.category || fb?.category || 'other',
      variant: normalized.variant || fb?.variant || '',
      description: normalized.description || fb?.description || '',
      price: Number(normalized.price ?? fb?.price ?? 0),
      branch_ids: Array.isArray(normalized.branch_ids) ? normalized.branch_ids : fb?.branch_ids,
    }
  })

  const haveAddonCategory = normalizedDb.some((item) => item.category === 'shawarma_addons')
  const combined = haveAddonCategory ? normalizedDb : [...normalizedDb, ...FALLBACK_MENU.filter((item) => item.category === 'shawarma_addons')]

  return dedupeItems(combined)
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const aCategory = CATEGORY_ORDER.indexOf(normalizeCategory(a.category, a.name))
    const bCategory = CATEGORY_ORDER.indexOf(normalizeCategory(b.category, b.name))
    if (aCategory !== bCategory) return (aCategory === -1 ? 99 : aCategory) - (bCategory === -1 ? 99 : bCategory)
    return normalizeText(a.name).localeCompare(normalizeText(b.name), 'ru')
  })
}

function buildSuggestions(sourceItem, allItems, cartIds) {
  const sourceCategory = normalizeCategory(sourceItem.category, sourceItem.name)
  const sourceVariant = inferVariant(sourceItem)

  let candidates = []

  if (sourceCategory === 'shawarma') {
    candidates = allItems.filter((item) => normalizeCategory(item.category, item.name) === 'shawarma_addons')

    if (sourceVariant === 'chicken') {
      candidates = candidates.filter((item) => inferVariant(item) !== 'pork')
    }
    if (sourceVariant === 'pork') {
      candidates = candidates.filter((item) => inferVariant(item) !== 'chicken')
    }
  } else if (sourceCategory === 'burgers' || sourceCategory === 'hotdogs') {
    candidates = allItems.filter((item) => ['fryer', 'sauces', 'drinks'].includes(normalizeCategory(item.category, item.name)))
  } else if (sourceCategory === 'fryer') {
    candidates = allItems.filter((item) => ['sauces', 'drinks'].includes(normalizeCategory(item.category, item.name)))
  } else {
    candidates = allItems.filter((item) => ['sauces', 'drinks'].includes(normalizeCategory(item.category, item.name)))
  }

  return sortItems(
    candidates.filter((item) => item.id !== sourceItem.id && !cartIds.has(item.id) && Number(item.price || 0) > 0)
  ).slice(0, 8)
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
          <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: 'rgba(255,179,71,0.15)', color: '#ffd08a' }}>
            {CATEGORY_LABELS[normalizeCategory(item.category, item.name)] || item.category}
          </span>

          {inferVariant(item) ? (
            <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: '#d9e4ff' }}>
              {inferVariant(item) === 'chicken' ? 'Курица' : inferVariant(item) === 'pork' ? 'Свинина' : inferVariant(item)}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 10px' }}>
              <div style={{ color: '#d9e4ff', fontSize: 13 }}>Количество в корзине</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => onDecrease(item.id)} style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: '#1f335f', color: '#fff', fontSize: 22, cursor: 'pointer' }}>−</button>
                <div style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 18 }}>{quantity}</div>
                <button onClick={() => onIncrease(item.id)} style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: '#22c55e', color: '#071432', fontSize: 22, cursor: 'pointer', fontWeight: 800 }}>+</button>
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
      <button onClick={onToggle} style={{ width: '100%', textAlign: 'left', background: '#f4a01d', color: '#111', border: 0, borderRadius: 14, padding: '14px 16px', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>
        {title} {open ? '−' : '+'}
      </button>

      {open ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <ProductCard key={item.id} item={item} quantity={getQuantity(item.id)} onAdd={onAdd} onIncrease={onIncrease} onDecrease={onDecrease} />
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
  const [previewNumber, setPreviewNumber] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsSource, setSuggestionsSource] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [comment, setComment] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [openMap, setOpenMap] = useState({ shawarma: true, burgers: true, hotdogs: true, shashlik: false, quesadilla: false, fryer: true, sauces: false, drinks: false })

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.items)) setCart(parsed.items)
      if (BRANCHES.some((b) => b.id === parsed?.branch)) setBranch(parsed.branch)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ branch, items: cart }))
    } catch {}
  }, [branch, cart])

  useEffect(() => {
    let ignore = false

    async function loadMenu() {
      setLoading(true)
      setErrorText('')

      let loadedItems = []
      let stopIds = new Set()

      if (supabase) {
        const [{ data: menuData, error: menuError }, { data: stopData, error: stopError }] = await Promise.all([
          supabase.from('menu_items').select('*').order('name', { ascending: true }),
          supabase.from('stop_list').select('menu_item_id, is_stopped').eq('branch_id', branch),
        ])

        if (!ignore) {
          if (menuError) setErrorText('Не удалось загрузить меню из базы. Показано резервное меню.')
          if (stopError) console.error(stopError)
          loadedItems = Array.isArray(menuData) ? menuData : []
          stopIds = new Set((stopData || []).filter((row) => row.is_stopped).map((row) => row.menu_item_id))
        }
      } else {
        setErrorText('Supabase не подключен. Показано резервное меню.')
      }

      if (ignore) return

      const source = loadedItems.length ? mergeWithFallback(loadedItems) : FALLBACK_MENU
      const filtered = dedupeItems(source)
        .filter((item) => matchesBranch(item, branch))
        .filter((item) => !stopIds.has(item.id))
        .map((item) => ({
          ...item,
          category: normalizeCategory(item.category, item.name),
          variant: inferVariant(item),
          price: Number(item.price || 0),
        }))

      setItems(sortItems(filtered))
      setLoading(false)
    }

    loadMenu()
    return () => {
      ignore = true
    }
  }, [branch])

  useEffect(() => {
    const availableIds = new Set(items.map((item) => item.id))
    setCart((prev) => prev.filter((item) => availableIds.has(item.id)))
  }, [items])

  useEffect(() => {
    let ignore = false

    async function loadPreviewNumber() {
      if (!checkoutOpen) return
      if (!supabase) {
        setPreviewNumber('')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select('short_number, created_at')
        .eq('branch_id', branch)
        .order('created_at', { ascending: false })
        .limit(20)

      if (ignore) return
      if (error || !Array.isArray(data)) {
        setPreviewNumber('')
        return
      }

      let maxNum = 0
      for (const row of data) {
        const num = Number(String(row.short_number || '').replace(/\D/g, ''))
        if (num > maxNum) maxNum = num
      }
      const next = maxNum > 0 ? String(maxNum + 1).padStart(4, '0') : ''
      setPreviewNumber(next)
    }

    loadPreviewNumber()
    return () => {
      ignore = true
    }
  }, [checkoutOpen, branch])

  const groupedItems = useMemo(() => {
    const grouped = {}
    for (const key of CATEGORY_ORDER) grouped[key] = []
    for (const item of items) {
      const category = normalizeCategory(item.category, item.name)
      if (category === 'shawarma_addons') continue
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    }
    return grouped
  }, [items])

  const cartSummary = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]))
    let count = 0
    let total = 0
    const normalized = cart.map((entry) => {
      const source = byId.get(entry.id)
      if (!source) return null
      const quantity = Number(entry.quantity || 0)
      if (quantity <= 0) return null
      const lineTotal = Number(source.price || 0) * quantity
      count += quantity
      total += lineTotal
      return { ...source, quantity, lineTotal }
    }).filter(Boolean)
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
      nextCart = existing
        ? prev.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry)
        : [...prev, { id: item.id, quantity: 1 }]
      return nextCart
    })

    if (options.openSuggestions) {
      setTimeout(() => openSuggestionsFor(item, nextCart.length ? nextCart : [...cart, { id: item.id, quantity: 1 }]), 0)
    }
  }

  function increaseQuantity(itemId) {
    setCart((prev) => prev.map((entry) => entry.id === itemId ? { ...entry, quantity: entry.quantity + 1 } : entry))
  }

  function decreaseQuantity(itemId) {
    setCart((prev) => prev.map((entry) => entry.id === itemId ? { ...entry, quantity: entry.quantity - 1 } : entry).filter((entry) => entry.quantity > 0))
  }

  function removeItem(itemId) {
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
      setPreviewNumber('')
      try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ branch, items: [] })) } catch {}

      const orderNumber = result?.short_number ?? result?.order?.short_number ?? result?.order?.order_number ?? result?.order?.id
      window.location.href = orderNumber ? `/order?number=${encodeURIComponent(orderNumber)}` : '/order'
    } catch {
      setSubmitError('Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  const branchName = BRANCHES.find((b) => b.id === branch)?.name || branch
  const contact = BRANCH_CONTACTS[branch]

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '18px 14px 120px' }}>
      <div style={{ ...cardStyle, padding: 18, marginBottom: 18, background: 'linear-gradient(135deg, #0f255f 0%, #071432 100%)' }}>
        <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>На Виражах</div>
        <div style={{ color: '#cdd9fb', marginBottom: 14 }}>Полное меню с фильтрацией по стоп-листу для выбранной точки.</div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {BRANCHES.map((b) => (
            <button key={b.id} onClick={() => setBranch(b.id)} style={{ border: branch === b.id ? '1px solid #f4a01d' : '1px solid rgba(255,255,255,0.1)', background: branch === b.id ? 'rgba(244,160,29,0.16)' : 'rgba(255,255,255,0.03)', color: '#fff', borderRadius: 999, padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
              {b.name}
            </button>
          ))}

          <a href="/order" style={{ marginLeft: 'auto', color: '#9fd4ff', textDecoration: 'none', alignSelf: 'center' }}>Отследить заказ</a>
          <a href="/admin" style={{ color: '#9fd4ff', textDecoration: 'none', alignSelf: 'center' }}>Админка</a>
        </div>
      </div>

      {loading ? <div style={{ color: '#cdd9fb', padding: '8px 4px 18px' }}>Загрузка меню...</div> : null}
      {!loading && errorText ? <div style={{ color: '#ffb4b4', padding: '8px 4px 18px' }}>{errorText}</div> : null}

      {!loading && CATEGORY_ORDER.map((categoryKey) => {
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
            onToggle={() => setOpenMap((prev) => ({ ...prev, [categoryKey]: !prev[categoryKey] }))}
          />
        )
      })}

      {cartSummary.count > 0 ? (
        <div style={{ position: 'fixed', left: 12, right: 12, bottom: 12, background: 'rgba(8,21,49,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 14, boxShadow: '0 14px 40px rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>В корзине: {cartSummary.count}</div>
              <div style={{ color: '#d9e4ff' }}>На сумму {formatPrice(cartSummary.total)}</div>
            </div>
            <button onClick={() => setCheckoutOpen(true)} style={{ marginLeft: 'auto', border: 0, borderRadius: 14, background: '#f4a01d', color: '#111', fontWeight: 900, padding: '14px 18px', cursor: 'pointer' }}>
              Оформить заказ
            </button>
          </div>
        </div>
      ) : null}

      {suggestionsOpen ? (
        <div onClick={() => setSuggestionsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 65, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 820, maxHeight: '85vh', overflow: 'auto', background: '#081531', borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Добавить к заказу</div>
                <div style={{ color: '#c4d1f6', marginTop: 6 }}>
                  {normalizeCategory(suggestionsSource?.category, suggestionsSource?.name) === 'shawarma'
                    ? 'Для шаурмы показываем именно добавки к шаурме.'
                    : 'Подходящие дополнения к выбранной позиции.'}
                </div>
              </div>
              <button onClick={() => setSuggestionsOpen(false)} style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 28, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {suggestions.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{item.name}</div>
                    <div style={{ color: '#c4d1f6', fontSize: 13 }}>{CATEGORY_LABELS[normalizeCategory(item.category, item.name)] || item.category} · {formatPrice(item.price)}</div>
                  </div>
                  <button onClick={() => addToCart(item, { openSuggestions: false })} style={{ border: 0, borderRadius: 12, background: '#22c55e', color: '#071432', fontWeight: 900, padding: '10px 14px', cursor: 'pointer' }}>Добавить</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button onClick={() => setSuggestionsOpen(false)} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, background: 'transparent', color: '#fff', fontWeight: 700, padding: '12px 16px', cursor: 'pointer' }}>Продолжить без добавок</button>
              <button onClick={() => { setSuggestionsOpen(false); setCheckoutOpen(true) }} style={{ border: 0, borderRadius: 14, background: '#f4a01d', color: '#111', fontWeight: 900, padding: '12px 16px', cursor: 'pointer' }}>Перейти к оформлению</button>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div onClick={() => setCheckoutOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto', background: '#081531', borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Оформление заказа{previewNumber ? ` ${previewNumber}` : ''}</div>
              <button onClick={() => setCheckoutOpen(false)} style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 28, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ color: '#c4d1f6', marginTop: 8 }}>Точка: {branchName}</div>
            {previewNumber && contact ? (
              <div style={{ color: '#ffd08a', marginTop: 8, lineHeight: 1.45 }}>
                После звонка администратору по номеру {contact.phone} {contact.notePlace ? `${contact.notePlace}, ` : ''}
                назовите номер своего заказа для подтверждения.
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 10, marginTop: 16, marginBottom: 16 }}>
              {cartSummary.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: '#c4d1f6', fontSize: 13 }}>{formatPrice(item.price)} × {item.quantity}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => decreaseQuantity(item.id)} style={{ width: 30, height: 30, borderRadius: 10, border: 0, background: '#1f335f', color: '#fff', cursor: 'pointer', fontSize: 20 }}>−</button>
                    <div style={{ minWidth: 18, textAlign: 'center', fontWeight: 800 }}>{item.quantity}</div>
                    <button onClick={() => increaseQuantity(item.id)} style={{ width: 30, height: 30, borderRadius: 10, border: 0, background: '#22c55e', color: '#071432', cursor: 'pointer', fontWeight: 900 }}>+</button>
                    <button onClick={() => removeItem(item.id)} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, background: 'transparent', color: '#ffd5d5', padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>Удалить</button>
                    <div style={{ minWidth: 72, textAlign: 'right', fontWeight: 800 }}>{formatPrice(item.lineTotal)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ваше имя" style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: '#0b1b45', color: '#fff' }} />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Телефон" style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: '#0b1b45', color: '#fff' }} />
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий к заказу" rows={3} style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: '#0b1b45', color: '#fff', resize: 'vertical' }} />
            </div>

            {submitError ? <div style={{ color: '#ffb4b4', marginTop: 12 }}>{submitError}</div> : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#c4d1f6' }}>Итого</div>
                <div style={{ fontWeight: 900, fontSize: 24 }}>{formatPrice(cartSummary.total)}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={clearCart} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, background: 'transparent', color: '#fff', fontWeight: 800, padding: '14px 18px', cursor: 'pointer' }}>Очистить корзину</button>
                <button disabled={submitting} onClick={submitOrder} style={{ border: 0, borderRadius: 14, background: submitting ? '#64748b' : '#22c55e', color: '#071432', fontWeight: 900, padding: '14px 20px', cursor: submitting ? 'default' : 'pointer' }}>
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
