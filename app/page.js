'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const BRANCHES = [
  { id: 'nv-fr-002', name: 'Аэропорт', fullName: 'На Виражах — Аэропорт', phone: '+7 902 452-42-22', address: 'Аэропорт, 7' },
  { id: 'nv-sh-001', name: 'Конечная', fullName: 'На Виражах — Конечная', phone: '+7 908 593-26-88', address: '' },
]

const CATEGORY_ORDER = ['shawarma', 'shawarma_addons', 'burgers', 'hotdogs', 'shashlik', 'quesadilla', 'fries', 'sauces', 'drinks']
const CATEGORY_LABELS = {
  shawarma: 'Шаурма', shawarma_addons: 'Добавки к шаурме',
  burgers: 'Бургеры', hotdogs: 'Хот-доги', shashlik: 'Шашлык',
  quesadilla: 'Кесадилья', fries: 'Фритюр', sauces: 'Соусы', drinks: 'Напитки',
}
const CART_KEY = 'nv_cart_v4'

function normCat(cat) {
  const r = String(cat || '').trim().toLowerCase()
  if (!r) return 'other'
  if (r === 'fryer') return 'fries'   // fryer → fries (legacy)
  return r
}
function fmt(p) { return `${Number(p || 0)} ₽` }
function pad4(n) {
  const num = Number(String(n || '').replace(/\D/g, ''))
  return Number.isFinite(num) && num > 0 ? String(num).padStart(4, '0') : '????'
}
function getSB() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!u || !k) return null
  return createClient(u, k)
}

const card = { background: 'linear-gradient(160deg,#0d1f4e 0%,#07122e 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }
const inp = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f0f4ff', fontFamily: "'Onest',sans-serif", fontSize: 15, outline: 'none' }
const btnG = { border: 0, borderRadius: 12, background: '#22c55e', color: '#07122e', fontWeight: 800, fontFamily: "'Onest',sans-serif", cursor: 'pointer' }
const btnY = { border: 0, borderRadius: 12, background: '#f4a01d', color: '#07122e', fontWeight: 800, fontFamily: "'Onest',sans-serif", cursor: 'pointer' }
const btnGh = { border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, background: 'transparent', color: '#c8d5f5', fontWeight: 700, fontFamily: "'Onest',sans-serif", cursor: 'pointer' }

function QtyCtrl({ qty, onInc, onDec, sm }) {
  const sz = sm ? 30 : 36
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={onDec} style={{ ...btnGh, width: sz, height: sz, fontSize: 20, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>−</button>
      <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: sm ? 15 : 18 }}>{qty}</span>
      <button onClick={onInc} style={{ ...btnG, width: sz, height: sz, fontSize: 20, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>+</button>
    </div>
  )
}

function ProductCard({ item, qty, onAdd, onInc, onDec }) {
  const unavail = item.coming_soon || Number(item.price) <= 0
  const inCart = qty > 0
  return (
    <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{item.name}</span>
          {item.variant && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', color: '#a0b4e0' }}>
              {item.variant === 'chicken' ? '🐔 курица' : item.variant === 'pork' ? '🐷 свинина' : item.variant}
            </span>
          )}
          {item.spicy && <span style={{ fontSize: 12 }}>🌶</span>}
        </div>
        {item.description ? <div style={{ fontSize: 13, color: '#8fa3cc', lineHeight: 1.5, marginBottom: 10 }}>{item.description}</div> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {unavail
            ? <span style={{ fontSize: 13, color: '#6b7db5' }}>Скоро в продаже</span>
            : <span style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 18, color: '#f4a01d' }}>{fmt(item.price)}</span>
          }
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 90 }}>
        {!unavail && !inCart && <button onClick={() => onAdd(item)} style={{ ...btnG, padding: '10px 16px', fontSize: 22, lineHeight: 1 }}>+</button>}
        {!unavail && inCart && <QtyCtrl qty={qty} onInc={() => onInc(item.id)} onDec={() => onDec(item.id)} />}
      </div>
    </div>
  )
}

