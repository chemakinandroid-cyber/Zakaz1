'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Константы ────────────────────────────────────────────────────────────────

const BRANCHES = [
  { id: 'nv-fr-002', name: 'Аэропорт', fullName: 'На Виражах — Аэропорт', phone: '+7 902 452-42-22', address: 'мкр. Аэропорт, 7' },
  { id: 'nv-sh-001', name: 'Конечная',  fullName: 'На Виражах — Конечная',  phone: '+7 908 593-26-88', address: 'ул. Конечная, 10, корп. 4' },
]

const CATEGORY_ORDER  = ['shawarma','shawarma_addons','burgers','hotdogs','shashlik','quesadilla','fries','sauces','drinks']
const CATEGORY_LABELS = {
  shawarma:'Шаурма', shawarma_addons:'Добавки к шаурме',
  burgers:'Бургеры', hotdogs:'Хот-доги', shashlik:'Шашлык',
  quesadilla:'Кесадилья', fries:'Фритюр', sauces:'Соусы', drinks:'Напитки',
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

// cartKey — уникальный ключ позиции: id товара + отсортированные id модификаторов
function makeCartKey(itemId, modifiers=[]) {
  const mids = [...modifiers].map(m=>m.id).sort().join(',')
  return mids ? `${itemId}::${mids}` : itemId
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const card  = { background:'linear-gradient(160deg,#0d1f4e 0%,#07122e 100%)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:16, boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }
const inp   = { width:'100%', boxSizing:'border-box', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'#f0f4ff', fontFamily:"'Onest',sans-serif", fontSize:15, outline:'none' }
const btnG  = { border:0, borderRadius:12, background:'#22c55e', color:'#07122e', fontWeight:800, fontFamily:"'Onest',sans-serif", cursor:'pointer' }
const btnY  = { border:0, borderRadius:12, background:'#f4a01d', color:'#07122e', fontWeight:800, fontFamily:"'Onest',sans-serif", cursor:'pointer' }
const btnGh = { border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, background:'transparent', color:'#c8d5f5', fontWeight:700, fontFamily:"'Onest',sans-serif", cursor:'pointer' }

// ─── QtyControl ───────────────────────────────────────────────────────────────

function QtyCtrl({ qty, onInc, onDec, sm }) {
  const sz = sm ? 28 : 36
  return (
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <button onClick={onDec} style={{...btnGh,width:sz,height:sz,fontSize:18,padding:0,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}}>−</button>
      <span style={{minWidth:20,textAlign:'center',fontWeight:800,fontSize:sm?14:18}}>{qty}</span>
      <button onClick={onInc} style={{...btnG,width:sz,height:sz,fontSize:18,padding:0,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}}>+</button>
    </div>
  )
}


// ─── UpsellScreen — экран перед оформлением ──────────────────────────────────

function UpsellScreen({ cart, items, onAddItem, onProceed }) {
  const byId = new Map(items.map(i=>[i.id,i]))

  // Категории уже в корзине
  const cartCats = new Set(
    cart.flatMap(e => {
      const item = byId.get(e.id)
      if (!item) return []
      // Для шаурмы также считаем модификаторы как добавки
      return [item.category]
    })
  )

  // Шаурмы в корзине без добавок (modifiers пустые)
  const shawarmaWithoutAddons = cart.filter(e => {
    const item = byId.get(e.id)
    return item?.category === 'shawarma' && (!e.modifiers || e.modifiers.length === 0)
  })

  const hasFries   = cartCats.has('fries')
  const hasSauces  = cartCats.has('sauces')
  const hasDrinks  = cartCats.has('drinks')
  const hasFry     = hasFries

  // Строим секции upsell
  const sections = []

  // 1. Добавки к шаурме (если есть шаурма без добавок)
  if (shawarmaWithoutAddons.length > 0) {
    const addons = items.filter(i => i.category === 'shawarma_addons' && Number(i.price) > 0 && !i.coming_soon)
    if (addons.length) sections.push({ key:'addons', title:'Добавки к шаурме', subtitle:'У вас шаурма без добавок', items: addons.slice(0,6) })
  }

  // 2. Фритюр (если нет)
  if (!hasFry) {
    const fries = items.filter(i => i.category === 'fries' && Number(i.price) > 0 && !i.coming_soon)
    if (fries.length) sections.push({ key:'fries', title:'Картошка?', subtitle:'Фритюр к вашему заказу', items: fries.slice(0,4) })
  }

  // 3. Соусы (если есть фри, но нет соуса)
  if (hasFry && !hasSauces) {
    const sauces = items.filter(i => i.category === 'sauces' && Number(i.price) > 0 && !i.coming_soon)
    if (sauces.length) sections.push({ key:'sauces', title:'Соус к картошке?', subtitle:'', items: sauces.slice(0,4) })
  }

  // 4. Напитки (если нет) — показываем все, некофейные сначала
  if (!hasDrinks) {
    const coffeeKeywords = ['эспрессо','американо','капучино','латте','раф','флэт','макиато','мокко']
    const drinks = items
      .filter(i => i.category === 'drinks' && Number(i.price) > 0 && !i.coming_soon)
      .sort((a, b) => {
        const aIsCoffee = coffeeKeywords.some(k => a.name.toLowerCase().includes(k)) ? 1 : 0
        const bIsCoffee = coffeeKeywords.some(k => b.name.toLowerCase().includes(k)) ? 1 : 0
        return aIsCoffee - bIsCoffee // некофейные сначала
      })
    if (drinks.length) sections.push({ key:'drinks', title:'Что-нибудь выпить?', subtitle:'Напитки к заказу', items: drinks })
  }

  const cartIds = new Set(cart.map(e=>e.id))

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:75,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 8px 8px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:680,maxHeight:'92vh',overflow:'auto',background:'linear-gradient(160deg,#0d1f4e 0%,#07122e 100%)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:18}}>

        {/* Заголовок */}
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:20,marginBottom:4}}>
            Не забыли ничего? 🤔
          </div>
          <div style={{color:'#8fa3cc',fontSize:13}}>Добавьте к заказу или переходите к оформлению</div>
        </div>

        {/* Секции */}
        {sections.map(section => (
          <div key={section.key} style={{marginBottom:20}}>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:700,fontSize:14,marginBottom:4}}>{section.title}</div>
            {section.subtitle && <div style={{color:'#8fa3cc',fontSize:12,marginBottom:10}}>{section.subtitle}</div>}
            <div style={{display:'grid',gap:8}}>
              {section.items.map(item => {
                const inCart = cartIds.has(item.id)
                return (
                  <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:14,background:inCart?'rgba(34,197,94,0.08)':'rgba(255,255,255,0.04)',border:inCart?'1px solid rgba(34,197,94,0.3)':'1px solid rgba(255,255,255,0.07)'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:'#f0f4ff'}}>{item.name}</div>
                      <div style={{color:'#8fa3cc',fontSize:13,marginTop:2}}>{fmt(item.price)}</div>
                    </div>
                    {inCart
                      ? <span style={{fontSize:13,color:'#22c55e',fontWeight:700}}>✓ В корзине</span>
                      : <button onClick={()=>onAddItem(item)} style={{...btnG,padding:'9px 16px',fontSize:14,borderRadius:10}}>+ Добавить</button>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Если нечего предлагать */}
        {sections.length === 0 && (
          <div style={{textAlign:'center',padding:'24px 0',color:'#8fa3cc',fontSize:14}}>
            Отличный заказ! Всё уже есть 🎉
          </div>
        )}

        {/* Кнопка оформления */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16,marginTop:4}}>
          <button onClick={onProceed} style={{...btnY,width:'100%',padding:'15px',fontSize:16,borderRadius:14}}>
            Перейти к оформлению →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ModifierModal — выбор добавок к шаурме ───────────────────────────────────

function ModifierModal({ item, allAddons, onConfirm, onSkip }) {
  const [selected, setSelected] = useState([]) // [{id,name,price}]

  // Фильтруем добавки по варианту шаурмы
  const available = allAddons.filter(a => {
    if (item.variant === 'chicken' && a.id === 'addon-sh-pork-70')    return false
    if (item.variant === 'pork'    && a.id === 'addon-sh-chicken-70') return false
    return true
  })

  const selectedIds = new Set(selected.map(s=>s.id))
  const addonsTotal = selected.reduce((s,m)=>s+Number(m.price||0), 0)

  function toggle(addon) {
    if (selectedIds.has(addon.id)) {
      setSelected(prev => prev.filter(s=>s.id!==addon.id))
    } else {
      setSelected(prev => [...prev, {id:addon.id, name:addon.name, price:Number(addon.price||0)}])
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:90,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 8px 8px'}}>
      <div style={{width:'100%',maxWidth:560,maxHeight:'88vh',overflow:'auto',...card,borderRadius:20}}>

        {/* Заголовок */}
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:17,marginBottom:4}}>
            {item.name}
          </div>
          <div style={{color:'#8fa3cc',fontSize:13}}>Выберите добавки (каждая — только один раз)</div>
        </div>

        {/* Список добавок */}
        <div style={{display:'grid',gap:8,marginBottom:16}}>
          {available.map(addon => {
            const isSelected = selectedIds.has(addon.id)
            return (
              <button
                key={addon.id}
                onClick={() => toggle(addon)}
                style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'12px 14px', borderRadius:14, cursor:'pointer',
                  border: isSelected ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                  background: isSelected ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                  textAlign:'left', width:'100%',
                }}
              >
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:'#f0f4ff'}}>{addon.name}</div>
                  <div style={{color:'#8fa3cc',fontSize:13,marginTop:2}}>{fmt(addon.price)}</div>
                </div>
                <div style={{
                  width:24,height:24,borderRadius:6,flexShrink:0,
                  background: isSelected ? '#22c55e' : 'rgba(255,255,255,0.08)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:'#07122e',fontSize:16,fontWeight:900,
                }}>
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            )
          })}
        </div>

        {/* Итог и кнопки */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{color:'#8fa3cc',fontSize:13}}>
              {selected.length > 0
                ? `Выбрано добавок: ${selected.length}`
                : 'Без добавок'}
            </div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:18,color:'#f4a01d'}}>
              {fmt(Number(item.price||0) + addonsTotal)}
            </div>
          </div>

          <div style={{display:'flex',gap:10}}>
            <button onClick={onSkip} style={{...btnGh,padding:'12px 16px',fontSize:14,flex:1}}>
              Без добавок
            </button>
            <button onClick={() => onConfirm(selected)} style={{...btnG,padding:'12px 16px',fontSize:14,flex:2}}>
              {selected.length > 0 ? `Добавить с ${selected.length} доб.` : 'Добавить в корзину'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── ItemModal — карточка товара ─────────────────────────────────────────────

function ItemModal({ item, qty, onAdd, onInc, onDec, onClose, isShawarma }) {
  const unavail = item.coming_soon || Number(item.price) <= 0
  const inCart  = qty > 0

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:85,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 8px 8px'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:560,background:'linear-gradient(160deg,#0d1f4e 0%,#07122e 100%)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:20,boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>

        {/* Фото или заглушка */}
        <div style={{marginBottom:16,borderRadius:14,overflow:'hidden',height:200,background:'linear-gradient(135deg,#1a2d5a,#0a1628)',position:'relative'}}>
          {item.image_url
            ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
            : <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
                <span style={{fontSize:56}}>
                  {item.category==='shawarma'?'🌯':item.category==='burgers'?'🍔':item.category==='hotdogs'?'🌭':item.category==='fries'?'🍟':item.category==='drinks'?'☕':item.category==='sauces'?'🥫':item.category==='shashlik'?'🍖':item.category==='quesadilla'?'🫓':item.category==='shawarma_addons'?'➕':'🍽'}
                </span>
                <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>фото скоро</span>
              </div>
          }
        </div>

        {/* Шапка */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:18,lineHeight:1.3,marginBottom:6}}>
              {item.name}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              {item.variant && (
                <span style={{fontSize:12,padding:'3px 10px',borderRadius:999,background:'rgba(255,255,255,0.07)',color:'#a0b4e0'}}>
                  {item.variant==='chicken'?'🐔 курица':item.variant==='pork'?'🐷 свинина':item.variant}
                </span>
              )}
              {item.spicy && <span style={{fontSize:13}}>🌶 острое</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:0,color:'#6b7db5',fontSize:26,cursor:'pointer',lineHeight:1,padding:'0 0 0 12px',flexShrink:0}}>×</button>
        </div>

        {/* Описание */}
        {item.description && (
          <div style={{fontSize:14,color:'#8fa3cc',lineHeight:1.6,marginBottom:16,padding:'12px 14px',background:'rgba(255,255,255,0.03)',borderRadius:12}}>
            {item.description}
          </div>
        )}

        {/* Цена и кнопки */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16}}>
          <div>
            {unavail
              ? <span style={{color:'#6b7db5',fontSize:14}}>Скоро в продаже</span>
              : <span style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:24,color:'#f4a01d'}}>{fmt(item.price)}</span>
            }
          </div>

          {!unavail && (
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {inCart && <QtyCtrl qty={qty} onInc={()=>onInc(item.id)} onDec={()=>onDec(item.id)} />}
              {!inCart && (
                <button
                  onClick={() => { onAdd(item); onClose() }}
                  style={{...btnG, padding:'12px 22px', fontSize:15, borderRadius:12}}
                >
                  {isShawarma ? 'Выбрать добавки →' : 'В корзину'}
                </button>
              )}
              {inCart && (
                <span style={{color:'#22c55e',fontWeight:700,fontSize:14}}>✓ В корзине</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ item, cartEntries, onAdd, onInc, onDec, isShawarma, allAddons, onCardClick }) {
  const unavail  = item.coming_soon || Number(item.price) <= 0
  const totalQty = cartEntries.reduce((s,e)=>s+e.qty, 0)
  const inCart   = totalQty > 0

  return (
    <div style={{...card, padding:0, overflow:'hidden', cursor:'pointer'}} onClick={()=>onCardClick&&onCardClick(item)}>

      {/* Фото или заглушка */}
      <div style={{position:'relative', height:140, background:'linear-gradient(135deg,#1a2d5a,#0a1628)', flexShrink:0}}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
          : <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}}>
              <span style={{fontSize:36}}>
                {item.category==='shawarma'?'🌯':item.category==='burgers'?'🍔':item.category==='hotdogs'?'🌭':item.category==='fries'?'🍟':item.category==='drinks'?'☕':item.category==='sauces'?'🥫':item.category==='shashlik'?'🍖':item.category==='quesadilla'?'🫓':'🍽'}
              </span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>фото скоро</span>
            </div>
        }
        {/* Цена поверх фото */}
        {!unavail && (
          <div style={{position:'absolute',bottom:8,right:8,background:'rgba(7,18,46,0.85)',backdropFilter:'blur(6px)',borderRadius:10,padding:'4px 10px'}}>
            <span style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:15,color:'#f4a01d'}}>{fmt(item.price)}</span>
          </div>
        )}
        {item.variant && (
          <div style={{position:'absolute',top:8,left:8,background:'rgba(7,18,46,0.8)',backdropFilter:'blur(6px)',borderRadius:999,padding:'3px 10px',fontSize:11,color:'#a0b4e0'}}>
            {item.variant==='chicken'?'🐔 курица':item.variant==='pork'?'🐷 свинина':item.variant}
          </div>
        )}
        {item.spicy && (
          <div style={{position:'absolute',top:8,right:8,fontSize:16}}>🌶</div>
        )}
        {unavail && (
          <div style={{position:'absolute',inset:0,background:'rgba(7,18,46,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:'#6b7db5',fontSize:13,fontWeight:700}}>Скоро в продаже</span>
          </div>
        )}
      </div>

      {/* Контент */}
      <div style={{padding:'12px 14px'}}>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:4}}>{item.name}</div>
        {item.description && <div style={{fontSize:12,color:'#8fa3cc',lineHeight:1.5,marginBottom:10}}>{item.description}</div>}

        {/* Строки корзины с добавками */}
        {inCart && cartEntries.map((entry) => (
          <div key={entry.cartKey} onClick={e=>e.stopPropagation()} style={{marginBottom:8,padding:'7px 10px',borderRadius:10,background:'rgba(34,197,94,0.07)',border:'1px solid rgba(34,197,94,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
              <div style={{fontSize:12,color:'#a0f0c0',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {entry.modifiers?.length > 0 ? entry.modifiers.map(m=>m.name).join(', ') : 'Без добавок'}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                {/* Для шаурмы — кнопка удалить, для остальных — qty control */}
                {isShawarma
                  ? <button onClick={()=>onDec(entry.cartKey)} style={{...btnGh,padding:'4px 10px',fontSize:12,borderRadius:8}}>✕</button>
                  : <QtyCtrl qty={entry.qty} onInc={()=>onInc(entry.cartKey)} onDec={()=>onDec(entry.cartKey)} sm />
                }
                <span style={{fontSize:12,fontWeight:800,color:'#f4a01d',minWidth:48,textAlign:'right'}}>
                  {fmt((Number(item.price)+entry.modifiers.reduce((s,m)=>s+m.price,0))*entry.qty)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Кнопка добавить */}
        {!unavail && (
          <button
            onClick={e=>{e.stopPropagation();onAdd(item)}}
            style={{...btnG, width:'100%', padding:'10px', fontSize:14, borderRadius:10, marginTop: inCart ? 4 : 0}}
          >
            {inCart ? '+ Добавить ещё' : isShawarma ? 'Выбрать добавки →' : 'В корзину'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── CategorySection ──────────────────────────────────────────────────────────

function CatSection({ catKey, items, openMap, toggle, getEntries, onAdd, onInc, onDec, allAddons, onCardClick }) {
  const isOpen    = openMap[catKey]
  const label     = CATEGORY_LABELS[catKey] || catKey
  const totalInCart = items.reduce((s,i)=>s+getEntries(i.id).reduce((ss,e)=>ss+e.qty,0), 0)
  const isShawarma  = catKey === 'shawarma'

  return (
    <section style={{marginBottom:10}}>
      <button onClick={()=>toggle(catKey)} style={{
        width:'100%',textAlign:'left',border:0,
        borderRadius: isOpen ? '14px 14px 0 0' : 14,
        background: isOpen ? 'linear-gradient(90deg,#f4a01d,#e8890a)' : 'linear-gradient(90deg,#0e2050,#091738)',
        color: isOpen ? '#07122e' : '#c8d5f5',
        fontFamily:"'Unbounded',sans-serif",fontWeight:700,fontSize:14,
        padding:'14px 18px',cursor:'pointer',
        display:'flex',justifyContent:'space-between',alignItems:'center',
      }}>
        <span>{label}</span>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {totalInCart > 0 && (
            <span style={{background:isOpen?'#07122e':'#f4a01d',color:isOpen?'#f4a01d':'#07122e',fontSize:12,fontWeight:900,padding:'2px 8px',borderRadius:999}}>
              {totalInCart}
            </span>
          )}
          <span style={{fontSize:18,lineHeight:1}}>{isOpen?'−':'+'}</span>
        </div>
      </button>

      {isOpen && (
        <div style={{border:'1px solid rgba(255,255,255,0.07)',borderTop:0,borderRadius:'0 0 14px 14px',overflow:'hidden',background:'rgba(255,255,255,0.02)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,padding:10}}>
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              cartEntries={getEntries(item.id)}
              onAdd={onAdd}
              onInc={onInc}
              onDec={onDec}
              isShawarma={isShawarma}
              allAddons={allAddons}
              onCardClick={onCardClick}
            />
          ))}
          </div>
        </div>
      )}
    </section>
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
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          branch_id: branch.id,
          customer_name: name,
          customer_phone: phone,
          comment,
          items: cartItems.map(i=>({
            id: i.id,
            qty: i.qty,
            modifiers: i.modifiers||[],
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) return setErr(data?.error||'Ошибка при оформлении')
      onSuccess(data.order)
    } catch { setErr('Ошибка соединения') }
    finally   { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:80,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 8px 8px'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:680,maxHeight:'92vh',overflow:'auto',...card,borderRadius:20}}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:20}}>
              Заказ {previewLoading ? <span style={{opacity:0.4}}>…</span> : <span style={{color:'#f4a01d'}}>{previewNum}</span>}
            </div>
            <div style={{color:'#8fa3cc',fontSize:13,marginTop:4}}>{branch.fullName}</div>
            <div style={{marginTop:10,padding:'10px 14px',borderRadius:12,background:'rgba(244,160,29,0.1)',border:'1px solid rgba(244,160,29,0.2)',fontSize:13,color:'#ffd08a',lineHeight:1.6}}>
              После оформления позвоните <strong>{branch.phone}</strong>
              {branch.address ? <> · {branch.address}</> : null} и назовите номер заказа.
            </div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:0,color:'#8fa3cc',fontSize:28,cursor:'pointer',lineHeight:1,padding:'0 0 0 8px'}}>×</button>
        </div>

        {/* Позиции */}
        <div style={{display:'grid',gap:8,marginBottom:16}}>
          {cartItems.map(item => {
            const modsTotal = (item.modifiers||[]).reduce((s,m)=>s+m.price,0)
            const unitPrice = Number(item.price||0) + modsTotal
            return (
              <div key={item.cartKey} style={{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14}}>{item.name}</div>
                    {item.modifiers?.length > 0 && (
                      <div style={{marginTop:4,display:'flex',flexWrap:'wrap',gap:4}}>
                        {item.modifiers.map(m=>(
                          <span key={m.id} style={{fontSize:11,padding:'2px 8px',borderRadius:999,background:'rgba(34,197,94,0.12)',color:'#a0f0c0',border:'1px solid rgba(34,197,94,0.2)'}}>
                            +{m.name} {fmt(m.price)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{color:'#8fa3cc',fontSize:12,marginTop:4}}>{fmt(unitPrice)} × {item.qty}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <QtyCtrl qty={item.qty} onInc={()=>onInc(item.cartKey)} onDec={()=>onDec(item.cartKey)} sm />
                    <button onClick={()=>onRemove(item.cartKey)} style={{...btnGh,padding:'5px 9px',fontSize:12}}>✕</button>
                    <span style={{fontWeight:800,minWidth:60,textAlign:'right',fontSize:14,color:'#f4a01d'}}>{fmt(unitPrice*item.qty)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{display:'grid',gap:10,marginBottom:14}}>
          <input value={name}    onChange={e=>setName(e.target.value)}    placeholder="Ваше имя *"  style={inp} />
          <input value={phone}   onChange={e=>setPhone(e.target.value)}   placeholder="Телефон *"   type="tel" style={inp} />
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий" rows={2} style={{...inp,resize:'vertical'}} />
        </div>

        {err && <div style={{color:'#ff7c7c',fontSize:14,marginBottom:12}}>{err}</div>}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{color:'#8fa3cc',fontSize:13}}>Итого</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:22}}>{fmt(total)}</div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginLeft:'auto'}}>
            <button onClick={onClear} style={{...btnGh,padding:'12px 16px',fontSize:14}}>Очистить</button>
            <button disabled={busy} onClick={submit} style={{...btnG,padding:'12px 22px',fontSize:15,opacity:busy?0.6:1}}>
              {busy?'Оформляем…':'Подтвердить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────


// ─── ClosedScreen — кафе закрыто ─────────────────────────────────────────────

function ClosedScreen({ branch, schedule }) {
  const openTime = schedule?.open || '10:00'
  const closeTime = schedule?.close || '22:00'
  const cutoffTime = schedule?.cutoff || '21:30'

  // Определяем — ещё не открылось или уже закрылось
  const now = new Date()
  const nowUB = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const nowMin = nowUB.getUTCHours() * 60 + nowUB.getUTCMinutes()
  const [oh, om] = openTime.split(':').map(Number)
  const openMin = oh * 60 + om
  const isNotOpenYet = nowMin < openMin

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>
        {isNotOpenYet ? '🌙' : '🔒'}
      </div>
      <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 24, marginBottom: 8 }}>
        {isNotOpenYet ? 'Ещё закрыто' : 'Уже закрыто'}
      </div>
      <div style={{ color: '#8fa3cc', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
        {isNotOpenYet
          ? <>Приём заказов начнётся в <strong style={{ color: '#f4a01d' }}>{openTime}</strong></>
          : <>Приём заказов завершён в <strong style={{ color: '#f4a01d' }}>{cutoffTime}</strong><br />Ждём вас завтра с <strong style={{ color: '#f4a01d' }}>{openTime}</strong></>
        }
      </div>

      <div style={{ background: 'linear-gradient(160deg,#0d1f4e,#07122e)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 14, color: '#f4a01d', marginBottom: 14 }}>
          📍 {branch.fullName}
        </div>
        <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8d5f5' }}>
            <span>Время работы</span>
            <span style={{ fontWeight: 700 }}>{openTime} — {closeTime}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8d5f5' }}>
            <span>Приём заказов</span>
            <span style={{ fontWeight: 700 }}>до {cutoffTime}</span>
          </div>
          {branch.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8d5f5' }}>
              <span>Телефон</span>
              <a href={`tel:${branch.phone}`} style={{ fontWeight: 700, color: '#f4a01d', textDecoration: 'none' }}>{branch.phone}</a>
            </div>
          )}
          {branch.address && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8d5f5' }}>
              <span>Адрес</span>
              <span style={{ fontWeight: 700 }}>{branch.address}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/order" style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, background: 'transparent', color: '#c8d5f5', fontFamily: "'Onest',sans-serif", fontWeight: 700, padding: '12px 20px', fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
          Отследить заказ
        </a>
        <a href="/admin" style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, background: 'transparent', color: '#c8d5f5', fontFamily: "'Onest',sans-serif", fontWeight: 700, padding: '12px 20px', fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
          Вход для администратора
        </a>
      </div>
    </div>
  )
}

export default function Page() {
  const [branchId,       setBranchId]       = useState(BRANCHES[0].id)
  const [schedule,       setSchedule]       = useState(null) // {open, close, cutoff} из БД
  const [items,          setItems]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [loadErr,        setLoadErr]        = useState('')
  // cart: [{cartKey, id, qty, modifiers:[{id,name,price}]}]
  const [cart,           setCart]           = useState([])
  const [openMap,        setOpenMap]        = useState({shawarma:true,burgers:true,fries:true})
  const [modifierTarget, setModifierTarget] = useState(null) // item для которого открыта модалка добавок
  const [itemModal,      setItemModal]      = useState(null)  // item для карточки товара
  const [checkoutOpen,   setCheckoutOpen]   = useState(false)
  const [upsellOpen,     setUpsellOpen]     = useState(false)
  const [successOrder,   setSuccessOrder]   = useState(null)
  const [previewNum,     setPreviewNum]     = useState('????')
  const [previewLoading, setPreviewLoading] = useState(false)

  const branch   = BRANCHES.find(b=>b.id===branchId) || BRANCHES[0]
  const addons   = useMemo(()=>items.filter(i=>i.category==='shawarma_addons'), [items])

  // Проверка времени работы — используем локальное время браузера клиента
  const isOpenNow = useMemo(() => {
    if (!schedule) return true // пока не загрузили — разрешаем
    const now = new Date()
    const [oh, om] = (schedule.open||'00:00').split(':').map(Number)
    const [ch, cm] = (schedule.cutoff||'23:59').split(':').map(Number)
    const openMin   = oh * 60 + om
    const cutoffMin = ch * 60 + cm
    // Всегда считаем по Улан-Удэ UTC+8, независимо от устройства клиента
    const nowUB  = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const nowMin = nowUB.getUTCHours() * 60 + nowUB.getUTCMinutes()
    return nowMin >= openMin && nowMin < cutoffMin
  }, [schedule])

  // Восстановление корзины
  useEffect(()=>{
    try {
      const p = JSON.parse(localStorage.getItem(CART_KEY)||'{}')
      if (Array.isArray(p?.items)) setCart(p.items)
      if (p?.branchId && BRANCHES.some(b=>b.id===p.branchId)) setBranchId(p.branchId)
    } catch {}
  },[])

  useEffect(()=>{
    try { localStorage.setItem(CART_KEY, JSON.stringify({branchId,items:cart})) } catch {}
  },[branchId,cart])

  // Загрузка меню
  useEffect(()=>{
    let active=true; setLoading(true); setLoadErr('')
    async function load() {
      const sb=getSB()
      if (!sb) { if(active){setItems([]);setLoadErr('Supabase не настроен');setLoading(false)} return }
      const [{data:menu,error:menuErr},{data:stop},{data:branchRow}] = await Promise.all([
        sb.from('menu_items').select('*').order('name'),
        sb.from('stop_list').select('menu_item_id').eq('branch_id',branchId).eq('is_stopped',true),
        sb.from('branches').select('open,close,cutoff').eq('name', branch.fullName).maybeSingle(),
      ])
      if (active && branchRow) setSchedule(branchRow)
      if (!active) return
      if (menuErr) { setItems([]);setLoadErr('Не удалось загрузить меню');setLoading(false);return }
      const stoppedIds = new Set((stop||[]).map(r=>r.menu_item_id))
      const filtered = (menu||[])
        .filter(i=>!stoppedIds.has(i.id))
        .filter(i=>!Array.isArray(i.branch_ids)||i.branch_ids.length===0||i.branch_ids.includes(branchId))
        .map(i=>({...i,category:normCat(i.category)}))
      // Дедупликация по id (на случай дублей в БД)
      const seen=new Set(); const deduped=filtered.filter(i=>seen.has(i.id)?false:seen.add(i.id))
      const avail=new Set(deduped.map(i=>i.id))
      setCart(prev=>prev.filter(e=>avail.has(e.id)))
      setItems(deduped)
      setLoading(false)
    }
    load(); return ()=>{active=false}
  },[branchId])

  // Превью номера заказа
  useEffect(()=>{
    if (!checkoutOpen) return
    let active=true; setPreviewLoading(true)
    async function load() {
      const sb=getSB()
      if (!sb){if(active){setPreviewNum('????');setPreviewLoading(false)}return}
      try {
        const {data}=await sb.from('order_counters').select('last_number').eq('branch_id',branchId).maybeSingle()
        if(active) setPreviewNum(pad4((Number(data?.last_number)||0)+1))
      } catch {if(active)setPreviewNum('????')}
      finally {if(active)setPreviewLoading(false)}
    }
    load(); return ()=>{active=false}
  },[checkoutOpen,branchId])

  // Группировка меню
  const grouped = useMemo(()=>{
    const g={}; for(const c of CATEGORY_ORDER) g[c]=[]
    for(const i of items){const c=i.category;if(!g[c])g[c]=[];g[c].push(i)}
    return g
  },[items])

  // Детали корзины
  const cartDetails = useMemo(()=>{
    const byId=new Map(items.map(i=>[i.id,i]))
    let count=0,total=0
    const list=cart.flatMap(e=>{
      const item=byId.get(e.id)
      if(!item||e.qty<=0) return []
      const modsTotal=(e.modifiers||[]).reduce((s,m)=>s+m.price,0)
      const unitPrice=Number(item.price||0)+modsTotal
      const lineTotal=unitPrice*e.qty
      count+=e.qty; total+=lineTotal
      return [{...item, cartKey:e.cartKey, qty:e.qty, modifiers:e.modifiers||[], lineTotal}]
    })
    return {list,count,total}
  },[cart,items])

  // Все строки корзины для конкретного item.id
  function getEntries(itemId) {
    const byId=new Map(items.map(i=>[i.id,i]))
    return cart.filter(e=>e.id===itemId).map(e=>{
      const item=byId.get(e.id)
      const modsTotal=(e.modifiers||[]).reduce((s,m)=>s+m.price,0)
      return {...e, price:Number(item?.price||0)+modsTotal}
    })
  }

  // Добавление в корзину
  function handleAdd(item) {
    if (item.category==='shawarma') {
      setModifierTarget(item) // открываем модалку добавок
    } else {
      addToCart(item, [])
    }
  }

  function addToCart(item, modifiers) {
    const cartKey = makeCartKey(item.id, modifiers)
    setCart(prev=>{
      const ex=prev.find(e=>e.cartKey===cartKey)
      if (ex) return prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty+1}:e)
      return [...prev,{cartKey,id:item.id,qty:1,modifiers}]
    })
  }

  function incQty(cartKey)  { setCart(prev=>prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty+1}:e)) }
  function decQty(cartKey)  { setCart(prev=>prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty-1}:e).filter(e=>e.qty>0)) }
  function removeEntry(cartKey) { setCart(prev=>prev.filter(e=>e.cartKey!==cartKey)) }
  function clearCart()      { setCart([]) }
  function toggle(cat)      { setOpenMap(prev=>({...prev,[cat]:!prev[cat]})) }

  function handleSuccess(order) {
    setCart([]); setCheckoutOpen(false); setUpsellOpen(false); setSuccessOrder(order)
  }

  // ─── Экран успеха ────────────────────────────────────────────────────────────

  if (successOrder) {
    const num=successOrder.short_number||successOrder.order_number||successOrder.id

    async function subscribePush() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/push/subscribe', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ subscription: sub.toJSON(), order_id: successOrder.id }),
        })
      } catch(e) { console.log('Push subscribe error:', e) }
    }

    return (
      <main style={{maxWidth:480,margin:'0 auto',padding:'60px 16px',textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:26,marginBottom:8}}>Заказ оформлен!</div>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:52,color:'#f4a01d',margin:'20px 0'}}>{num}</div>
        <div style={{color:'#8fa3cc',fontSize:15,lineHeight:1.7,marginBottom:24}}>
          Позвоните по номеру <strong style={{color:'#f0f4ff'}}>{branch.phone}</strong>
          {branch.address?<><br/>📍 {branch.address}</>:null}
          <br/>и назовите номер заказа <strong style={{color:'#f4a01d'}}>{num}</strong>
        </div>

        {typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && (
          <div style={{marginBottom:24,padding:'14px 16px',borderRadius:14,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)'}}>
            <div style={{fontSize:14,color:'#a0f0c0',marginBottom:10}}>
              🔔 Получите уведомление когда заказ будет готов
            </div>
            <button onClick={subscribePush} style={{...btnG,padding:'10px 20px',fontSize:14}}>
              Разрешить уведомления
            </button>
          </div>
        )}

        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <a href={`/order?number=${encodeURIComponent(num)}`} style={{...btnY,padding:'14px 24px',fontSize:15,textDecoration:'none',display:'inline-block'}}>Отследить заказ</a>
          <button onClick={()=>setSuccessOrder(null)} style={{...btnGh,padding:'14px 24px',fontSize:15}}>Новый заказ</button>
        </div>
      </main>
    )
  }

  // ─── Основной рендер ─────────────────────────────────────────────────────────

  // Показываем экран закрытия только после загрузки расписания
  if (schedule && !isOpenNow && !loading) {
    return (
      <main style={{maxWidth:860,margin:'0 auto',padding:'16px 12px'}}>
        {/* Шапка с выбором точки */}
        <div style={{...card,marginBottom:14,background:'linear-gradient(135deg,#0f2660 0%,#07122e 100%)'}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:26,marginBottom:4}}>На Виражах</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginTop:10}}>
            {BRANCHES.map(b=>(
              <button key={b.id} onClick={()=>{setBranchId(b.id);setCart([])}} style={{
                border:branchId===b.id?'2px solid #f4a01d':'1px solid rgba(255,255,255,0.1)',
                background:branchId===b.id?'rgba(244,160,29,0.12)':'rgba(255,255,255,0.03)',
                color:branchId===b.id?'#f4a01d':'#c8d5f5',
                borderRadius:999,padding:'9px 16px',
                fontFamily:"'Onest',sans-serif",fontWeight:700,fontSize:14,cursor:'pointer',
              }}>{b.name}</button>
            ))}
            <div style={{marginLeft:'auto',display:'flex',gap:16}}>
              <a href="/order" style={{color:'#6b8ecf',fontSize:13,textDecoration:'none'}}>Мой заказ</a>
              <a href="/admin" style={{color:'#6b8ecf',fontSize:13,textDecoration:'none'}}>Вход для администратора</a>
            </div>
          </div>
        </div>
        <ClosedScreen branch={branch} schedule={schedule} />
      </main>
    )
  }

  return (
    <main style={{maxWidth:860,margin:'0 auto',padding:'16px 12px 120px'}}>

      {/* Шапка */}
      {/* Шапка с логотипом */}
      <div style={{
        marginBottom:14, borderRadius:20, overflow:'hidden',
        boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
        position:'relative',
        background:'linear-gradient(160deg,#0f2660 0%,#07122e 100%)',
        border:'1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Навигация сверху */}
        <div style={{position:'absolute',top:12,right:16,display:'flex',gap:14,zIndex:2}}>
          <a href="/where" style={{color:'rgba(255,255,255,0.4)',fontSize:12,textDecoration:'none'}}>📍 Найти нас</a>
          <a href="/order" style={{color:'rgba(255,255,255,0.4)',fontSize:12,textDecoration:'none'}}>Мой заказ</a>
          <a href="/admin" style={{color:'rgba(255,255,255,0.4)',fontSize:12,textDecoration:'none'}}>Вход для администратора</a>
        </div>

        {/* Логотип по центру */}
        <div style={{display:'flex',justifyContent:'center',padding:'28px 20px 20px'}}>
          <img
            src="/logo.png"
            alt="На Виражах"
            style={{
              height:200, width:'90%', maxWidth:420, objectFit:'contain',
              filter:'drop-shadow(0 4px 24px rgba(0,0,0,0.7))',
            }}
          />
        </div>

        {/* Выбор точки */}
        <div style={{padding:'0 16px 14px',display:'flex',flexDirection:'column',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
            {BRANCHES.map(b=>(
              <button key={b.id} onClick={()=>{setBranchId(b.id);setCart([])}} style={{
                border:branchId===b.id?'2px solid #f4a01d':'1px solid rgba(255,255,255,0.12)',
                background:branchId===b.id?'rgba(244,160,29,0.15)':'rgba(255,255,255,0.05)',
                color:branchId===b.id?'#f4a01d':'#c8d5f5',
                borderRadius:999, padding:'9px 20px',
                fontFamily:"'Onest',sans-serif", fontWeight:700, fontSize:14, cursor:'pointer',
              }}>{b.name}</button>
            ))}
          </div>
          {branch.phone && (
            <div style={{fontSize:13,color:'rgba(255,255,255,0.35)',display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center'}}>
              <a href={`tel:${branch.phone.replace(/\s/g,'')}`} style={{color:'rgba(255,255,255,0.35)',textDecoration:'none'}}>📞 {branch.phone}</a>
              {branch.address && <span>📍 {branch.address}</span>}
            </div>
          )}
        </div>
      </div>

      {loading  && <div style={{color:'#6b7db5',padding:'20px 4px'}}>Загружаем меню…</div>}
      {!loading && loadErr && <div style={{color:'#ff7c7c',padding:'20px 4px'}}>{loadErr}</div>}

      {!loading && !loadErr && CATEGORY_ORDER.map(cat=>{
        const catItems=grouped[cat]||[]
        if (!catItems.length) return null
        return (
          <CatSection
            key={cat} catKey={cat} items={catItems}
            openMap={openMap} toggle={toggle}
            getEntries={getEntries}
            onAdd={handleAdd} onInc={incQty} onDec={decQty}
            allAddons={addons}
            onCardClick={setItemModal}
          />
        )
      })}

      {/* Плавающая корзина */}
      {cartDetails.count>0 && (
        <div style={{position:'fixed',left:12,right:12,bottom:12,background:'rgba(7,18,46,0.97)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,padding:'12px 16px',boxShadow:'0 16px 48px rgba(0,0,0,0.5)',backdropFilter:'blur(16px)',zIndex:50,display:'flex',alignItems:'center',gap:12}}>
          <div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:15}}>
              {cartDetails.count} {cartDetails.count===1?'позиция':cartDetails.count<5?'позиции':'позиций'}
            </div>
            <div style={{color:'#8fa3cc',fontSize:13}}>{fmt(cartDetails.total)}</div>
          </div>
          <button onClick={()=>setUpsellOpen(true)} style={{...btnY,marginLeft:'auto',padding:'12px 20px',fontSize:15}}>
            Оформить заказ →
          </button>
        </div>
      )}

      {/* Upsell экран */}
      {upsellOpen && !checkoutOpen && (
        <UpsellScreen
          cart={cart}
          items={items}
          onAddItem={item => {
            const cartKey = makeCartKey(item.id, [])
            setCart(prev => {
              const ex = prev.find(e=>e.cartKey===cartKey)
              if (ex) return prev.map(e=>e.cartKey===cartKey?{...e,qty:e.qty+1}:e)
              return [...prev,{cartKey,id:item.id,qty:1,modifiers:[]}]
            })
          }}
          onProceed={() => { setUpsellOpen(false); setCheckoutOpen(true) }}
        />
      )}

      {/* Карточка товара */}
      {itemModal && (
        <ItemModal
          item={itemModal}
          qty={cartDetails.list.find(e=>e.id===itemModal.id)?.qty || 0}
          onAdd={handleAdd}
          onInc={incQty}
          onDec={decQty}
          isShawarma={itemModal.category==='shawarma'}
          onClose={()=>setItemModal(null)}
        />
      )}

      {/* Модалка добавок */}
      {modifierTarget && (
        <ModifierModal
          item={modifierTarget}
          allAddons={addons}
          onConfirm={modifiers=>{
            addToCart(modifierTarget, modifiers)
            setModifierTarget(null)
          }}
          onSkip={()=>{
            addToCart(modifierTarget, [])
            setModifierTarget(null)
          }}
        />
      )}

      {/* Оформление заказа */}
      {checkoutOpen && (
        <CheckoutModal
          cartItems={cartDetails.list} total={cartDetails.total} branch={branch}
          previewNum={previewNum} previewLoading={previewLoading}
          onClose={()=>setCheckoutOpen(false)} onSuccess={handleSuccess}
          onInc={incQty} onDec={decQty} onRemove={removeEntry} onClear={clearCart}
        />
      )}
    </main>
  )
}
