"use client"

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

const CATEGORY_ORDER = ['shawarma', 'burgers', 'hotdogs', 'shashlik', 'quesadilla', 'fryer', 'sauces', 'drinks']
const CART_KEY = 'na-virazhah-cart-v2'

const cardStyle = {
  background: 'linear-gradient(180deg, #0b1b45 0%, #081531 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е')
}

function isChicken(item) {
  const t = normalizeText(`${item?.name} ${item?.description}`)
  return t.includes('куриц')
}

function isPork(item) {
  const t = normalizeText(`${item?.name} ${item?.description}`)
  return t.includes('свинин')
}

function isShawarma(item) {
  const t = normalizeText(`${item?.category} ${item?.name}`)
  return item?.category === 'shawarma' || t.includes('шаурм')
}

function isDrink(item) {
  return item?.category === 'drinks'
}

function isFryer(item) {
  return item?.category === 'fryer'
}

function isSauce(item) {
  return item?.category === 'sauces'
}

function byPriority(items, ids) {
  const map = new Map(items.map((x) => [x.id, x]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

function getSuggestedItems(mainItem, items, branch) {
  const available = items.filter((item) => Number(item.price) > 0 && item.id !== mainItem.id)
  const lowerBranch = normalizeText(branch)

  const fries = available.filter((item) => {
    const t = normalizeText(item.name)
    return isFryer(item) && (t.includes('картофель фри') || t == 'фри' || t.includes('картофель'))
  })

  const nuggets = available.filter((item) => {
    const t = normalizeText(item.name)
    return isFryer(item) && (t.includes('наггет') || t.includes('стрипс') || t.includes('крылыш'))
  })

  const cheeseSauce = available.filter((item) => {
    const t = normalizeText(item.name)
    return isSauce(item) && (t.includes('сыр') || t.includes('чесноч') || t.includes('кетч'))
  })

  const drinks = available.filter((item) => {
    if (!isDrink(item)) return false
    const t = normalizeText(item.name)
    if (t.includes('коф') && lowerBranch === 'airport') return false
    return true
  })

  const shawarmaAdds = available.filter((item) => {
    if (item.category !== 'shawarma') return false
    if (isChicken(mainItem) && isPork(item)) return false
    if (isPork(mainItem) && isChicken(item)) return false
    return false
  })

  if (isShawarma(mainItem)) {
    return [
      ...fries.slice(0, 2),
      ...cheeseSauce.slice(0, 3),
      ...nuggets.slice(0, 2),
      ...drinks.slice(0, 2),
      ...shawarmaAdds.slice(0, 2),
    ].filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
  }

  if (mainItem.category === 'burgers') {
    return [...fries.slice(0, 2), ...drinks.slice(0, 2), ...cheeseSauce.slice(0, 2), ...nuggets.slice(0, 1)]
      .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
  }

  if (mainItem.category === 'hotdogs') {
    return [...drinks.slice(0, 2), ...fries.slice(0, 2), ...cheeseSauce.slice(0, 2)]
      .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
  }

  return [...fries.slice(0, 2), ...drinks.slice(0, 2), ...nuggets.slice(0, 1)]
    .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
}

function ProductCard({ item, onAdd }) {
  const isComingSoon = Number(item.price) <= 0

  return (
    <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14 }}>
      <div style={{ height: 110, borderRadius: 14, background: 'linear-gradient(135deg, #1c2d63, #0e1b40)', border: '1px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9bb0e5', fontSize: 12, textAlign: 'center', padding: 8 }}>
        Фото<br />скоро
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.2 }}>{item.name}</div>
          <div style={{ color: isComingSoon ? '#9bb0e5' : '#ffb347', fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap' }}>
            {isComingSoon ? '—' : `${item.price} ₽`}
          </div>
        </div>

        <div style={{ marginTop: 8, color: '#d9e4ff', fontSize: 14, lineHeight: 1.45 }}>
          {item.description || 'Описание скоро добавим'}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: 'rgba(255,179,71,0.15)', color: '#ffd08a' }}>
            {CATEGORY_LABELS[item.category] || item.category}
          </span>

          {isComingSoon ? (
            <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: 'rgba(155,176,229,0.15)', color: '#9bb0e5' }}>
              Скоро в продаже
            </span>
          ) : null}

          <button
            disabled={isComingSoon}
            onClick={() => onAdd(item)}
            style={{ marginLeft: 'auto', border: 0, borderRadius: 12, background: isComingSoon ? '#475569' : '#22c55e', color: '#071432', fontWeight: 700, padding: '10px 14px', cursor: isComingSoon ? 'not-allowed' : 'pointer', opacity: isComingSoon ? 0.6 : 1 }}
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
      <button onClick={onToggle} style={{ width: '100%', textAlign: 'left', background: '#f4a01d', color: '#111', border: 0, borderRadius: 14, padding: '14px 16px', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>
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

function UpsellModal({ open, mainItem, suggestions, onAdd, onClose }) {
  if (!open || !mainItem) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'auto', background: '#071432', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', padding: 18, boxShadow: '0 24px 70px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Добавить к заказу?</div>
            <div style={{ color: '#cdd9fb', marginTop: 6 }}>
              «{mainItem.name}» уже в корзине. Рекомендуем взять ещё что-нибудь к нему.
            </div>
          </div>
          <button onClick={onClose} style={{ border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Закрыть</button>
        </div>

        {suggestions.length ? (
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {suggestions.map((item) => (
              <div key={item.id} style={{ ...cardStyle, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700 }}>{item.name}</div>
                  <div style={{ color: '#cdd9fb', fontSize: 13 }}>{item.description || CATEGORY_LABELS[item.category] || ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <div style={{ color: '#ffb347', fontWeight: 800 }}>{item.price} ₽</div>
                  <button onClick={() => onAdd(item, { keepUpsellOpen: true })} style={{ border: 0, borderRadius: 10, background: '#22c55e', color: '#071432', padding: '10px 12px', fontWeight: 800, cursor: 'pointer' }}>
                    Добавить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#cdd9fb', marginTop: 16 }}>Подходящих дополнений сейчас нет.</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ border: 0, borderRadius: 12, background: '#f4a01d', color: '#111', padding: '12px 16px', fontWeight: 800, cursor: 'pointer' }}>
            Продолжить
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [branch, setBranch] = useState('airport')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [openMap, setOpenMap] = useState({ shawarma: true, burgers: true, hotdogs: true, shashlik: false, quesadilla: false, fryer: true, sauces: false, drinks: false })
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [comment, setComment] = useState('')
  const [upsellFor, setUpsellFor] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
      if (Array.isArray(saved)) setCart(saved)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
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

      const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*').order('name', { ascending: true })
      if (!active) return
      if (menuError) {
        setItems([])
        setErrorText('Не удалось загрузить меню')
        setLoading(false)
        return
      }

      const { data: stopData } = await supabase.from('stop_list').select('*').eq('branch_id', branch)
      if (!active) return

      const stoppedIds = new Set((stopData || []).filter((row) => row?.is_stopped !== false).map((row) => row?.menu_item_id ?? row?.item_id).filter(Boolean))
      const filteredMenu = (menuData || []).filter((item) => !stoppedIds.has(item.id))
      setItems(filteredMenu)
      setLoading(false)
    }

    loadMenu()
    return () => { active = false }
  }, [branch])

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

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [cart])
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [cart])
  const upsellSuggestions = useMemo(() => (upsellFor ? getSuggestedItems(upsellFor, items, branch) : []), [upsellFor, items, branch])

  function addToCart(item, options = {}) {
    setCart((prev) => {
      const found = prev.find((x) => x.id === item.id)
      if (found) {
        return prev.map((x) => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x)
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price || 0), quantity: 1, category: item.category }]
    })
    setIsCartOpen(true)
    if (options.keepUpsellOpen) return
    setUpsellFor(item)
  }

  function changeQty(id, delta) {
    setCart((prev) => prev
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0))
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  async function submitOrder() {
    setCheckoutError('')

    if (!customerName.trim()) {
      setCheckoutError('Укажите имя')
      return
    }
    if (!customerPhone.trim()) {
      setCheckoutError('Укажите телефон')
      return
    }
    if (!cart.length) {
      setCheckoutError('Корзина пуста')
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
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Не удалось оформить заказ')
      }

      localStorage.setItem('last_order_number', data?.order?.short_number || '')
      setCart([])
      localStorage.removeItem(CART_KEY)
      window.location.href = `/order?number=${encodeURIComponent(data?.order?.short_number || '')}`
    } catch (error) {
      setCheckoutError(error?.message || 'Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '18px 14px 120px', color: '#fff' }}>
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
            onAdd={addToCart}
            onToggle={() => setOpenMap((prev) => ({ ...prev, [categoryKey]: !prev[categoryKey] }))}
          />
        )
      })}

      <button onClick={() => setIsCartOpen(true)} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 50, border: 0, borderRadius: 999, background: '#f4a01d', color: '#111', fontWeight: 900, padding: '14px 18px', boxShadow: '0 14px 30px rgba(0,0,0,0.35)', cursor: 'pointer' }}>
        Корзина • {cartCount} • {cartTotal} ₽
      </button>

      {isCartOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 55, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 460, height: '100%', overflow: 'auto', background: '#071432', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Корзина</div>
              <button onClick={() => setIsCartOpen(false)} style={{ border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Закрыть</button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {cart.length ? cart.map((item) => (
                <div key={item.id} style={{ ...cardStyle, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.name}</div>
                      <div style={{ color: '#cdd9fb', marginTop: 4 }}>{item.price} ₽</div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} style={{ border: 0, borderRadius: 10, background: '#ef4444', color: '#fff', padding: '8px 10px', cursor: 'pointer' }}>Удалить</button>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button onClick={() => changeQty(item.id, -1)} style={{ width: 34, height: 34, borderRadius: 10, border: 0, cursor: 'pointer' }}>−</button>
                      <div style={{ minWidth: 24, textAlign: 'center', fontWeight: 800 }}>{item.quantity}</div>
                      <button onClick={() => changeQty(item.id, 1)} style={{ width: 34, height: 34, borderRadius: 10, border: 0, cursor: 'pointer' }}>+</button>
                    </div>
                    <div style={{ fontWeight: 900 }}>{item.quantity * item.price} ₽</div>
                  </div>
                </div>
              )) : <div style={{ color: '#cdd9fb' }}>Корзина пуста</div>}
            </div>

            <div style={{ ...cardStyle, marginTop: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Оформление заказа</div>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ваше имя" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: '#0e1b40', color: '#fff', padding: '12px 14px', marginBottom: 10 }} />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Телефон" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: '#0e1b40', color: '#fff', padding: '12px 14px', marginBottom: 10 }} />
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий к заказу" rows={3} style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: '#0e1b40', color: '#fff', padding: '12px 14px', marginBottom: 10, resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>Итого: {cartTotal} ₽</div>
                <button onClick={submitOrder} disabled={submitting || !cart.length} style={{ border: 0, borderRadius: 12, background: submitting || !cart.length ? '#475569' : '#22c55e', color: '#071432', padding: '12px 16px', fontWeight: 900, cursor: submitting || !cart.length ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Отправка...' : 'Оформить'}
                </button>
              </div>
              {checkoutError ? <div style={{ color: '#ffb4b4', marginTop: 10 }}>{checkoutError}</div> : null}
            </div>
          </div>
        </div>
      ) : null}

      <UpsellModal open={!!upsellFor} mainItem={upsellFor} suggestions={upsellSuggestions} onAdd={addToCart} onClose={() => setUpsellFor(null)} />
    </main>
  )
}
