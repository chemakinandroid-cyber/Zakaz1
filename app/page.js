'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const BRANCHES = [
  { id:'nv-fr-002', name:'Аэропорт', fullName:'На Виражах — Аэропорт', phone:'+7 902 452-42-22', address:'мкр. Аэропорт, 7', stopId:'airport' },
  { id:'nv-sh-001', name:'Конечная',  fullName:'На Виражах — Конечная',  phone:'+7 908 593-26-88', address:'ул. Конечная, 10, корп. 4', stopId:'konechnaya' },
]
const CATEGORY_ORDER  = ['shawarma','burgers','hotdogs','shashlik','quesadilla','fries','sauces','drinks']
const CATEGORY_LABELS = { shawarma:'Шаурма', shawarma_addons:'Добавки', burgers:'Бургеры', hotdogs:'Хот-доги', shashlik:'Шашлык', quesadilla:'Кесадилья', fries:'Фритюр', sauces:'Соусы', drinks:'Напитки' }
const CATEGORY_EMOJI  = { shawarma:'🌯', shawarma_addons:'➕', burgers:'🍔', hotdogs:'🌭', shashlik:'🍖', quesadilla:'🫓', fries:'🍟', sauces:'🥫', drinks:'☕' }
const CART_KEY = 'nv_cart_v5'

function normCat(c){ const r=String(c||'').trim().toLowerCase(); if(!r)return 'other'; if(r==='fryer')return 'fries'; return r }
function fmt(p){ return `${Number(p||0)} ₽` }
function pad4(n){ const num=Number(String(n||'').replace(/\D/g,'')); return Number.isFinite(num)&&num>0?String(num).padStart(4,'0'):'????' }
function getSB(){ const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if(!u||!k)return null; return createClient(u,k) }
function makeCartKey(id,mods=[]){ const m=[...mods].map(m=>m.id).sort().join(','); return m?`${id}::${m}`:id }

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  hero: '#1c1f2e',         // тёмно-синий шапка
  heroBorder: '#2a2f45',
  accent: '#ff6b35',       // оранжевый
  accentHover: '#e55a24',
  accentBg: '#fff3ee',
  gold: '#f4a01d',         // золото для цен
  bg: '#f5f0eb',           // кремовый фон
  surface: '#ffffff',
  surfaceAlt: '#faf8f5',
  text: '#111827',
  sub: '#6b7280',
  border: '#ede8e0',
  green: '#16a34a',
  greenBg: '#f0fdf4',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const card = { background: T.surface, borderRadius: 16, boxShadow: '0 1px 12px rgba(0,0,0,0.08)' }
const pill = { borderRadius: 999, fontFamily:"'Nunito',sans-serif", fontWeight: 800, cursor: 'pointer', border: 0 }

function Btn({ children, variant='solid', size='md', onClick, disabled, style={} }) {
  const sizes = { sm:'8px 14px', md:'11px 20px', lg:'14px 28px' }
  const base = { ...pill, padding: sizes[size], fontSize: size==='sm'?13:size==='lg'?16:14, cursor: disabled?'not-allowed':'pointer', opacity: disabled?0.65:1, transition:'all 0.15s', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }
  const variants = {
    solid:   { ...base, background: T.accent, color: '#fff', boxShadow:`0 3px 12px rgba(255,107,53,0.35)` },
    outline: { ...base, background: 'transparent', border:`2px solid ${T.accent}`, color: T.accent },
    ghost:   { ...base, background: 'rgba(0,0,0,0.05)', border:'none', color: T.sub },
    dark:    { ...base, background: T.hero, color:'#fff', border:'none' },
    white:   { ...base, background: '#fff', color: T.text, boxShadow:'0 2px 8px rgba(0,0,0,0.12)', border:'none' },
  }
  return <button onClick={onClick} disabled={disabled} style={{...variants[variant],...style}}>{children}</button>
}

function QtyCtrl({ qty, onInc, onDec, sm }) {
  const sz = sm?30:36
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, background:T.accentBg, borderRadius:999, padding:'3px 5px' }}>
      <button onClick={onDec} style={{ width:sz,height:sz,border:0,borderRadius:'50%',background:T.accent,color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,lineHeight:1 }}>−</button>
      <span style={{ minWidth:24,textAlign:'center',fontWeight:900,fontSize:sm?14:16,color:T.text,fontFamily:"'Nunito',sans-serif" }}>{qty}</span>
      <button onClick={onInc} style={{ width:sz,height:sz,border:0,borderRadius:'50%',background:T.accent,color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,lineHeight:1 }}>+</button>
    </div>
  )
}

