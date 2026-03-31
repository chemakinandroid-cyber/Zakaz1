'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Константы ────────────────────────────────────────────────────────────────

const BRANCHES = [
  { id: 'nv-fr-002', name: 'Аэропорт', fullName: 'На Виражах — Аэропорт', phone: '+7 902 452-42-22', address: 'мкр. Аэропорт, 7', stopId: 'airport' },
  { id: 'nv-sh-001', name: 'Конечная',  fullName: 'На Виражах — Конечная',  phone: '+7 908 593-26-88', address: 'ул. Конечная, 10, корп. 4', stopId: 'konechnaya' },
]
const CATEGORY_ORDER  = ['shawarma','shawarma_addons','burgers','hotdogs','shashlik','quesadilla','fries','sauces','drinks']
const CATEGORY_LABELS = {
  shawarma:'Шаурма', shawarma_addons:'Добавки к шаурме',
  burgers:'Бургеры', hotdogs:'Хот-доги', shashlik:'Шашлык',
  quesadilla:'Кесадилья', fries:'Фритюр', sauces:'Соусы', drinks:'Напитки',
}
const CATEGORY_EMOJI = {
  shawarma:'🌯', shawarma_addons:'➕', burgers:'🍔', hotdogs:'🌭',
  shashlik:'🍖', quesadilla:'🫓', fries:'🍟', sauces:'🥫', drinks:'☕',
}
const CART_KEY = 'nv_cart_v5'

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function normCat(cat) {
  const r = String(cat||'').trim().toLowerCase()
  if (!r) return 'other'
  if (r === 'fryer') return 'fries'
  return r
}
function fmt(p)  { return `${Number(p||0)} ₽` }
function pad4(n) {
  const num = Number(String(n||'').replace(/\D/g,''))
  return Number.isFinite(num) && num > 0 ? String(num).padStart(4,'0') : '????'
}
function getSB() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!u||!k) return null
  return createClient(u,k)
}
function makeCartKey(itemId, modifiers=[]) {
  const mids = [...modifiers].map(m=>m.id).sort().join(',')
  return mids ? `${itemId}::${mids}` : itemId
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const C = {
  orange: '#ff6b35',
  orangeLight: '#fff0ea',
  orangeDark: '#e5501a',
  bg: '#f7f3ee',
  card: '#ffffff',
  text: '#1a1a1a',
  muted: '#8a8a8a',
  border: '#f0ebe4',
}

const card = {
  background: C.card,
  borderRadius: 20,
  boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
  overflow: 'hidden',
}
const btnOrange = {
  border: 0, borderRadius: 14, background: C.orange, color: '#fff',
  fontWeight: 800, fontFamily: "'Nunito',sans-serif", cursor: 'pointer',
}
const btnOutline = {
  border: `2px solid ${C.orange}`, borderRadius: 14, background: 'transparent',
  color: C.orange, fontWeight: 800, fontFamily: "'Nunito',sans-serif", cursor: 'pointer',
}
const btnGhost = {
  border: '1.5px solid #e8e0d8', borderRadius: 14, background: 'transparent',
  color: C.muted, fontWeight: 700, fontFamily: "'Nunito',sans-serif", cursor: 'pointer',
}
const inp = {
  width: '100%', boxSizing: 'border-box',
  padding: '13px 16px', borderRadius: 14,
  border: '1.5px solid #e8e0d8', background: '#fafaf8',
  color: C.text, fontFamily: "'Nunito',sans-serif", fontSize: 15, outline: 'none',
}

// ─── QtyCtrl ──────────────────────────────────────────────────────────────────

function QtyCtrl({ qty, onInc, onDec, sm }) {
  const sz = sm ? 28 : 34
  return (
    <div style={{ display:'flex', alignItems:'center', gap: sm?6:8, background: C.orangeLight, borderRadius: 999, padding: '3px 6px' }}>
      <button onClick={onDec} style={{ width:sz, height:sz, border:0, borderRadius:'50%', background: qty===1?'#ffd4c2':C.orange, color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900 }}>−</button>
      <span style={{ minWidth:20, textAlign:'center', fontWeight:800, fontSize: sm?14:17, color: C.text }}>{qty}</span>
      <button onClick={onInc} style={{ width:sz, height:sz, border:0, borderRadius:'50%', background: C.orange, color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900 }}>+</button>
    </div>
  )
}

// ─── ModifierModal ────────────────────────────────────────────────────────────

function ModifierModal({ item, allAddons, onConfirm, onSkip }) {
  const [selected, setSelected] = useState([])
  const available = allAddons.filter(a => {
    if (item.variant === 'chicken' && a.id === 'addon-sh-pork-70') return false
    if (item.variant === 'pork' && a.id === 'addon-sh-chicken-70') return false
    return true
  })
  const selectedIds = new Set(selected.map(s=>s.id))
  const addonsTotal = selected.reduce((s,m)=>s+Number(m.price||0),0)

  function toggle(addon) {
    if (selectedIds.has(addon.id)) setSelected(prev=>prev.filter(s=>s.id!==addon.id))
    else setSelected(prev=>[...prev,{id:addon.id,name:addon.name,price:Number(addon.price||0)}])
  }

  return (
    <div onClick={onSkip} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:90, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 8px 8px' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:560, maxHeight:'88vh', overflow:'auto', ...card, borderRadius:24 }}>
        <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:20, color:C.text, marginBottom:4 }}>{item.name}</div>
          <div style={{ color:C.muted, fontSize:14 }}>Выберите добавки — каждая по одному разу</div>
        </div>

        <div style={{ display:'grid', gap:8, padding:'0 16px', marginBottom:16 }}>
          {available.map(addon => {
            const isSel = selectedIds.has(addon.id)
            return (
              <button key={addon.id} onClick={()=>toggle(addon)} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'13px 16px', borderRadius:16, cursor:'pointer', width:'100%', textAlign:'left',
                border: isSel ? `2px solid ${C.orange}` : '1.5px solid #f0ebe4',
                background: isSel ? C.orangeLight : '#fafaf8',
                transition: 'all 0.12s',
              }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{addon.name}</div>
                  <div style={{ color:C.orange, fontSize:13, fontWeight:700, marginTop:2 }}>{fmt(addon.price)}</div>
                </div>
                <div style={{ width:26, height:26, borderRadius:'50%', border: isSel?'none':'1.5px solid #ddd', background: isSel?C.orange:'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:900, flexShrink:0 }}>
                  {isSel ? '✓' : ''}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ padding:'0 16px 20px', borderTop:'1.5px solid #f0ebe4', paddingTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ color:C.muted, fontSize:14 }}>{selected.length>0?`Добавок: ${selected.length}`:'Без добавок'}</span>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:20, color:C.orange }}>{fmt(Number(item.price||0)+addonsTotal)}</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onSkip} style={{ ...btnGhost, padding:'12px 16px', fontSize:14, flex:1 }}>Без добавок</button>
            <button onClick={()=>onConfirm(selected)} style={{ ...btnOrange, padding:'12px 16px', fontSize:14, flex:2 }}>
              {selected.length>0?`Добавить с ${selected.length} доб.`:'Добавить в корзину'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ItemModal ────────────────────────────────────────────────────────────────

function ItemModal({ item, qty, onAdd, onInc, onDec, onClose, isShawarma }) {
  const unavail = item.coming_soon || Number(item.price) <= 0
  const inCart  = qty > 0
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:85, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 8px 8px' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:560, ...card, borderRadius:24 }}>
        {/* Фото */}
        <div style={{ height:220, background:'linear-gradient(135deg,#ffe8d6,#fff0e8)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {item.image_url
            ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:72 }}>{CATEGORY_EMOJI[item.category]||'🍽'}</span>
          }
          <button onClick={onClose} style={{ position:'absolute', top:12, right:12, width:36, height:36, borderRadius:'50%', border:0, background:'rgba(255,255,255,0.9)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>×</button>
          {item.variant && (
            <div style={{ position:'absolute', top:12, left:12, background:'rgba(255,255,255,0.9)', borderRadius:999, padding:'4px 12px', fontSize:12, fontWeight:700, color:C.text }}>
              {item.variant==='chicken'?'🐔 курица':item.variant==='pork'?'🐷 свинина':item.variant}
            </div>
          )}
        </div>
        <div style={{ padding:'18px 20px 20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:20, marginBottom:6, color:C.text }}>{item.name}</div>
          {item.description && <div style={{ fontSize:14, color:C.muted, lineHeight:1.6, marginBottom:14 }}>{item.description}</div>}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1.5px solid #f0ebe4', paddingTop:14 }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:24, color:C.orange }}>{unavail?'Скоро':fmt(item.price)}</span>
            {!unavail && (
              inCart
                ? <QtyCtrl qty={qty} onInc={()=>onInc(item.id)} onDec={()=>onDec(item.id)} />
                : <button onClick={()=>{onAdd(item);onClose()}} style={{ ...btnOrange, padding:'12px 22px', fontSize:15 }}>
                    {isShawarma ? 'Выбрать добавки →' : 'В корзину'}
                  </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ item, cartEntries, onAdd, onInc, onDec, isShawarma, onCardClick }) {
  const unavail  = item.coming_soon || Number(item.price) <= 0
  const totalQty = cartEntries.reduce((s,e)=>s+e.qty,0)
  const inCart   = totalQty > 0

  return (
    <div style={{ ...card, cursor:'pointer', transition:'box-shadow 0.15s', borderRadius:20 }} onClick={()=>onCardClick&&onCardClick(item)}>
      {/* Фото */}
      <div style={{ height:140, background:'linear-gradient(135deg,#ffe8d6,#fff5f0)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span style={{ fontSize:48 }}>{CATEGORY_EMOJI[item.category]||'🍽'}</span>
        }
        {item.variant && (
          <div style={{ position:'absolute', top:8, left:8, background:'rgba(255,255,255,0.92)', borderRadius:999, padding:'3px 10px', fontSize:11, fontWeight:700, color:C.text }}>
            {item.variant==='chicken'?'🐔 курица':item.variant==='pork'?'🐷 свинина':item.variant}
          </div>
        )}
        {item.spicy && <div style={{ position:'absolute', top:8, right:8, fontSize:16 }}>🌶</div>}
        {unavail && (
          <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.75)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'20px 20px 0 0' }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.muted }}>Скоро в продаже</span>
          </div>
        )}
        {!unavail && (
          <div style={{ position:'absolute', bottom:8, right:8, background:'rgba(255,255,255,0.95)', borderRadius:10, padding:'3px 10px' }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:15, color:C.orange }}>{fmt(item.price)}</span>
          </div>
        )}
      </div>

      {/* Контент */}
      <div style={{ padding:'12px 14px 14px' }}>
        <div style={{ fontWeight:800, fontSize:14, color:C.text, lineHeight:1.3, marginBottom: item.description?4:10 }}>{item.name}</div>
        {item.description && <div style={{ fontSize:12, color:C.muted, lineHeight:1.5, marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.description}</div>}

        {/* Строки корзины */}
        {inCart && cartEntries.map(entry => (
          <div key={entry.cartKey} onClick={e=>e.stopPropagation()} style={{ marginBottom:8, padding:'7px 10px', borderRadius:10, background:C.orangeLight, border:`1px solid #ffd4c2` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
              <div style={{ fontSize:12, color:C.orangeDark, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {entry.modifiers?.length>0 ? entry.modifiers.map(m=>m.name).join(', ') : 'Без добавок'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                {isShawarma
                  ? <button onClick={()=>onDec(entry.cartKey)} style={{ ...btnGhost, padding:'3px 9px', fontSize:12, borderRadius:8 }}>✕</button>
                  : <QtyCtrl qty={entry.qty} onInc={()=>onInc(entry.cartKey)} onDec={()=>onDec(entry.cartKey)} sm />
                }
                <span style={{ fontSize:12, fontWeight:800, color:C.orange, minWidth:48, textAlign:'right' }}>
                  {fmt((Number(item.price)+entry.modifiers.reduce((s,m)=>s+m.price,0))*entry.qty)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {!unavail && (
          <button onClick={e=>{e.stopPropagation();onAdd(item)}} style={{ ...btnOrange, width:'100%', padding:'10px', fontSize:14, borderRadius:12 }}>
            {inCart ? '+ Добавить ещё' : isShawarma ? 'Выбрать добавки →' : 'В корзину'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── CatSection ───────────────────────────────────────────────────────────────

function CatSection({ catKey, items, openMap, toggle, getEntries, onAdd, onInc, onDec, onCardClick }) {
  const isOpen = openMap[catKey]
  const label  = CATEGORY_LABELS[catKey] || catKey
  const emoji  = CATEGORY_EMOJI[catKey] || '🍽'
  const totalInCart = items.reduce((s,i)=>s+getEntries(i.id).reduce((ss,e)=>ss+e.qty,0),0)
  const isShawarma = catKey === 'shawarma'

  return (
    <section style={{ marginBottom:12 }}>
      <button onClick={()=>toggle(catKey)} style={{
        width:'100%', textAlign:'left', border:0, borderRadius: isOpen?'18px 18px 0 0':18,
        background: isOpen ? C.orange : C.card,
        color: isOpen ? '#fff' : C.text,
        fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:16,
        padding:'14px 18px', cursor:'pointer',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        boxShadow: isOpen ? `0 4px 20px rgba(255,107,53,0.25)` : '0 2px 8px rgba(0,0,0,0.06)',
        transition:'all 0.15s',
      }}>
        <span>{emoji} {label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {totalInCart>0 && (
            <span style={{ background: isOpen?'rgba(255,255,255,0.25)':C.orange, color:'#fff', fontSize:12, fontWeight:900, padding:'2px 9px', borderRadius:999 }}>{totalInCart}</span>
          )}
          <span style={{ fontSize:16, opacity:0.8 }}>{isOpen?'−':'+'}</span>
        </div>
      </button>

      {isOpen && (
        <div style={{ background:'#f7f3ee', borderRadius:'0 0 18px 18px', padding:'12px', border:`1px solid ${C.border}`, borderTop:'none' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {items.map(item => (
              <ProductCard
                key={item.id} item={item}
                cartEntries={getEntries(item.id)}
                onAdd={onAdd} onInc={onInc} onDec={onDec}
                isShawarma={isShawarma} onCardClick={onCardClick}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ─── UpsellScreen ─────────────────────────────────────────────────────────────

function UpsellScreen({ cart, items, onAddItem, onProceed }) {
  const byId = new Map(items.map(i=>[i.id,i]))
  const cartCats = new Set(cart.flatMap(e=>{const item=byId.get(e.id);return item?[item.category]:[]}))
  const shawarmaWithoutAddons = cart.filter(e=>{const item=byId.get(e.id);return item?.category==='shawarma'&&(!e.modifiers||e.modifiers.length===0)})
  const hasFry = cartCats.has('fries')
  const hasSauces = cartCats.has('sauces')
  const hasDrinks = cartCats.has('drinks')
  const coffeeKw = ['эспрессо','американо','капучино','латте','раф','макиато']
  const sections = []

  if (shawarmaWithoutAddons.length>0) {
    const addons = items.filter(i=>i.category==='shawarma_addons'&&Number(i.price)>0&&!i.coming_soon)
    if (addons.length) sections.push({key:'addons',title:'Добавки к шаурме',emoji:'➕',items:addons.slice(0,6)})
  }
  if (!hasFry) {
    const fries = items.filter(i=>i.category==='fries'&&Number(i.price)>0&&!i.coming_soon)
    if (fries.length) sections.push({key:'fries',title:'Картошка?',emoji:'🍟',items:fries.slice(0,4)})
  }
  if (hasFry&&!hasSauces) {
    const sauces = items.filter(i=>i.category==='sauces'&&Number(i.price)>0&&!i.coming_soon)
    if (sauces.length) sections.push({key:'sauces',title:'Соус к картошке?',emoji:'🥫',items:sauces.slice(0,4)})
  }
  if (!hasDrinks) {
    const drinks = items.filter(i=>i.category==='drinks'&&Number(i.price)>0&&!i.coming_soon)
      .sort((a,b)=>{const ac=coffeeKw.some(k=>a.name.toLowerCase().includes(k))?1:0;const bc=coffeeKw.some(k=>b.name.toLowerCase().includes(k))?1:0;return ac-bc})
    if (drinks.length) sections.push({key:'drinks',title:'Что-нибудь выпить?',emoji:'☕',items:drinks})
  }

  const cartIds = new Set(cart.map(e=>e.id))

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:75, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 8px 8px', overflowY:'auto' }}>
      <div style={{ width:'100%', maxWidth:680, maxHeight:'92vh', overflow:'auto', ...card, borderRadius:24 }}>
        <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:22, color:C.text, marginBottom:4 }}>Не забыли ничего? 🤔</div>
          <div style={{ color:C.muted, fontSize:14 }}>Добавьте к заказу или переходите к оформлению</div>
        </div>

        {sections.map(section => (
          <div key={section.key} style={{ marginBottom:20, padding:'0 16px' }}>
            <div style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:10 }}>{section.emoji} {section.title}</div>
            <div style={{ display:'grid', gap:8 }}>
              {section.items.map(item => {
                const inCart = cartIds.has(item.id)
                return (
                  <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14, background: inCart?C.orangeLight:'#fafaf8', border:`1.5px solid ${inCart?'#ffd4c2':'#f0ebe4'}` }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{item.name}</div>
                      <div style={{ color:C.orange, fontSize:13, fontWeight:700, marginTop:2 }}>{fmt(item.price)}</div>
                    </div>
                    {inCart
                      ? <span style={{ fontSize:13, color:C.orange, fontWeight:700 }}>✓ В корзине</span>
                      : <button onClick={()=>onAddItem(item)} style={{ ...btnOrange, padding:'9px 16px', fontSize:13, borderRadius:10 }}>+ Добавить</button>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {sections.length===0 && (
          <div style={{ textAlign:'center', padding:'24px 0', color:C.muted, fontSize:15 }}>Отличный заказ! Всё уже есть 🎉</div>
        )}

        <div style={{ padding:'16px 16px 20px', borderTop:`1.5px solid ${C.border}` }}>
          <button onClick={onProceed} style={{ ...btnOrange, width:'100%', padding:'15px', fontSize:16, borderRadius:14 }}>
            Перейти к оформлению →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CheckoutModal ────────────────────────────────────────────────────────────

function CheckoutModal({ cartItems, total, branch, previewNum, previewLoading, onClose, onSuccess, onInc, onDec, onRemove, onClear }) {
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [comment, setComment] = useState('')
  const [err,     setErr]     = useState('')
  const [busy,    setBusy]    = useState(false)

  async function submit() {
    setErr('')
    if (!name.trim())  return setErr('Введите имя')
    if (!phone.trim()) return setErr('Введите телефон')
    setBusy(true)
    try {
      const res = await fetch('/api/orders', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ branch_id:branch.id, customer_name:name, customer_phone:phone, comment, items:cartItems.map(i=>({id:i.id,qty:i.qty,modifiers:i.modifiers||[]})) }),
      })
      const data = await res.json()
      if (!res.ok) return setErr(data?.error||'Ошибка при оформлении')
      onSuccess(data.order)
    } catch { setErr('Ошибка соединения') }
    finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:80, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 8px 8px' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:680, maxHeight:'92vh', overflow:'auto', ...card, borderRadius:24 }}>
        <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:22, color:C.text }}>
                Заказ {previewLoading ? <span style={{ color:C.muted }}>…</span> : <span style={{ color:C.orange }}>{previewNum}</span>}
              </div>
              <div style={{ color:C.muted, fontSize:13, marginTop:2 }}>{branch.fullName}</div>
            </div>
            <button onClick={onClose} style={{ background:'transparent', border:0, color:C.muted, fontSize:26, cursor:'pointer' }}>×</button>
          </div>
          <div style={{ marginTop:12, padding:'12px 14px', borderRadius:14, background:C.orangeLight, border:`1px solid #ffd4c2`, fontSize:13, color:C.orangeDark, lineHeight:1.6 }}>
            📞 Позвоните <strong>{branch.phone}</strong>{branch.address?<> · 📍 {branch.address}</>:null} и назовите номер заказа.
          </div>
        </div>

        <div style={{ padding:'0 16px', marginBottom:16, display:'grid', gap:8 }}>
          {cartItems.map(item => {
            const modsTotal = (item.modifiers||[]).reduce((s,m)=>s+m.price,0)
            const unitPrice = Number(item.price||0)+modsTotal
            return (
              <div key={item.cartKey} style={{ padding:'12px 14px', borderRadius:14, background:'#fafaf8', border:`1.5px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{item.name}</div>
                    {item.modifiers?.length>0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                        {item.modifiers.map(m=>(
                          <span key={m.id} style={{ fontSize:11, padding:'2px 8px', borderRadius:999, background:C.orangeLight, color:C.orangeDark, fontWeight:700 }}>+{m.name}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>{fmt(unitPrice)} × {item.qty}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <QtyCtrl qty={item.qty} onInc={()=>onInc(item.cartKey)} onDec={()=>onDec(item.cartKey)} sm />
                    <button onClick={()=>onRemove(item.cartKey)} style={{ ...btnGhost, padding:'5px 9px', fontSize:12, borderRadius:8 }}>✕</button>
                    <span style={{ fontWeight:800, minWidth:60, textAlign:'right', fontSize:14, color:C.orange }}>{fmt(unitPrice*item.qty)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding:'0 16px', display:'grid', gap:10, marginBottom:14 }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя *" style={inp} />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Телефон *" type="tel" style={inp} />
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий" rows={2} style={{ ...inp, resize:'vertical' }} />
        </div>

        {err && <div style={{ color:'#e53e3e', fontSize:14, marginBottom:12, padding:'0 16px' }}>{err}</div>}

        <div style={{ padding:'0 16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ color:C.muted, fontSize:13 }}>Итого</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:26, color:C.orange }}>{fmt(total)}</div>
          </div>
          <div style={{ display:'flex', gap:10, marginLeft:'auto' }}>
            <button onClick={onClear} style={{ ...btnGhost, padding:'12px 16px', fontSize:14 }}>Очистить</button>
            <button disabled={busy} onClick={submit} style={{ ...btnOrange, padding:'12px 22px', fontSize:15, opacity:busy?0.7:1 }}>
              {busy?'Оформляем…':'Подтвердить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ClosedScreen ─────────────────────────────────────────────────────────────

function ClosedScreen({ branch, schedule }) {
  const openTime   = schedule?.open||'10:00'
  const closeTime  = schedule?.close||'22:00'
  const cutoffTime = schedule?.cutoff||'21:30'
  const now = new Date()
  const nowUB = new Date(now.getTime()+8*60*60*1000)
  const nowMin = nowUB.getUTCHours()*60+nowUB.getUTCMinutes()
  const [oh,om] = openTime.split(':').map(Number)
  const isNotOpenYet = nowMin < oh*60+om

  return (
    <div style={{ maxWidth:420, margin:'40px auto', padding:'0 16px', textAlign:'center' }}>
      <div style={{ fontSize:72, marginBottom:16 }}>{isNotOpenYet?'🌙':'🔒'}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:26, marginBottom:8, color:C.text }}>
        {isNotOpenYet?'Ещё закрыто':'Уже закрыто'}
      </div>
      <div style={{ color:C.muted, fontSize:15, lineHeight:1.7, marginBottom:28 }}>
        {isNotOpenYet
          ? <>Приём заказов начнётся в <strong style={{ color:C.orange }}>{openTime}</strong></>
          : <>Приём завершён в <strong style={{ color:C.orange }}>{cutoffTime}</strong><br/>Ждём завтра с <strong style={{ color:C.orange }}>{openTime}</strong></>
        }
      </div>
      <div style={{ ...card, padding:20, marginBottom:24, borderRadius:20, textAlign:'left' }}>
        <div style={{ fontWeight:800, fontSize:15, color:C.orange, marginBottom:12 }}>📍 {branch.fullName}</div>
        <div style={{ display:'grid', gap:8, fontSize:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', color:C.text }}><span style={{ color:C.muted }}>Работаем</span><span style={{ fontWeight:700 }}>{openTime} — {closeTime}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', color:C.text }}><span style={{ color:C.muted }}>Приём заказов</span><span style={{ fontWeight:700 }}>до {cutoffTime}</span></div>
          {branch.phone && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.muted }}>Телефон</span><a href={`tel:${branch.phone}`} style={{ fontWeight:700, color:C.orange, textDecoration:'none' }}>{branch.phone}</a></div>}
          {branch.address && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.muted }}>Адрес</span><span style={{ fontWeight:700, color:C.text }}>{branch.address}</span></div>}
        </div>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <a href="/order" style={{ ...btnGhost, padding:'12px 20px', fontSize:14, textDecoration:'none', display:'inline-block' }}>Мой заказ</a>
        <a href="/admin" style={{ ...btnGhost, padding:'12px 20px', fontSize:14, textDecoration:'none', display:'inline-block' }}>Для администратора</a>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [branchId,       setBranchId]       = useState(BRANCHES[0].id)
  const [items,          setItems]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [loadErr,        setLoadErr]        = useState('')
  const [cart,           setCart]           = useState([])
  const [schedule,       setSchedule]       = useState(null)
  const [openMap,        setOpenMap]        = useState({shawarma:true,burgers:true,fries:true})
  const [modifierTarget, setModifierTarget] = useState(null)
  const [itemModal,      setItemModal]      = useState(null)
  const [upsellOpen,     setUpsellOpen]     = useState(false)
  const [checkoutOpen,   setCheckoutOpen]   = useState(false)
  const [successOrder,   setSuccessOrder]   = useState(null)
  const [previewNum,     setPreviewNum]     = useState('????')
  const [previewLoading, setPreviewLoading] = useState(false)

  const branch = BRANCHES.find(b=>b.id===branchId)||BRANCHES[0]
  const addons = useMemo(()=>items.filter(i=>i.category==='shawarma_addons'),[items])

  const isOpenNow = useMemo(()=>{
    if (!schedule) return true
    const now = new Date()
    const nowUB = new Date(now.getTime()+8*60*60*1000)
    const nowMin = nowUB.getUTCHours()*60+nowUB.getUTCMinutes()
    const [oh,om] = (schedule.open||'00:00').split(':').map(Number)
    const [ch,cm] = (schedule.cutoff||'23:59').split(':').map(Number)
    return nowMin >= oh*60+om && nowMin < ch*60+cm
  },[schedule])

  useEffect(()=>{
    try {
      const p = JSON.parse(localStorage.getItem(CART_KEY)||'{}')
      if (Array.isArray(p?.items)) setCart(p.items)
      if (p?.branchId && BRANCHES.some(b=>b.id===p.branchId)) setBranchId(p.branchId)
    } catch {}
  },[])

  useEffect(()=>{
    try { localStorage.setItem(CART_KEY,JSON.stringify({branchId,items:cart})) } catch {}
  },[branchId,cart])

  useEffect(()=>{
    let active=true; setLoading(true); setLoadErr('')
    async function load() {
      const sb=getSB()
      if (!sb){if(active){setItems([]);setLoadErr('Supabase не настроен');setLoading(false)}return}
      const stopId = branch.stopId
      const [{data:menu,error:menuErr},{data:stop},{data:branchRow}] = await Promise.all([
        sb.from('menu_items').select('*').order('name'),
        sb.from('stop_list').select('menu_item_id').eq('branch_id',stopId).eq('is_stopped',true),
        sb.from('branches').select('open,close,cutoff').eq('name',branch.fullName).maybeSingle(),
      ])
      if (!active) return
      if (menuErr){setItems([]);setLoadErr('Не удалось загрузить меню');setLoading(false);return}
      if (branchRow) setSchedule(branchRow)
      const stoppedIds = new Set((stop||[]).map(r=>r.menu_item_id))
      const filtered = (menu||[])
        .filter(i=>!stoppedIds.has(i.id))
        .filter(i=>!Array.isArray(i.branch_ids)||i.branch_ids.length===0||i.branch_ids.includes(branchId))
        .map(i=>({...i,category:normCat(i.category)}))
      const seen=new Set()
      const deduped=filtered.filter(i=>seen.has(i.id)?false:seen.add(i.id))
      const avail=new Set(deduped.map(i=>i.id))
      setCart(prev=>prev.filter(e=>avail.has(e.id)))
      setItems(deduped); setLoading(false)
    }
    load(); return()=>{active=false}
  },[branchId])

  useEffect(()=>{
    if (!checkoutOpen) return
    let active=true; setPreviewLoading(true)
    async function load() {
      const sb=getSB()
      if (!sb){if(active){setPreviewNum('????');setPreviewLoading(false)}return}
      try {
        const {data}=await sb.from('order_counters').select('last_number').eq('branch_id',branchId).maybeSingle()
        if(active)setPreviewNum(pad4((Number(data?.last_number)||0)+1))
      } catch {if(active)setPreviewNum('????')}
      finally {if(active)setPreviewLoading(false)}
    }
    load(); return()=>{active=false}
  },[checkoutOpen,branchId])

  const grouped = useMemo(()=>{
    const g={}; for(const c of CATEGORY_ORDER)g[c]=[]
    for(const i of items){const c=i.category;if(!g[c])g[c]=[];g[c].push(i)}
    return g
  },[items])

  const cartDetails = useMemo(()=>{
    const byId=new Map(items.map(i=>[i.id,i]))
    let count=0,total=0
    const list=cart.flatMap(e=>{
      const item=byId.get(e.id)
      if(!item||e.qty<=0)return []
      const modsTotal=(e.modifiers||[]).reduce((s,m)=>s+m.price,0)
      const unitPrice=Number(item.price||0)+modsTotal
      const lineTotal=unitPrice*e.qty
      count+=e.qty; total+=lineTotal
      return [{...item,cartKey:e.cartKey,qty:e.qty,modifiers:e.modifiers||[],lineTotal}]
    })
    return {list,count,total}
  },[cart,items])

  function getEntries(itemId) {
    const byId=new Map(items.map(i=>[i.id,i]))
    return cart.filter(e=>e.id===itemId).map(e=>{
      const item=byId.get(e.id)
      return {...e,price:Number(item?.price||0)+(e.modifiers||[]).reduce((s,m)=>s+m.price,0)}
    })
  }

  function handleAdd(item) {
    if (item.category==='shawarma') setModifierTarget(item)
    else addToCart(item,[])
  }

  function addToCart(item,modifiers) {
    const cartKey=makeCartKey(item.id,modifiers)
    setCart(prev=>{
      const ex=prev.find(e=>e.cartKey===cartKey)
      if(ex)return prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty+1}:e)
      return [...prev,{cartKey,id:item.id,qty:1,modifiers}]
    })
  }

  function incQty(cartKey){setCart(prev=>prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty+1}:e))}
  function decQty(cartKey){setCart(prev=>prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty-1}:e).filter(e=>e.qty>0))}
  function removeEntry(cartKey){setCart(prev=>prev.filter(e=>e.cartKey!==cartKey))}
  function clearCart(){setCart([])}
  function toggle(cat){setOpenMap(prev=>({...prev,[cat]:!prev[cat]}))}
  function handleSuccess(order){setCart([]);setCheckoutOpen(false);setUpsellOpen(false);setSuccessOrder(order)}

  // Экран успеха
  if (successOrder) {
    const num=successOrder.short_number||successOrder.order_number||successOrder.id
    async function subscribePush() {
      try {
        const reg=await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const existing=await reg.pushManager.getSubscription()
        const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY})
        await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),order_id:successOrder.id})})
      } catch(e){console.log('Push error:',e)}
    }
    return (
      <main style={{ maxWidth:480, margin:'0 auto', padding:'60px 16px', textAlign:'center' }}>
        <div style={{ fontSize:72, marginBottom:16 }}>✅</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:28, marginBottom:8, color:C.text }}>Заказ оформлен!</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:56, color:C.orange, margin:'20px 0' }}>{num}</div>
        <div style={{ color:C.muted, fontSize:15, lineHeight:1.7, marginBottom:24 }}>
          Позвоните по номеру <strong style={{ color:C.text }}>{branch.phone}</strong>
          {branch.address?<><br/>📍 {branch.address}</>:null}
          <br/>и назовите номер <strong style={{ color:C.orange }}>{num}</strong>
        </div>
        {typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&(
          <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:16, background:C.orangeLight, border:`1px solid #ffd4c2` }}>
            <div style={{ fontSize:14, color:C.orangeDark, marginBottom:10 }}>🔔 Получите уведомление когда заказ будет готов</div>
            <button onClick={subscribePush} style={{ ...btnOrange, padding:'10px 20px', fontSize:14 }}>Разрешить уведомления</button>
          </div>
        )}
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a href={`/order?number=${encodeURIComponent(num)}`} style={{ ...btnOrange, padding:'14px 24px', fontSize:15, textDecoration:'none', display:'inline-block' }}>Отследить заказ</a>
          <button onClick={()=>setSuccessOrder(null)} style={{ ...btnOutline, padding:'14px 24px', fontSize:15 }}>Новый заказ</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth:860, margin:'0 auto', padding:'0 0 120px' }}>

      {/* Шапка */}
      <div style={{ background: `linear-gradient(160deg, #fff5f0 0%, #ffffff 100%)`, borderBottom:`2px solid ${C.border}`, marginBottom:16 }}>
        {/* Навигация */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:16, padding:'10px 16px 0' }}>
          <a href="/where" style={{ color:C.muted, fontSize:12, textDecoration:'none', fontWeight:600 }}>📍 Найти нас</a>
          <a href="/order" style={{ color:C.muted, fontSize:12, textDecoration:'none', fontWeight:600 }}>Мой заказ</a>
          <a href="/admin" style={{ color:C.muted, fontSize:12, textDecoration:'none', fontWeight:600 }}>Для администратора</a>
        </div>

        {/* Логотип */}
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 20px 16px' }}>
          <img src="/logo.png" alt="На Виражах" style={{ height:160, width:'85%', maxWidth:380, objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(255,107,53,0.2))' }} />
        </div>

        {/* Выбор точки */}
        <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
            {BRANCHES.map(b=>(
              <button key={b.id} onClick={()=>{setBranchId(b.id);setCart([])}} style={{
                border: branchId===b.id ? `2px solid ${C.orange}` : '2px solid #e8e0d8',
                background: branchId===b.id ? C.orangeLight : '#fff',
                color: branchId===b.id ? C.orange : C.muted,
                borderRadius:999, padding:'9px 22px',
                fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:'pointer',
                transition:'all 0.15s',
              }}>{b.name}</button>
            ))}
          </div>
          {branch.phone && (
            <div style={{ fontSize:13, color:C.muted, display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}>
              <a href={`tel:${branch.phone.replace(/\s/g,'')}`} style={{ color:C.muted, textDecoration:'none', fontWeight:600 }}>📞 {branch.phone}</a>
              {branch.address && <span>📍 {branch.address}</span>}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:'0 12px' }}>
        {/* Кафе закрыто */}
        {schedule && !isOpenNow && !loading && <ClosedScreen branch={branch} schedule={schedule} />}

        {loading && <div style={{ color:C.muted, padding:'20px 4px', textAlign:'center' }}>Загружаем меню…</div>}
        {!loading && loadErr && <div style={{ color:'#e53e3e', padding:'20px 4px' }}>{loadErr}</div>}

        {!loading && !loadErr && (!schedule || isOpenNow) && CATEGORY_ORDER.map(cat=>{
          const catItems=grouped[cat]||[]
          if (!catItems.length) return null
          return (
            <CatSection key={cat} catKey={cat} items={catItems}
              openMap={openMap} toggle={toggle} getEntries={getEntries}
              onAdd={handleAdd} onInc={incQty} onDec={decQty} onCardClick={setItemModal}
            />
          )
        })}
      </div>

      {/* Корзина */}
      {cartDetails.count>0 && (
        <div style={{ position:'fixed', left:12, right:12, bottom:12, background:'#fff', borderRadius:20, padding:'12px 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.15)', zIndex:50, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:C.orangeLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🛒</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:C.text }}>
              {cartDetails.count} {cartDetails.count===1?'позиция':cartDetails.count<5?'позиции':'позиций'}
            </div>
            <div style={{ color:C.muted, fontSize:13 }}>{fmt(cartDetails.total)}</div>
          </div>
          <button onClick={()=>setUpsellOpen(true)} style={{ ...btnOrange, marginLeft:'auto', padding:'12px 20px', fontSize:15 }}>
            Оформить →
          </button>
        </div>
      )}

      {/* Модалки */}
      {itemModal && (
        <ItemModal item={itemModal} qty={cartDetails.list.find(e=>e.id===itemModal.id)?.qty||0}
          onAdd={handleAdd} onInc={incQty} onDec={decQty}
          isShawarma={itemModal.category==='shawarma'} onClose={()=>setItemModal(null)} />
      )}
      {modifierTarget && (
        <ModifierModal item={modifierTarget} allAddons={addons}
          onConfirm={modifiers=>{addToCart(modifierTarget,modifiers);setModifierTarget(null)}}
          onSkip={()=>{addToCart(modifierTarget,[]);setModifierTarget(null)}} />
      )}
      {upsellOpen && !checkoutOpen && (
        <UpsellScreen cart={cart} items={items}
          onAddItem={item=>{
            const cartKey=makeCartKey(item.id,[])
            setCart(prev=>{const ex=prev.find(e=>e.cartKey===cartKey);if(ex)return prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty+1}:e);return [...prev,{cartKey,id:item.id,qty:1,modifiers:[]}]})
          }}
          onProceed={()=>{setUpsellOpen(false);setCheckoutOpen(true)}}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal cartItems={cartDetails.list} total={cartDetails.total} branch={branch}
          previewNum={previewNum} previewLoading={previewLoading}
          onClose={()=>setCheckoutOpen(false)} onSuccess={handleSuccess}
          onInc={incQty} onDec={decQty} onRemove={removeEntry} onClear={clearCart} />
      )}
    </main>
  )
}