function CatSection({ catKey, items, openMap, toggle, getQty, onAdd, onInc, onDec }) {
  const isOpen = openMap[catKey]
  const label = CATEGORY_LABELS[catKey] || catKey
  const inCartCount = items.reduce((s, i) => s + (getQty(i.id) > 0 ? getQty(i.id) : 0), 0)
  return (
    <section style={{ marginBottom: 10 }}>
      <button onClick={() => toggle(catKey)} style={{
        width: '100%', textAlign: 'left', border: 0,
        borderRadius: isOpen ? '14px 14px 0 0' : 14,
        background: isOpen ? 'linear-gradient(90deg,#f4a01d,#e8890a)' : 'linear-gradient(90deg,#0e2050,#091738)',
        color: isOpen ? '#07122e' : '#c8d5f5',
        fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 14,
        padding: '14px 18px', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {inCartCount > 0 && (
            <span style={{ background: isOpen ? '#07122e' : '#f4a01d', color: isOpen ? '#f4a01d' : '#07122e', fontSize: 12, fontWeight: 900, padding: '2px 8px', borderRadius: 999 }}>
              {inCartCount}
            </span>
          )}
          <span style={{ fontSize: 18, lineHeight: 1 }}>{isOpen ? '−' : '+'}</span>
        </div>
      </button>
      {isOpen && (
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderTop: 0, borderRadius: '0 0 14px 14px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
          {items.map((item, i) => (
            <div key={item.id} style={{ padding: '10px', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <ProductCard item={item} qty={getQty(item.id)} onAdd={onAdd} onInc={onInc} onDec={onDec} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function UpsellModal({ source, suggestions, onAdd, onClose, onCheckout }) {
  if (!suggestions.length) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 8px 8px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '80vh', overflow: 'auto', ...card, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 16 }}>Добавить к заказу?</div>
            <div style={{ color: '#8fa3cc', fontSize: 13, marginTop: 4 }}>
              {normCat(source?.category) === 'shawarma' ? 'Добавки и дополнения к шаурме' : 'Подходящие позиции'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#8fa3cc', fontSize: 26, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {suggestions.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                <div style={{ color: '#8fa3cc', fontSize: 13 }}>{fmt(item.price)}</div>
              </div>
              <button onClick={() => onAdd(item)} style={{ ...btnG, padding: '9px 16px', fontSize: 14 }}>Добавить</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={onClose} style={{ ...btnGh, padding: '12px 16px', fontSize: 14, flex: 1 }}>Без добавок</button>
          <button onClick={onCheckout} style={{ ...btnY, padding: '12px 16px', fontSize: 14, flex: 1 }}>Оформить заказ →</button>
        </div>
      </div>
    </div>
  )
}

function CheckoutModal({ cartItems, total, branch, previewNum, previewLoading, onClose, onSuccess, onInc, onDec, onRemove, onClear }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr('')
    if (!name.trim()) return setErr('Введите имя')
    if (!phone.trim()) return setErr('Введите телефон')
    setBusy(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branch.id, customer_name: name, customer_phone: phone, comment, items: cartItems.map(i => ({ id: i.id, qty: i.qty })) }),
      })
      const data = await res.json()
      if (!res.ok) return setErr(data?.error || 'Ошибка при оформлении')
      onSuccess(data.order)
    } catch { setErr('Ошибка соединения') }
    finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 8px 8px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', ...card, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 20 }}>
              Заказ {previewLoading ? <span style={{ opacity: 0.4 }}>…</span> : <span style={{ color: '#f4a01d' }}>{previewNum}</span>}
            </div>
            <div style={{ color: '#8fa3cc', fontSize: 13, marginTop: 4 }}>{branch.fullName}</div>
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(244,160,29,0.1)', border: '1px solid rgba(244,160,29,0.2)', fontSize: 13, color: '#ffd08a', lineHeight: 1.6 }}>
              После оформления позвоните <strong>{branch.phone}</strong>
              {branch.address ? <> · {branch.address}</> : null} и назовите номер заказа.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#8fa3cc', fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: '0 0 0 8px' }}>×</button>
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {cartItems.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ color: '#8fa3cc', fontSize: 12 }}>{fmt(item.price)} × {item.qty}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <QtyCtrl qty={item.qty} onInc={() => onInc(item.id)} onDec={() => onDec(item.id)} sm />
                <button onClick={() => onRemove(item.id)} style={{ ...btnGh, padding: '6px 10px', fontSize: 12 }}>✕</button>
                <span style={{ fontWeight: 800, minWidth: 56, textAlign: 'right', fontSize: 14 }}>{fmt(item.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя *" style={inp} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон *" type="tel" style={inp} />
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Комментарий" rows={2} style={{ ...inp, resize: 'vertical' }} />
        </div>

        {err && <div style={{ color: '#ff7c7c', fontSize: 14, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ color: '#8fa3cc', fontSize: 13 }}>Итого</div>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 22 }}>{fmt(total)}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <button onClick={onClear} style={{ ...btnGh, padding: '12px 16px', fontSize: 14 }}>Очистить</button>
            <button disabled={busy} onClick={submit} style={{ ...btnG, padding: '12px 22px', fontSize: 15, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Оформляем…' : 'Подтвердить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [branchId, setBranchId] = useState(BRANCHES[0].id)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [cart, setCart] = useState([])
  const [openMap, setOpenMap] = useState({ shawarma: true, burgers: true, fries: true })
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [upsellSrc, setUpsellSrc] = useState(null)
  const [upsellItems, setUpsellItems] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [previewNum, setPreviewNum] = useState('????')
  const [previewLoading, setPreviewLoading] = useState(false)

  const branch = BRANCHES.find(b => b.id === branchId) || BRANCHES[0]

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY)
      if (!raw) return
      const p = JSON.parse(raw)
      if (Array.isArray(p?.items)) setCart(p.items)
      if (p?.branchId && BRANCHES.some(b => b.id === p.branchId)) setBranchId(p.branchId)
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify({ branchId, items: cart })) } catch {}
  }, [branchId, cart])

  useEffect(() => {
    let active = true
    setLoading(true); setLoadErr('')
    async function load() {
      const sb = getSB()
      if (!sb) { if (active) { setItems([]); setLoadErr('Supabase не настроен'); setLoading(false) } return }
      const [{ data: menu, error: menuErr }, { data: stop }] = await Promise.all([
        sb.from('menu_items').select('*').order('name'),
        sb.from('stop_list').select('menu_item_id').eq('branch_id', branchId).eq('is_stopped', true),
      ])
      if (!active) return
      if (menuErr) { setItems([]); setLoadErr('Не удалось загрузить меню'); setLoading(false); return }
      const stoppedIds = new Set((stop || []).map(r => r.menu_item_id))
      const filtered = (menu || [])
        .filter(i => !stoppedIds.has(i.id))
        .filter(i => !Array.isArray(i.branch_ids) || i.branch_ids.length === 0 || i.branch_ids.includes(branchId))
        .map(i => ({ ...i, category: normCat(i.category) }))
      // Дедупликация: если в БД есть дубли (одинаковые name+variant), оставляем первый
      const seen = new Set()
      const deduped = filtered.filter(i => {
        const key = `${String(i.name||'').trim().toLowerCase()}__${String(i.variant||'').trim().toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      const avail = new Set(deduped.map(i => i.id))
      setCart(prev => prev.filter(e => avail.has(e.id)))
      setItems(deduped)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [branchId])

  useEffect(() => {
    if (!checkoutOpen) return
    let active = true; setPreviewLoading(true)
    async function load() {
      const sb = getSB()
      if (!sb) { if (active) { setPreviewNum('????'); setPreviewLoading(false) } return }
      try {
        const { data } = await sb.from('order_counters').select('last_number').eq('branch_id', branchId).maybeSingle()
        if (active) setPreviewNum(pad4((Number(data?.last_number) || 0) + 1))
      } catch { if (active) setPreviewNum('????') }
      finally { if (active) setPreviewLoading(false) }
    }
    load()
    return () => { active = false }
  }, [checkoutOpen, branchId])

  const grouped = useMemo(() => {
    const g = {}
    for (const cat of CATEGORY_ORDER) g[cat] = []
    for (const item of items) {
      const c = item.category
      if (!g[c]) g[c] = []
      g[c].push(item)
    }
    return g
  }, [items])

  const cartDetails = useMemo(() => {
    const byId = new Map(items.map(i => [i.id, i]))
    let count = 0, total = 0
    const list = cart.flatMap(e => {
      const item = byId.get(e.id)
      if (!item || e.qty <= 0) return []
      const lineTotal = Number(item.price) * e.qty
      count += e.qty; total += lineTotal
      return [{ ...item, qty: e.qty, lineTotal }]
    })
    return { list, count, total }
  }, [cart, items])

  function getQty(id) { return cart.find(e => e.id === id)?.qty || 0 }

  function buildUpsell(source, curCart) {
    const cartIds = new Set(curCart.map(e => e.id))
    const cat = normCat(source.category)
    const sv = source.variant || null
    let pool = []
    if (cat === 'shawarma') {
      pool = items.filter(i => normCat(i.category) === 'shawarma_addons')
      if (!pool.length) pool = items.filter(i => ['fries', 'sauces', 'drinks'].includes(normCat(i.category)))
    } else if (['burgers', 'hotdogs'].includes(cat)) {
      pool = items.filter(i => ['fries', 'sauces', 'drinks'].includes(normCat(i.category)))
    } else if (cat === 'fries') {
      pool = items.filter(i => ['sauces', 'drinks'].includes(normCat(i.category)))
    } else {
      pool = items.filter(i => ['drinks', 'sauces'].includes(normCat(i.category)))
    }
    return pool.filter(i => {
      if (cartIds.has(i.id) || Number(i.price) <= 0 || i.coming_soon) return false
      if (sv === 'chicken' && i.variant === 'pork') return false
      if (sv === 'pork' && i.variant === 'chicken') return false
      return true
    }).slice(0, 5)
  }

  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(e => e.id === item.id)
      const next = ex ? prev.map(e => e.id === item.id ? { ...e, qty: e.qty + 1 } : e) : [...prev, { id: item.id, qty: 1 }]
      const sugg = buildUpsell(item, next)
      if (sugg.length) setTimeout(() => { setUpsellSrc(item); setUpsellItems(sugg); setUpsellOpen(true) }, 0)
      return next
    })
  }
  function incQty(id) { setCart(prev => prev.map(e => e.id === id ? { ...e, qty: e.qty + 1 } : e)) }
  function decQty(id) { setCart(prev => prev.map(e => e.id === id ? { ...e, qty: e.qty - 1 } : e).filter(e => e.qty > 0)) }
  function removeFromCart(id) { setCart(prev => prev.filter(e => e.id !== id)) }
  function clearCart() { setCart([]) }
  function toggle(cat) { setOpenMap(prev => ({ ...prev, [cat]: !prev[cat] })) }

  function handleSuccess(order) {
    setCart([]); setCheckoutOpen(false); setUpsellOpen(false); setSuccessOrder(order)
  }

  if (successOrder) {
    const num = successOrder.short_number || successOrder.order_number || successOrder.id
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 26, marginBottom: 8 }}>Заказ оформлен!</div>
        <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 52, color: '#f4a01d', margin: '20px 0' }}>{num}</div>
        <div style={{ color: '#8fa3cc', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Позвоните по номеру <strong style={{ color: '#f0f4ff' }}>{branch.phone}</strong>
          {branch.address ? <><br />📍 {branch.address}</> : null}
          <br />и назовите номер заказа <strong style={{ color: '#f4a01d' }}>{num}</strong>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={`/order?number=${encodeURIComponent(num)}`} style={{ ...btnY, padding: '14px 24px', fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>Отследить заказ</a>
          <button onClick={() => setSuccessOrder(null)} style={{ ...btnGh, padding: '14px 24px', fontSize: 15 }}>Новый заказ</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '16px 12px 120px' }}>
      <div style={{ ...card, marginBottom: 14, background: 'linear-gradient(135deg,#0f2660 0%,#07122e 100%)' }}>
        <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 26, marginBottom: 4 }}>На Виражах</div>
        <div style={{ color: '#6b7db5', fontSize: 13, marginBottom: 14 }}>Выберите точку и сделайте заказ</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {BRANCHES.map(b => (
            <button key={b.id} onClick={() => { setBranchId(b.id); setCart([]) }} style={{
              border: branchId === b.id ? '2px solid #f4a01d' : '1px solid rgba(255,255,255,0.1)',
              background: branchId === b.id ? 'rgba(244,160,29,0.12)' : 'rgba(255,255,255,0.03)',
              color: branchId === b.id ? '#f4a01d' : '#c8d5f5',
              borderRadius: 999, padding: '9px 16px',
              fontFamily: "'Onest',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>{b.name}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            <a href="/order" style={{ color: '#6b8ecf', fontSize: 13, textDecoration: 'none' }}>Мой заказ</a>
            <a href="/admin" style={{ color: '#6b8ecf', fontSize: 13, textDecoration: 'none' }}>Админ</a>
          </div>
        </div>
        {branch.phone && <div style={{ marginTop: 12, fontSize: 13, color: '#6b7db5' }}>📞 {branch.phone}{branch.address ? ` · 📍 ${branch.address}` : ''}</div>}
      </div>

      {loading && <div style={{ color: '#6b7db5', padding: '20px 4px' }}>Загружаем меню…</div>}
      {!loading && loadErr && <div style={{ color: '#ff7c7c', padding: '20px 4px' }}>{loadErr}</div>}

      {!loading && !loadErr && CATEGORY_ORDER.map(cat => {
        const catItems = grouped[cat] || []
        if (!catItems.length) return null
        return <CatSection key={cat} catKey={cat} items={catItems} openMap={openMap} toggle={toggle} getQty={getQty} onAdd={addToCart} onInc={incQty} onDec={decQty} />
      })}

      {cartDetails.count > 0 && (
        <div style={{ position: 'fixed', left: 12, right: 12, bottom: 12, background: 'rgba(7,18,46,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '12px 16px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 15 }}>
              {cartDetails.count} {cartDetails.count === 1 ? 'позиция' : cartDetails.count < 5 ? 'позиции' : 'позиций'}
            </div>
            <div style={{ color: '#8fa3cc', fontSize: 13 }}>{fmt(cartDetails.total)}</div>
          </div>
          <button onClick={() => setCheckoutOpen(true)} style={{ ...btnY, marginLeft: 'auto', padding: '12px 20px', fontSize: 15 }}>Оформить заказ →</button>
        </div>
      )}

      {upsellOpen && (
        <UpsellModal
          source={upsellSrc}
          suggestions={upsellItems}
          onAdd={item => { addToCart(item); setUpsellItems(prev => prev.filter(i => i.id !== item.id)) }}
          onClose={() => setUpsellOpen(false)}
          onCheckout={() => { setUpsellOpen(false); setCheckoutOpen(true) }}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          cartItems={cartDetails.list} total={cartDetails.total} branch={branch}
          previewNum={previewNum} previewLoading={previewLoading}
          onClose={() => setCheckoutOpen(false)} onSuccess={handleSuccess}
          onInc={incQty} onDec={decQty} onRemove={removeFromCart} onClear={clearCart}
        />
      )}
    </main>
  )
}