// ─── ModifierModal ────────────────────────────────────────────────────────────
function ModifierModal({ item, allAddons, onConfirm, onSkip }) {
  const [sel, setSel] = useState([])
  const available = allAddons.filter(a => {
    if (item.variant==='chicken'&&a.id==='addon-sh-pork-70') return false
    if (item.variant==='pork'&&a.id==='addon-sh-chicken-70') return false
    return true
  })
  const selIds = new Set(sel.map(s=>s.id))
  const addTotal = sel.reduce((s,m)=>s+Number(m.price||0),0)
  function toggle(a){ if(selIds.has(a.id))setSel(p=>p.filter(s=>s.id!==a.id)); else setSel(p=>[...p,{id:a.id,name:a.name,price:Number(a.price||0)}]) }

  return (
    <div onClick={onSkip} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:90,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 0' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',background:T.hero,borderRadius:'24px 24px 0 0',paddingBottom:'env(safe-area-inset-bottom,16px)' }}>
        {/* Ручка */}
        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 4px' }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'rgba(255,255,255,0.2)' }} />
        </div>

        <div style={{ padding:'0 20px 16px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:20,color:'#fff',marginBottom:4 }}>{item.name}</div>
          <div style={{ color:'rgba(255,255,255,0.5)',fontSize:14,marginBottom:20 }}>Каждая добавка — один раз</div>
        </div>

        <div style={{ display:'grid',gap:8,padding:'0 16px',marginBottom:16 }}>
          {available.map(a=>{
            const on=selIds.has(a.id)
            return (
              <button key={a.id} onClick={()=>toggle(a)} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderRadius:16,cursor:'pointer',width:'100%',textAlign:'left',border:on?`2px solid ${T.accent}`:'2px solid rgba(255,255,255,0.1)',background:on?'rgba(255,107,53,0.15)':'rgba(255,255,255,0.05)',transition:'all 0.12s' }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:15,color:'#fff' }}>{a.name}</div>
                  <div style={{ color:T.accent,fontSize:13,fontWeight:700,marginTop:2 }}>+{fmt(a.price)}</div>
                </div>
                <div style={{ width:26,height:26,borderRadius:'50%',background:on?T.accent:'rgba(255,255,255,0.1)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:900,flexShrink:0,transition:'all 0.12s' }}>
                  {on?'✓':''}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ padding:'16px',borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
            <span style={{ color:'rgba(255,255,255,0.5)',fontSize:13 }}>{sel.length>0?`${sel.length} добавок`:'Без добавок'}</span>
            <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:22,color:T.gold }}>{fmt(Number(item.price||0)+addTotal)}</span>
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <Btn variant="ghost" size="md" onClick={onSkip} style={{ flex:1,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)' }}>Без добавок</Btn>
            <Btn variant="solid" size="md" onClick={()=>onConfirm(sel)} style={{ flex:2 }}>
              {sel.length>0?`В корзину · ${fmt(Number(item.price)+addTotal)}`:'Добавить в корзину'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ItemModal ────────────────────────────────────────────────────────────────
function ItemModal({ item, qty, onAdd, onInc, onDec, onClose, isShawarma }) {
  const unavail = item.coming_soon||Number(item.price)<=0
  const inCart  = qty>0
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:85,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:540,...card,borderRadius:'24px 24px 0 0',overflow:'hidden' }}>
        <div style={{ height:240,background:`linear-gradient(160deg,#ffe4d6,#fff5f0)`,position:'relative',display:'flex',alignItems:'center',justifyContent:'center' }}>
          {item.image_url
            ? <img src={item.image_url} alt={item.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            : <span style={{ fontSize:80 }}>{CATEGORY_EMOJI[item.category]||'🍽'}</span>
          }
          <button onClick={onClose} style={{ position:'absolute',top:14,right:14,width:38,height:38,borderRadius:'50%',border:0,background:'rgba(255,255,255,0.9)',cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',color:T.sub,backdropFilter:'blur(4px)' }}>×</button>
          {item.variant && (
            <div style={{ position:'absolute',top:14,left:14,background:'rgba(255,255,255,0.92)',borderRadius:999,padding:'4px 12px',fontSize:12,fontWeight:700,color:T.text,backdropFilter:'blur(4px)' }}>
              {item.variant==='chicken'?'🐔 курица':item.variant==='pork'?'🐷 свинина':item.variant}
            </div>
          )}
          {item.spicy && <div style={{ position:'absolute',bottom:14,left:14,background:'rgba(239,68,68,0.9)',borderRadius:999,padding:'4px 12px',fontSize:12,fontWeight:700,color:'#fff' }}>🌶 острое</div>}
        </div>
        <div style={{ padding:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:22,color:T.text,marginBottom:8 }}>{item.name}</div>
          {item.description && <div style={{ fontSize:14,color:T.sub,lineHeight:1.7,marginBottom:16 }}>{item.description}</div>}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:`1.5px solid ${T.border}`,paddingTop:16 }}>
            <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:28,color:T.gold }}>{unavail?'Скоро':fmt(item.price)}</span>
            {!unavail && (
              inCart
                ? <QtyCtrl qty={qty} onInc={()=>onInc(item.id)} onDec={()=>onDec(item.id)} />
                : <Btn variant="solid" size="lg" onClick={()=>{onAdd(item);onClose()}}>
                    {isShawarma?'Выбрать добавки →':'В корзину'}
                  </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({ item, cartEntries, onAdd, onInc, onDec, isShawarma, onCardClick }) {
  const unavail  = item.coming_soon||Number(item.price)<=0
  const totalQty = cartEntries.reduce((s,e)=>s+e.qty,0)
  const inCart   = totalQty>0

  return (
    <div onClick={()=>onCardClick&&onCardClick(item)} style={{ ...card,cursor:'pointer',display:'flex',flexDirection:'column',overflow:'hidden',transition:'transform 0.15s, box-shadow 0.15s' }}>
      {/* Фото */}
      <div style={{ height:130,background:`linear-gradient(145deg,#ffe4d6,#fff5f0)`,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
          : <span style={{ fontSize:44 }}>{CATEGORY_EMOJI[item.category]||'🍽'}</span>
        }
        {inCart && (
          <div style={{ position:'absolute',top:8,right:8,background:T.green,color:'#fff',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900 }}>{totalQty}</div>
        )}
        {item.variant && (
          <div style={{ position:'absolute',top:8,left:8,background:'rgba(255,255,255,0.9)',borderRadius:999,padding:'2px 8px',fontSize:10,fontWeight:800,color:T.text }}>
            {item.variant==='chicken'?'🐔 кур.':item.variant==='pork'?'🐷 свин.':item.variant}
          </div>
        )}
        {unavail && (
          <div style={{ position:'absolute',inset:0,background:'rgba(255,255,255,0.75)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ fontSize:12,fontWeight:700,color:T.sub }}>Скоро</span>
          </div>
        )}
      </div>

      {/* Текст */}
      <div style={{ padding:'10px 12px 12px',display:'flex',flexDirection:'column',flex:1 }}>
        <div style={{ fontWeight:800,fontSize:13,color:T.text,lineHeight:1.3,marginBottom:4,flex:1 }}>{item.name}</div>
        {item.description && (
          <div style={{ fontSize:11,color:T.sub,lineHeight:1.5,marginBottom:8,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{item.description}</div>
        )}

        {/* Строки корзины */}
        {inCart && cartEntries.map(entry=>(
          <div key={entry.cartKey} onClick={e=>e.stopPropagation()} style={{ marginBottom:6,padding:'5px 8px',borderRadius:8,background:T.accentBg,border:`1px solid #ffd4c2`,fontSize:11 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:6 }}>
              <span style={{ color:T.accent,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:700 }}>
                {entry.modifiers?.length>0?entry.modifiers.map(m=>m.name).join(', '):'Без добавок'}
              </span>
              <div style={{ display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
                {isShawarma
                  ? <button onClick={()=>onDec(entry.cartKey)} style={{ border:'none',background:T.border,borderRadius:6,padding:'2px 7px',fontSize:11,cursor:'pointer',color:T.sub }}>✕</button>
                  : <QtyCtrl qty={entry.qty} onInc={()=>onInc(entry.cartKey)} onDec={()=>onDec(entry.cartKey)} sm />
                }
                <span style={{ fontWeight:800,color:T.accent,minWidth:40,textAlign:'right',fontSize:11 }}>
                  {fmt((Number(item.price)+entry.modifiers.reduce((s,m)=>s+m.price,0))*entry.qty)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Низ карточки: цена + кнопка */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6,gap:6 }}>
          {!unavail && <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:16,color:T.gold,flexShrink:0 }}>{fmt(item.price)}</span>}
          {unavail && <span style={{ fontSize:12,color:T.sub }}>Скоро в продаже</span>}
          {!unavail && (
            <button onClick={e=>{e.stopPropagation();onAdd(item)}} style={{ ...pill,padding:'7px 12px',fontSize:12,background:inCart?T.accentBg:T.accent,color:inCart?T.accent:'#fff',border:inCart?`1.5px solid #ffd4c2`:'none',flexShrink:0 }}>
              {inCart?'+ Ещё':isShawarma?'Добавки':'В корзину'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── UpsellScreen ─────────────────────────────────────────────────────────────
function UpsellScreen({ cart, items, onAddItem, onProceed }) {
  const byId=new Map(items.map(i=>[i.id,i]))
  const cartCats=new Set(cart.flatMap(e=>{const item=byId.get(e.id);return item?[item.category]:[]}))
  const sw0=cart.filter(e=>{const item=byId.get(e.id);return item?.category==='shawarma'&&(!e.modifiers||e.modifiers.length===0)})
  const coffeeKw=['эспрессо','американо','капучино','латте','раф','макиато']
  const sections=[]
  // Добавки не предлагаем отдельно — они выбираются при заказе шаурмы
  if(!cartCats.has('fries')){const f=items.filter(i=>i.category==='fries'&&Number(i.price)>0&&!i.coming_soon);if(f.length)sections.push({key:'fries',title:'Картошка?',emoji:'🍟',items:f.slice(0,4)})}
  if(cartCats.has('fries')&&!cartCats.has('sauces')){const s=items.filter(i=>i.category==='sauces'&&Number(i.price)>0&&!i.coming_soon);if(s.length)sections.push({key:'sauces',title:'Соус?',emoji:'🥫',items:s.slice(0,4)})}
  if(!cartCats.has('drinks')){const d=items.filter(i=>i.category==='drinks'&&Number(i.price)>0&&!i.coming_soon).sort((a,b)=>{const ac=coffeeKw.some(k=>a.name.toLowerCase().includes(k))?1:0,bc=coffeeKw.some(k=>b.name.toLowerCase().includes(k))?1:0;return ac-bc});if(d.length)sections.push({key:'drinks',title:'Выпить?',emoji:'☕',items:d})}
  const cartIds=new Set(cart.map(e=>e.id))
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:75,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div style={{ width:'100%',maxWidth:680,maxHeight:'90vh',overflow:'auto',...card,borderRadius:'24px 24px 0 0' }}>
        <div style={{ padding:'20px 20px 0',marginBottom:16 }}>
          <div style={{ display:'flex',justifyContent:'center',marginBottom:12 }}>
            <div style={{ width:40,height:4,borderRadius:2,background:T.border }} />
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:22,color:T.text }}>Что-то забыли? 🤔</div>
          <div style={{ color:T.sub,fontSize:14,marginTop:4 }}>Добавьте или переходите к оформлению</div>
        </div>
        {sections.map(s=>(
          <div key={s.key} style={{ marginBottom:20,padding:'0 16px' }}>
            <div style={{ fontWeight:800,fontSize:15,color:T.text,marginBottom:10 }}>{s.emoji} {s.title}</div>
            <div style={{ display:'grid',gap:8 }}>
              {s.items.map(item=>{
                const inc=cartIds.has(item.id)
                return (
                  <div key={item.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,background:inc?T.accentBg:T.surfaceAlt,border:`1.5px solid ${inc?'#ffd4c2':T.border}` }}>
                    <div><div style={{ fontWeight:700,fontSize:14,color:T.text }}>{item.name}</div><div style={{ color:T.accent,fontSize:13,fontWeight:700,marginTop:2 }}>{fmt(item.price)}</div></div>
                    {inc?<span style={{ fontSize:13,color:T.green,fontWeight:700 }}>✓ В корзине</span>:<Btn variant="solid" size="sm" onClick={()=>onAddItem(item)}>+ Добавить</Btn>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {sections.length===0&&<div style={{ textAlign:'center',padding:'20px 0',color:T.sub }}>Всё уже в корзине 🎉</div>}
        <div style={{ padding:'16px',borderTop:`1px solid ${T.border}` }}>
          <Btn variant="solid" size="lg" onClick={onProceed} style={{ width:'100%' }}>Оформить заказ →</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── CheckoutModal ────────────────────────────────────────────────────────────
function CheckoutModal({ cartItems, total, branch, previewNum, previewLoading, onClose, onSuccess, onInc, onDec, onRemove, onClear }) {
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [comment,setComment]=useState('')
  const [err,setErr]=useState('')
  const [busy,setBusy]=useState(false)
  const inpStyle={ width:'100%',boxSizing:'border-box',padding:'13px 16px',borderRadius:14,border:`1.5px solid ${T.border}`,background:T.surfaceAlt,color:T.text,fontFamily:"'Nunito',sans-serif",fontSize:15,outline:'none' }

  async function submit(){
    setErr('')
    if(!name.trim())return setErr('Введите имя')
    if(!phone.trim())return setErr('Введите телефон')
    setBusy(true)
    try {
      const res=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch_id:branch.id,customer_name:name,customer_phone:phone,comment,items:cartItems.map(i=>({id:i.id,qty:i.qty,modifiers:i.modifiers||[]}))})})
      const data=await res.json()
      if(!res.ok)return setErr(data?.error||'Ошибка')
      onSuccess(data.order)
    } catch{setErr('Ошибка соединения')}
    finally{setBusy(false)}
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:80,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:680,maxHeight:'92vh',overflow:'auto',...card,borderRadius:'24px 24px 0 0' }}>
        <div style={{ padding:'20px 20px 4px' }}>
          <div style={{ display:'flex',justifyContent:'center',marginBottom:12 }}>
            <div style={{ width:40,height:4,borderRadius:2,background:T.border }} />
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:22,color:T.text }}>
                Заказ {previewLoading?<span style={{ color:T.sub }}>…</span>:<span style={{ color:T.accent }}>{previewNum}</span>}
              </div>
              <div style={{ color:T.sub,fontSize:13,marginTop:2 }}>{branch.fullName}</div>
            </div>
            <button onClick={onClose} style={{ background:'transparent',border:0,color:T.sub,fontSize:28,cursor:'pointer',lineHeight:1 }}>×</button>
          </div>
          <div style={{ marginTop:12,padding:'12px 14px',borderRadius:14,background:T.accentBg,border:`1px solid #ffd4c2`,fontSize:13,color:T.accent,lineHeight:1.6 }}>
            📞 Позвоните <strong style={{ color:T.text }}>{branch.phone}</strong>{branch.address?<> · 📍 {branch.address}</>:null}
          </div>
        </div>

        <div style={{ padding:'12px 16px',display:'grid',gap:8,marginBottom:4 }}>
          {cartItems.map(item=>{
            const modsTotal=(item.modifiers||[]).reduce((s,m)=>s+m.price,0)
            const unitPrice=Number(item.price||0)+modsTotal
            return (
              <div key={item.cartKey} style={{ padding:'12px 14px',borderRadius:14,background:T.surfaceAlt,border:`1.5px solid ${T.border}` }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{item.name}</div>
                    {item.modifiers?.length>0&&(
                      <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginTop:4 }}>
                        {item.modifiers.map(m=><span key={m.id} style={{ fontSize:11,padding:'2px 8px',borderRadius:999,background:T.accentBg,color:T.accent,fontWeight:700 }}>+{m.name}</span>)}
                      </div>
                    )}
                    <div style={{ color:T.sub,fontSize:12,marginTop:4 }}>{fmt(unitPrice)} × {item.qty}</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                    <QtyCtrl qty={item.qty} onInc={()=>onInc(item.cartKey)} onDec={()=>onDec(item.cartKey)} sm />
                    <button onClick={()=>onRemove(item.cartKey)} style={{ border:'none',background:T.border,borderRadius:8,padding:'5px 9px',fontSize:12,cursor:'pointer',color:T.sub }}>✕</button>
                    <span style={{ fontWeight:800,minWidth:58,textAlign:'right',fontSize:14,color:T.gold }}>{fmt(unitPrice*item.qty)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding:'0 16px',display:'grid',gap:10,marginBottom:12 }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя *" style={inpStyle} />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Телефон *" type="tel" style={inpStyle} />
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий к заказу" rows={2} style={{ ...inpStyle,resize:'none' }} />
        </div>

        {err&&<div style={{ color:'#e53e3e',fontSize:14,marginBottom:10,padding:'0 16px',fontWeight:600 }}>{err}</div>}

        <div style={{ padding:'12px 16px 20px',borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
          <div>
            <div style={{ color:T.sub,fontSize:13 }}>Итого</div>
            <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:26,color:T.gold }}>{fmt(total)}</div>
          </div>
          <div style={{ display:'flex',gap:10,marginLeft:'auto' }}>
            <Btn variant="ghost" size="md" onClick={onClear}>Очистить</Btn>
            <Btn variant="solid" size="lg" onClick={submit} disabled={busy}>{busy?'Оформляем…':'Подтвердить →'}</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ClosedScreen ─────────────────────────────────────────────────────────────
function ClosedScreen({ branch, schedule }) {
  const openTime=schedule?.open||'10:00', closeTime=schedule?.close||'22:00', cutoffTime=schedule?.cutoff||'21:30'
  const now=new Date(), nowUB=new Date(now.getTime()+8*60*60*1000)
  const nowMin=nowUB.getUTCHours()*60+nowUB.getUTCMinutes()
  const [oh,om]=openTime.split(':').map(Number)
  const isNotOpenYet=nowMin<oh*60+om
  return (
    <div style={{ maxWidth:400,margin:'40px auto',padding:'0 4px',textAlign:'center' }}>
      <div style={{ fontSize:68,marginBottom:16 }}>{isNotOpenYet?'🌙':'🔒'}</div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:26,color:T.text,marginBottom:8 }}>{isNotOpenYet?'Ещё закрыто':'Уже закрыто'}</div>
      <div style={{ color:T.sub,fontSize:15,lineHeight:1.8,marginBottom:24 }}>
        {isNotOpenYet?<>Приём заказов с <strong style={{ color:T.accent }}>{openTime}</strong></>:<>Приём завершён в <strong style={{ color:T.accent }}>{cutoffTime}</strong><br/>Ждём завтра с <strong style={{ color:T.accent }}>{openTime}</strong></>}
      </div>
      <div style={{ ...card,padding:20,marginBottom:24,textAlign:'left',borderRadius:20 }}>
        <div style={{ fontWeight:800,fontSize:14,color:T.accent,marginBottom:12 }}>📍 {branch.fullName}</div>
        {[['Работаем',`${openTime} — ${closeTime}`],['Приём заказов',`до ${cutoffTime}`],branch.phone?['Телефон',branch.phone]:null,branch.address?['Адрес',branch.address]:null].filter(Boolean).map(([k,v])=>(
          <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:8 }}><span style={{ color:T.sub }}>{k}</span><span style={{ fontWeight:700,color:T.text }}>{v}</span></div>
        ))}
      </div>
      <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
        <a href="/order" style={{ ...pill,padding:'11px 20px',fontSize:14,background:T.surface,border:`1.5px solid ${T.border}`,color:T.sub,textDecoration:'none',display:'inline-block' }}>Мой заказ</a>
        <a href="/admin" style={{ ...pill,padding:'11px 20px',fontSize:14,background:T.surface,border:`1.5px solid ${T.border}`,color:T.sub,textDecoration:'none',display:'inline-block' }}>Для администратора</a>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [branchId,setBranchId]=useState(BRANCHES[0].id)
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [loadErr,setLoadErr]=useState('')
  const [cart,setCart]=useState([])
  const [schedule,setSchedule]=useState(null)
  const [activeCat,setActiveCat]=useState('shawarma')
  const [modifierTarget,setModifierTarget]=useState(null)
  const [itemModal,setItemModal]=useState(null)
  const [upsellOpen,setUpsellOpen]=useState(false)
  const [checkoutOpen,setCheckoutOpen]=useState(false)
  const [successOrder,setSuccessOrder]=useState(null)
  const [previewNum,setPreviewNum]=useState('????')
  const [previewLoading,setPreviewLoading]=useState(false)
  const catBarRef=useRef(null)
  const sectionRefs=useRef({})

  const branch=BRANCHES.find(b=>b.id===branchId)||BRANCHES[0]
  const addons=useMemo(()=>items.filter(i=>i.category==='shawarma_addons'),[items])

  const isOpenNow=useMemo(()=>{
    if(!schedule)return true
    const now=new Date(),nowUB=new Date(now.getTime()+8*60*60*1000)
    const nowMin=nowUB.getUTCHours()*60+nowUB.getUTCMinutes()
    const [oh,om]=(schedule.open||'00:00').split(':').map(Number)
    const [ch,cm]=(schedule.cutoff||'23:59').split(':').map(Number)
    return nowMin>=oh*60+om&&nowMin<ch*60+cm
  },[schedule])

  useEffect(()=>{
    try{const p=JSON.parse(localStorage.getItem(CART_KEY)||'{}');if(Array.isArray(p?.items))setCart(p.items);if(p?.branchId&&BRANCHES.some(b=>b.id===p.branchId))setBranchId(p.branchId)}catch{}
  },[])
  useEffect(()=>{ try{localStorage.setItem(CART_KEY,JSON.stringify({branchId,items:cart}))}catch{} },[branchId,cart])

  useEffect(()=>{
    let active=true; setLoading(true); setLoadErr('')
    async function load(){
      const sb=getSB()
      if(!sb){if(active){setItems([]);setLoadErr('Supabase не настроен');setLoading(false)}return}
      const [{data:menu,error:menuErr},{data:stop},{data:branchRow}]=await Promise.all([
        sb.from('menu_items').select('*').order('name'),
        sb.from('stop_list').select('menu_item_id').eq('branch_id',branch.stopId).eq('is_stopped',true),
        sb.from('branches').select('open,close,cutoff').eq('name',branch.fullName).maybeSingle(),
      ])
      if(!active)return
      if(menuErr){setItems([]);setLoadErr('Не удалось загрузить меню');setLoading(false);return}
      if(branchRow)setSchedule(branchRow)
      const stoppedIds=new Set((stop||[]).map(r=>r.menu_item_id))
      const filtered=(menu||[]).filter(i=>!stoppedIds.has(i.id)).filter(i=>!Array.isArray(i.branch_ids)||i.branch_ids.length===0||i.branch_ids.includes(branchId)).map(i=>({...i,category:normCat(i.category)}))
      const seen=new Set()
      const deduped=filtered.filter(i=>seen.has(i.id)?false:seen.add(i.id))
      const avail=new Set(deduped.map(i=>i.id))
      setCart(prev=>prev.filter(e=>avail.has(e.id)))
      setItems(deduped);setLoading(false)
    }
    load();return()=>{active=false}
  },[branchId])

  useEffect(()=>{
    if(!checkoutOpen)return
    let active=true;setPreviewLoading(true)
    async function load(){
      const sb=getSB();if(!sb){if(active){setPreviewNum('????');setPreviewLoading(false)}return}
      try{const{data}=await sb.from('order_counters').select('last_number').eq('branch_id',branchId).maybeSingle();if(active)setPreviewNum(pad4((Number(data?.last_number)||0)+1))}
      catch{if(active)setPreviewNum('????')}
      finally{if(active)setPreviewLoading(false)}
    }
    load();return()=>{active=false}
  },[checkoutOpen,branchId])

  const grouped=useMemo(()=>{
    const g={};for(const c of CATEGORY_ORDER)g[c]=[]
    for(const i of items){const c=i.category;if(!g[c])g[c]=[];g[c].push(i)}
    return g
  },[items])

  const availCats=useMemo(()=>CATEGORY_ORDER.filter(c=>(grouped[c]||[]).length>0),[grouped])

  const cartDetails=useMemo(()=>{
    const byId=new Map(items.map(i=>[i.id,i]))
    let count=0,total=0
    const list=cart.flatMap(e=>{
      const item=byId.get(e.id);if(!item||e.qty<=0)return[]
      const modsTotal=(e.modifiers||[]).reduce((s,m)=>s+m.price,0)
      const unitPrice=Number(item.price||0)+modsTotal
      count+=e.qty;total+=unitPrice*e.qty
      return[{...item,cartKey:e.cartKey,qty:e.qty,modifiers:e.modifiers||[],lineTotal:unitPrice*e.qty}]
    })
    return{list,count,total}
  },[cart,items])

  function getEntries(itemId){
    const byId=new Map(items.map(i=>[i.id,i]))
    return cart.filter(e=>e.id===itemId).map(e=>{const item=byId.get(e.id);return{...e,price:Number(item?.price||0)+(e.modifiers||[]).reduce((s,m)=>s+m.price,0)}})
  }

  function handleAdd(item){ if(item.category==='shawarma')setModifierTarget(item); else addToCart(item,[]) }
  function addToCart(item,modifiers){ const ck=makeCartKey(item.id,modifiers);setCart(prev=>{const ex=prev.find(e=>e.cartKey===ck);if(ex)return prev.map(e=>e.cartKey===ck?{...e,qty:e.qty+1}:e);return[...prev,{cartKey:ck,id:item.id,qty:1,modifiers}]}) }
  function incQty(ck){setCart(prev=>prev.map(e=>e.cartKey===ck?{...e,qty:e.qty+1}:e))}
  function decQty(ck){setCart(prev=>prev.map(e=>e.cartKey===ck?{...e,qty:e.qty-1}:e).filter(e=>e.qty>0))}
  function removeEntry(ck){setCart(prev=>prev.filter(e=>e.cartKey!==ck))}
  function clearCart(){setCart([])}
  function handleSuccess(order){setCart([]);setCheckoutOpen(false);setUpsellOpen(false);setSuccessOrder(order)}

  function scrollToCategory(cat){
    setActiveCat(cat)
    const el=sectionRefs.current[cat]
    if(el){const offset=el.getBoundingClientRect().top+window.scrollY-140;window.scrollTo({top:offset,behavior:'smooth'})}
  }

  // Scroll spy
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){const cat=entry.target.dataset.cat;if(cat)setActiveCat(cat)}})
    },{threshold:0.3,rootMargin:'-100px 0px -60% 0px'})
    Object.values(sectionRefs.current).forEach(el=>{if(el)observer.observe(el)})
    return()=>observer.disconnect()
  },[availCats.join(',')])

  // Успех
  if(successOrder){
    const num=successOrder.short_number||successOrder.order_number||successOrder.id
    async function subscribePush(){
      try{const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;const ex=await reg.pushManager.getSubscription();const sub=ex||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY});await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),order_id:successOrder.id})})}catch(e){console.log(e)}
    }
    // Сохраняем номер заказа и телефон для быстрого поиска
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('nv_last_order', JSON.stringify({ number: num, phone: successOrder.customer_phone || '' })) } catch {}
    }

    return (
      <main style={{ maxWidth:480,margin:'0 auto',padding:'60px 16px',textAlign:'center',background:T.bg,minHeight:'100vh' }}>
        <div style={{ fontSize:72,marginBottom:16 }}>✅</div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:28,color:T.text,marginBottom:8 }}>Заказ оформлен!</div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:60,color:T.accent,margin:'16px 0' }}>{num}</div>
        <div style={{ color:T.sub,fontSize:15,lineHeight:1.8,marginBottom:24 }}>
          Позвоните <strong style={{ color:T.text }}>{branch.phone}</strong>{branch.address?<><br/>📍 {branch.address}</>:null}<br/>и назовите номер <strong style={{ color:T.accent }}>{num}</strong>
        </div>
        {typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&(
          <div style={{ marginBottom:20,padding:'16px',borderRadius:18,background:T.accentBg,border:`1.5px solid #ffd4c2` }}>
            <div style={{ fontSize:14,color:T.accent,marginBottom:10,fontWeight:700 }}>🔔 Получите уведомление когда заказ будет готов</div>
            <Btn variant="solid" size="md" onClick={subscribePush}>Разрешить уведомления</Btn>
          </div>
        )}
        <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
          <a href={`/order?number=${encodeURIComponent(num)}`} style={{ ...pill,padding:'13px 24px',fontSize:15,background:T.accent,color:'#fff',textDecoration:'none',display:'inline-block',boxShadow:`0 4px 16px rgba(255,107,53,0.35)` }}>Отследить заказ</a>
          <button onClick={()=>setSuccessOrder(null)} style={{ ...pill,padding:'13px 24px',fontSize:15,background:T.surface,border:`2px solid ${T.accent}`,color:T.accent }}>Новый заказ</button>
        </div>
      </main>
    )
  }

  return (
    <div style={{ background:T.bg,minHeight:'100vh' }}>

      {/* ── Hero Header ── */}
      <header style={{ background:T.hero,position:'relative',overflow:'hidden' }}>
        {/* Фоновый паттерн */}
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 70% 50%, rgba(255,107,53,0.15) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(244,160,29,0.08) 0%, transparent 50%)',pointerEvents:'none' }} />

        {/* Топ навигация */}
        <div style={{ position:'relative',display:'flex',justifyContent:'flex-end',gap:20,padding:'12px 20px 0' }}>
          {[['📍 Найти нас','/where'],['Мой заказ','/order'],['Для администратора','/admin']].map(([label,href])=>(
            <a key={href} href={href} style={{ color:'rgba(255,255,255,0.5)',fontSize:12,textDecoration:'none',fontWeight:600,transition:'color 0.15s' }}>{label}</a>
          ))}
        </div>

        {/* Логотип */}
        <div style={{ position:'relative',display:'flex',justifyContent:'center',padding:'16px 20px 8px' }}>
          <img src="/logo.png" alt="На Виражах" style={{ height:170,width:'auto',maxWidth:'85%',objectFit:'contain',filter:'drop-shadow(0 6px 24px rgba(255,107,53,0.4)) brightness(1.05)' }} />
        </div>

        {/* Выбор точки */}
        <div style={{ position:'relative',padding:'0 16px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
          <div style={{ display:'flex',gap:8 }}>
            {BRANCHES.map(b=>(
              <button key={b.id} onClick={()=>{setBranchId(b.id);setCart([])}} style={{
                border:`2px solid ${branchId===b.id?T.accent:'rgba(255,255,255,0.15)'}`,
                background:branchId===b.id?T.accent:'rgba(255,255,255,0.07)',
                color:branchId===b.id?'#fff':'rgba(255,255,255,0.7)',
                borderRadius:999,padding:'10px 24px',
                fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,cursor:'pointer',
                transition:'all 0.15s',backdropFilter:'blur(8px)',
              }}>{b.name}</button>
            ))}
          </div>
          {branch.phone&&(
            <div style={{ display:'flex',gap:16,fontSize:13,color:'rgba(255,255,255,0.4)',flexWrap:'wrap',justifyContent:'center' }}>
              <a href={`tel:${branch.phone.replace(/\s/g,'')}`} style={{ color:'rgba(255,255,255,0.4)',textDecoration:'none',fontWeight:600 }}>📞 {branch.phone}</a>
              {branch.address&&<span>📍 {branch.address}</span>}
            </div>
          )}
        </div>
      </header>

      {/* ── Sticky Category Bar ── */}
      {!loading&&!loadErr&&isOpenNow&&availCats.length>0&&(
        <div style={{ position:'sticky',top:0,zIndex:40,background:'rgba(245,240,235,0.95)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${T.border}`,boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <div ref={catBarRef} style={{ display:'flex',gap:4,overflowX:'auto',padding:'10px 12px',scrollbarWidth:'none',msOverflowStyle:'none' }}>
            {availCats.map(cat=>{
              const isActive=activeCat===cat
              const catCount=cart.filter(e=>items.find(i=>i.id===e.id)?.category===cat).reduce((s,e)=>s+e.qty,0)
              return (
                <button key={cat} onClick={()=>scrollToCategory(cat)} style={{
                  flexShrink:0,display:'flex',alignItems:'center',gap:6,
                  padding:'7px 14px',borderRadius:999,cursor:'pointer',
                  border:`2px solid ${isActive?T.accent:T.border}`,
                  background:isActive?T.accent:T.surface,
                  color:isActive?'#fff':T.text,
                  fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,
                  transition:'all 0.15s',whiteSpace:'nowrap',
                }}>
                  <span>{CATEGORY_EMOJI[cat]}</span>
                  <span>{CATEGORY_LABELS[cat]||cat}</span>
                  {catCount>0&&<span style={{ background:isActive?'rgba(255,255,255,0.3)':T.accent,color:'#fff',borderRadius:999,padding:'0 6px',fontSize:11,fontWeight:900 }}>{catCount}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Контент ── */}
      <main style={{ maxWidth:900,margin:'0 auto',padding:'16px 12px 120px' }}>

        {schedule&&!isOpenNow&&!loading&&<ClosedScreen branch={branch} schedule={schedule} />}
        {loading&&<div style={{ color:T.sub,padding:'40px',textAlign:'center',fontSize:16 }}>Загружаем меню…</div>}
        {!loading&&loadErr&&<div style={{ color:'#e53e3e',padding:'20px' }}>{loadErr}</div>}

        {!loading&&!loadErr&&(!schedule||isOpenNow)&&availCats.map(cat=>{
          const catItems=grouped[cat]||[]
          if(!catItems.length)return null
          const isShawarma=cat==='shawarma'
          return (
            <section key={cat} data-cat={cat} ref={el=>{sectionRefs.current[cat]=el}} style={{ marginBottom:28 }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
                <span style={{ fontSize:24 }}>{CATEGORY_EMOJI[cat]}</span>
                <h2 style={{ margin:0,fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:22,color:T.text }}>{CATEGORY_LABELS[cat]||cat}</h2>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:12 }}>
                {catItems.map(item=>(
                  <ProductCard key={item.id} item={item} cartEntries={getEntries(item.id)}
                    onAdd={handleAdd} onInc={incQty} onDec={decQty}
                    isShawarma={isShawarma} onCardClick={setItemModal} />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      {/* ── Корзина ── */}
      {cartDetails.count>0&&(
        <div style={{ position:'fixed',left:12,right:12,bottom:12,background:T.hero,borderRadius:20,padding:'12px 16px',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',zIndex:50,display:'flex',alignItems:'center',gap:12,backdropFilter:'blur(12px)' }}>
          <div style={{ width:44,height:44,borderRadius:14,background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,boxShadow:`0 4px 12px rgba(255,107,53,0.4)` }}>🛒</div>
          <div>
            <div style={{ fontWeight:800,fontSize:15,color:'#fff' }}>
              {cartDetails.count} {cartDetails.count===1?'позиция':cartDetails.count<5?'позиции':'позиций'}
            </div>
            <div style={{ color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:1 }}>{fmt(cartDetails.total)}</div>
          </div>
          <Btn variant="solid" size="lg" onClick={()=>setUpsellOpen(true)} style={{ marginLeft:'auto' }}>Оформить →</Btn>
        </div>
      )}

      {/* ── Модалки ── */}
      {itemModal&&<ItemModal item={itemModal} qty={cartDetails.list.find(e=>e.id===itemModal.id)?.qty||0} onAdd={handleAdd} onInc={incQty} onDec={decQty} isShawarma={itemModal.category==='shawarma'} onClose={()=>setItemModal(null)} />}
      {modifierTarget&&<ModifierModal item={modifierTarget} allAddons={addons} onConfirm={mods=>{addToCart(modifierTarget,mods);setModifierTarget(null)}} onSkip={()=>{addToCart(modifierTarget,[]);setModifierTarget(null)}} />}
      {upsellOpen&&!checkoutOpen&&<UpsellScreen cart={cart} items={items} onAddItem={item=>{const ck=makeCartKey(item.id,[]);setCart(prev=>{const ex=prev.find(e=>e.cartKey===ck);if(ex)return prev.map(e=>e.cartKey===ck?{...e,qty:e.qty+1}:e);return[...prev,{cartKey:ck,id:item.id,qty:1,modifiers:[]}]})}} onProceed={()=>{setUpsellOpen(false);setCheckoutOpen(true)}} />}
      {checkoutOpen&&<CheckoutModal cartItems={cartDetails.list} total={cartDetails.total} branch={branch} previewNum={previewNum} previewLoading={previewLoading} onClose={()=>setCheckoutOpen(false)} onSuccess={handleSuccess} onInc={incQty} onDec={decQty} onRemove={removeEntry} onClear={clearCart} />}
    </div>
  )
}
