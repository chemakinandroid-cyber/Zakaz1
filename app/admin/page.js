'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const BRANCHES = [
  { id:'nv-fr-002', name:'Аэропорт', fullName:'На Виражах — Аэропорт', stopId:'airport' },
  { id:'nv-sh-001', name:'Конечная', fullName:'На Виражах — Конечная', stopId:'konechnaya' },
]
const BRANCH_STOP_ID = { 'nv-fr-002':'airport', 'nv-sh-001':'konechnaya' }
const CATEGORY_ORDER = ['shawarma','shawarma_addons','burgers','hotdogs','shashlik','quesadilla','fries','sauces','drinks']
const CATEGORY_LABELS = { shawarma:'Шаурма', shawarma_addons:'Добавки к шаурме', burgers:'Бургеры', hotdogs:'Хот-доги', shashlik:'Шашлык', quesadilla:'Кесадилья', fries:'Фритюр', sauces:'Соусы', drinks:'Напитки' }
const ACTIVE_ST = ['new','confirmed','preparing','ready']
const DONE_ST   = ['completed','cancelled','expired']
const LABELS    = { new:'Новый', confirmed:'Подтверждён', preparing:'Готовится', ready:'Готов', completed:'Выдан', cancelled:'Отменён', expired:'Истёк' }
const NEXT_ACTIONS = {
  new:       [{ v:'confirmed', label:'✅ Подтвердить', clr:'#22c55e' }, { v:'cancelled', label:'✕ Отменить', clr:'#ef4444' }],
  confirmed: [{ v:'preparing', label:'🍳 В работу',   clr:'#f59e0b' }, { v:'cancelled', label:'✕ Отменить', clr:'#ef4444' }],
  preparing: [{ v:'ready',     label:'🔔 Готов',       clr:'#22c55e' }],
  ready:     [{ v:'completed', label:'✔ Выдан',       clr:'#6366f1' }],
}
const STATUS_CLR = { new:'#60a5fa', confirmed:'#a78bfa', preparing:'#fbbf24', ready:'#34d399', completed:'#6b7280', cancelled:'#f87171', expired:'#6b7280' }

// Design tokens
const D = {
  bg: '#0f1117',
  surface: '#1a1d27',
  surface2: '#22263a',
  border: '#2a2f45',
  accent: '#ff6b35',
  gold: '#f59e0b',
  text: '#f1f5f9',
  sub: '#64748b',
  green: '#22c55e',
  red: '#ef4444',
}

function fmt(v){ return `${Number(v||0)} ₽` }
function elapsed(ts){
  if(!ts)return ''
  const m=Math.floor((Date.now()-new Date(ts))/60000)
  if(m<1)return 'только что'
  if(m<60)return `${m} мин`
  return `${Math.floor(m/60)}ч ${m%60}м`
}
function fmtTime(v){
  if(!v)return ''
  const d=new Date(v)
  return isNaN(d)?'':d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})
}
function normCat(c){ const r=String(c||'').trim().toLowerCase(); return r==='fryer'?'fries':r||'other' }

// ─── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email,setEmail]=useState('')
  const [pass,setPass]=useState('')
  const [err,setErr]=useState('')
  const [busy,setBusy]=useState(false)

  async function submit(e){
    e.preventDefault();setErr('');setBusy(true)
    try{const{data,error}=await supabase.auth.signInWithPassword({email,password:pass});if(error)return setErr(error.message);onLogin(data.session)}
    catch{setErr('Ошибка входа')}finally{setBusy(false)}
  }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:D.bg,padding:16 }}>
      <div style={{ width:'100%',maxWidth:380 }}>
        {/* Логотип */}
        <div style={{ textAlign:'center',marginBottom:32 }}>
          <img src="/logo.png" alt="На Виражах" style={{ height:80,objectFit:'contain',filter:'brightness(1.1)' }} />
        </div>
        <div style={{ background:D.surface,border:`1px solid ${D.border}`,borderRadius:20,padding:28 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:20,color:D.text,marginBottom:4 }}>Панель администратора</div>
          <div style={{ color:D.sub,fontSize:14,marginBottom:24 }}>Введите данные для входа</div>
          <form onSubmit={submit} style={{ display:'grid',gap:12 }}>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email"
              style={{ padding:'13px 16px',borderRadius:12,border:`1px solid ${D.border}`,background:D.surface2,color:D.text,fontFamily:"'Nunito',sans-serif",fontSize:15,outline:'none',width:'100%',boxSizing:'border-box' }} required />
            <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="Пароль"
              style={{ padding:'13px 16px',borderRadius:12,border:`1px solid ${D.border}`,background:D.surface2,color:D.text,fontFamily:"'Nunito',sans-serif",fontSize:15,outline:'none',width:'100%',boxSizing:'border-box' }} required />
            {err&&<div style={{ color:D.red,fontSize:13,fontWeight:600 }}>{err}</div>}
            <button type="submit" disabled={busy} style={{ border:0,borderRadius:12,background:D.accent,color:'#fff',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,padding:14,cursor:busy?'default':'pointer',opacity:busy?0.7:1,boxShadow:`0 4px 16px rgba(255,107,53,0.35)` }}>
              {busy?'Входим…':'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── OrderCard ─────────────────────────────────────────────────────────────────
function OrderCard({ order, items, branchLabel }) {
  const [updating,setUpdating]=useState(false)
  const [el,setEl]=useState(elapsed(order.created_at))
  const actions=NEXT_ACTIONS[order.status]||[]
  const stClr=STATUS_CLR[order.status]||D.sub
  const isNew=order.status==='new'
  const isReady=order.status==='ready'

  useEffect(()=>{
    const id=setInterval(()=>setEl(elapsed(order.created_at)),30000)
    return()=>clearInterval(id)
  },[order.created_at])

  async function changeStatus(v){
    setUpdating(true)
    try{
      await fetch('/api/admin/orders',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:order.id,status:v})})
      if(['confirmed','ready','completed'].includes(v)){
        fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:order.id,status:v})}).catch(()=>{})
      }
      // При переводе в работу — предлагаем распечатать
      if(v==='preparing') printOrder()
    }finally{setUpdating(false)}
  }

  function printOrder(){
    const num = order.short_number||order.order_number||order.id.slice(0,8)
    const branchName = BRANCHES.find(b=>b.id===order.branch_id)?.name||''
    const time = new Date(order.created_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})
    const date = new Date(order.created_at).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})

    // Таблица транслитерации UTF-8 → CP866 для кириллицы
    const cp866map = {
      'А':128,'Б':129,'В':130,'Г':131,'Д':132,'Е':133,'Ж':134,'З':135,
      'И':136,'Й':137,'К':138,'Л':139,'М':140,'Н':141,'О':142,'П':143,
      'Р':144,'С':145,'Т':146,'У':147,'Ф':148,'Х':149,'Ц':150,'Ч':151,
      'Ш':152,'Щ':153,'Ъ':154,'Ы':155,'Ь':156,'Э':157,'Ю':158,'Я':159,
      'а':160,'б':161,'в':162,'г':163,'д':164,'е':165,'ж':166,'з':167,
      'и':168,'й':169,'к':170,'л':171,'м':172,'н':173,'о':174,'п':175,
      'р':224,'с':225,'т':226,'у':227,'ф':228,'х':229,'ц':230,'ч':231,
      'ш':232,'щ':233,'ъ':234,'ы':235,'ь':236,'э':237,'ю':238,'я':239,
      'Ё':240,'ё':241,'р':224,
    }

    function toCP866Bytes(str) {
      const bytes = []
      for (const ch of str) {
        if (cp866map[ch] !== undefined) bytes.push(cp866map[ch])
        else if (ch.charCodeAt(0) < 128) bytes.push(ch.charCodeAt(0))
        else bytes.push(63) // '?' для неизвестных
      }
      return bytes
    }

    function line(text) {
      return [...toCP866Bytes(text), 10] // 10 = LF
    }

    function sep() {
      return line('------------------------')
    }

    function center(text, width=24) {
      const pad = Math.max(0, Math.floor((width - text.length) / 2))
      return line(' '.repeat(pad) + text)
    }

    function row(left, right, width=24) {
      const spaces = Math.max(1, width - left.length - right.length)
      return line(left + ' '.repeat(spaces) + right)
    }

    // ESC/POS команды
    const ESC = 27, GS = 29

    let bytes = []

    // Инициализация + кодировка CP866
    bytes.push(...[ESC, 64])           // ESC @ — сброс
    bytes.push(...[ESC, 116, 17])      // ESC t 17 — CP866

    // Заголовок по центру
    bytes.push(...[ESC, 97, 1])        // ESC a 1 — выравнивание по центру
    bytes.push(...[ESC, 33, 16])       // ESC ! — двойная высота
    bytes.push(...toCP866Bytes('НА ВИРАЖАХ'), 10)
    bytes.push(...[ESC, 33, 0])        // обычный шрифт
    bytes.push(...toCP866Bytes(branchName), 10)

    bytes.push(...sep())

    // Номер заказа — крупно
    bytes.push(...[GS, 33, 17])        // GS ! — двойной размер
    bytes.push(...center('ЗАКАЗ'))
    bytes.push(...[GS, 33, 34])        // ещё крупнее для номера
    bytes.push(...center(num))
    bytes.push(...[GS, 33, 0])         // обычный
    bytes.push(...center(date + '  ' + time))

    bytes.push(...sep())

    // Клиент
    bytes.push(...[ESC, 97, 0])        // выравнивание влево
    if (order.customer_name) bytes.push(...line('Клиент: ' + order.customer_name))
    if (order.comment) bytes.push(...line('Комм: ' + order.comment))
    if (order.customer_name || order.comment) bytes.push(...sep())

    // Позиции
    for (const i of (items||[])) {
      let mods = []
      try { mods = i.modifiers?(typeof i.modifiers==='string'?JSON.parse(i.modifiers):i.modifiers):[] } catch {}
      const nameStr = i.item_name + ' x' + i.quantity
      const priceStr = i.line_total + 'p'
      bytes.push(...row(nameStr, priceStr))
      if (mods.length) bytes.push(...line(' +' + mods.map(m=>m.name).join(',')))
    }

    bytes.push(...sep())

    // Итого — крупно
    bytes.push(...[ESC, 97, 1])        // центр
    bytes.push(...[ESC, 33, 16])       // двойная высота
    bytes.push(...toCP866Bytes('ИТОГО: ' + order.total + ' p.'), 10)
    bytes.push(...[ESC, 33, 0])

    bytes.push(...sep())
    bytes.push(...center('Спасибо за заказ!'))
    bytes.push(...[10, 10, 10])        // 3 пустые строки для отрыва

    // Отрезка (если поддерживается)
    bytes.push(...[GS, 86, 66, 0])

    // Конвертируем в base64
    const uint8 = new Uint8Array(bytes)
    let binary = ''
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
    const base64 = btoa(binary)

    // Отправляем в RawBT
    const intentUrl = 'rawbt:base64,' + base64
    window.location.href = intentUrl
  }

  // Таймер
  const mins=Math.floor((Date.now()-new Date(order.created_at))/60000)
  const pct=Math.min(100,(mins/30)*100)
  const timerClr=mins<10?D.green:mins<20?D.gold:D.red

  return (
    <div style={{
      background: isNew ? `linear-gradient(135deg,${D.surface} 0%,#1e2035 100%)` : D.surface,
      border: `1px solid ${isNew?'rgba(255,107,53,0.4)':isReady?'rgba(34,197,94,0.3)':D.border}`,
      borderRadius:16,padding:16,
      boxShadow: isNew?`0 0 24px rgba(255,107,53,0.08)`:isReady?`0 0 20px rgba(34,197,94,0.06)`:'none',
      position:'relative',overflow:'hidden',
    }}>
      {/* Цветная полоска сверху */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:stClr,borderRadius:'16px 16px 0 0' }} />

      {/* Шапка карточки */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,marginTop:4 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex',alignItems:'baseline',gap:12 }}>
            <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:32,color:D.accent,lineHeight:1 }}>
              {order.short_number||order.order_number||order.id.slice(0,8)}
            </span>
            {branchLabel && <span style={{ fontSize:12,color:D.sub,fontWeight:600 }}>📍 {branchLabel}</span>}
          </div>
          {/* Прогресс-таймер */}
          {!DONE_ST.includes(order.status)&&(
            <div style={{ marginTop:6,height:4,borderRadius:2,background:'rgba(255,255,255,0.06)',overflow:'hidden',width:'100%',maxWidth:200 }}>
              <div style={{ height:'100%',width:`${pct}%`,background:timerClr,borderRadius:2,transition:'width 30s linear' }} />
            </div>
          )}
          <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:5,fontSize:12,color:D.sub }}>
            {!DONE_ST.includes(order.status)&&<span style={{ color:timerClr,fontWeight:700 }}>⏱ {el}</span>}
            <span>{fmtTime(order.created_at)}</span>
          </div>
        </div>
        <div style={{ padding:'5px 12px',borderRadius:999,background:`${stClr}18`,border:`1px solid ${stClr}40`,color:stClr,fontSize:12,fontWeight:800,flexShrink:0 }}>
          {LABELS[order.status]||order.status}
        </div>
      </div>

      {/* Клиент */}
      {(order.customer_name||order.customer_phone)&&(
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',borderRadius:10,background:D.surface2 }}>
          <span style={{ fontSize:16 }}>👤</span>
          <div>
            {order.customer_name&&<div style={{ fontWeight:700,fontSize:14,color:D.text }}>{order.customer_name}</div>}
            {order.customer_phone&&<div style={{ fontSize:12,color:D.sub,marginTop:1 }}>{order.customer_phone}</div>}
          </div>
        </div>
      )}

      {/* Комментарий */}
      {order.comment&&(
        <div style={{ marginBottom:8,padding:'8px 12px',borderRadius:10,background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',fontSize:13,color:'#fbbf24' }}>
          💬 {order.comment}
        </div>
      )}

      {/* Состав */}
      {items?.length>0&&(
        <div style={{ marginBottom:12,padding:'10px 12px',borderRadius:12,background:D.surface2,display:'grid',gap:6 }}>
          {items.map(i=>{
            let mods=[]
            try{mods=i.modifiers?(typeof i.modifiers==='string'?JSON.parse(i.modifiers):i.modifiers):[]}catch{}
            return(
              <div key={i.id}>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:14,color:D.text }}>
                  <span style={{ fontWeight:700 }}>{i.item_name} <span style={{ color:D.sub,fontWeight:400 }}>× {i.quantity}</span></span>
                  <span style={{ color:D.gold,fontWeight:700 }}>{fmt(i.line_total)}</span>
                </div>
                {mods.length>0&&(
                  <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginTop:4 }}>
                    {mods.map(m=>(
                      <span key={m.id} style={{ fontSize:11,padding:'2px 8px',borderRadius:999,background:'rgba(34,197,94,0.1)',color:'#86efac',border:'1px solid rgba(34,197,94,0.2)',fontWeight:600 }}>+{m.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Футер */}
      {/* Итого + кнопки действий */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8 }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:20,color:D.text }}>{fmt(order.total)}</div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end' }}>
          {actions.map(a=>(
            <button key={a.v} disabled={updating} onClick={()=>changeStatus(a.v)} style={{
              border:0,borderRadius:10,padding:'9px 16px',fontSize:13,
              background:a.clr,color:'#fff',
              fontFamily:"'Nunito',sans-serif",fontWeight:800,cursor:updating?'default':'pointer',
              opacity:updating?0.6:1,boxShadow:`0 3px 10px ${a.clr}40`,
            }}>{a.label}</button>
          ))}
        </div>
      </div>
      {/* Кнопка печати — отдельная строка, всегда видна */}
      {!DONE_ST.includes(order.status) && (
        <button onClick={printOrder} style={{
          width:'100%',border:`1px solid ${D.border}`,borderRadius:10,
          padding:'8px',fontSize:14,background:D.surface2,color:D.sub,
          cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontWeight:700,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>🖨️ Распечатать заказ для кухни</button>
      )}
    </div>
  )
}

// ─── StopListTab ───────────────────────────────────────────────────────────────
function StopListTab({ defaultBranch }) {
  const [stopBranch,setStopBranch]=useState(defaultBranch||BRANCHES[0].id)
  const [menuItems,setMenuItems]=useState([])
  const [stopSet,setStopSet]=useState(new Set())
  const [loading,setLoading]=useState(true)
  const [toggling,setToggling]=useState(new Set())

  async function loadData(branchId){
    if(!supabase)return
    setLoading(true)
    const stopId=BRANCH_STOP_ID[branchId]||branchId
    const[{data:menu},{data:stop}]=await Promise.all([
      supabase.from('menu_items').select('id,name,category,variant,price,image_url').order('name'),
      supabase.from('stop_list').select('menu_item_id').eq('branch_id',stopId).eq('is_stopped',true),
    ])
    setMenuItems(menu||[])
    setStopSet(new Set((stop||[]).map(r=>r.menu_item_id)))
    setLoading(false)
  }
  useEffect(()=>{loadData(stopBranch)},[stopBranch])

  async function toggle(itemId){
    if(toggling.has(itemId))return
    setToggling(prev=>new Set([...prev,itemId]))
    const isStopped=stopSet.has(itemId)
    try{
      const stopId=BRANCH_STOP_ID[stopBranch]||stopBranch
      const res=await fetch('/api/admin/stoplist',{method:isStopped?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch_id:stopId,menu_item_id:itemId})})
      const data=await res.json()
      if(!res.ok)throw new Error(data?.error||'Ошибка')
      if(isStopped)setStopSet(prev=>{const n=new Set(prev);n.delete(itemId);return n})
      else setStopSet(prev=>new Set([...prev,itemId]))
    }catch(e){console.error(e)}
    finally{setToggling(prev=>{const n=new Set(prev);n.delete(itemId);return n})}
  }

  const grouped=useMemo(()=>{
    const g={};for(const c of CATEGORY_ORDER)g[c]=[]
    for(const item of menuItems){const c=normCat(item.category);if(!g[c])g[c]=[];g[c].push(item)}
    return g
  },[menuItems])

  return (
    <div>
      {/* Выбор точки */}
      {!defaultBranch&&(
        <div style={{ display:'flex',gap:8,marginBottom:20 }}>
          {BRANCHES.map(b=>(
            <button key={b.id} onClick={()=>setStopBranch(b.id)} style={{
              border:`2px solid ${stopBranch===b.id?D.accent:D.border}`,
              background:stopBranch===b.id?'rgba(255,107,53,0.12)':D.surface2,
              color:stopBranch===b.id?D.accent:D.sub,
              borderRadius:999,padding:'9px 18px',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:'pointer',
            }}>{b.name}</button>
          ))}
        </div>
      )}

      {stopSet.size>0&&(
        <div style={{ marginBottom:16,padding:'8px 14px',borderRadius:10,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',fontSize:13,fontWeight:700 }}>
          🚫 Остановлено позиций: {stopSet.size}
        </div>
      )}

      {loading?<div style={{ color:D.sub,padding:20 }}>Загрузка…</div>:
        CATEGORY_ORDER.map(cat=>{
          const catItems=grouped[cat]||[]
          if(!catItems.length)return null
          return(
            <div key={cat} style={{ marginBottom:20 }}>
              <div style={{ fontWeight:800,fontSize:14,color:D.sub,marginBottom:8,textTransform:'uppercase',letterSpacing:1 }}>{CATEGORY_LABELS[cat]||cat}</div>
              <div style={{ display:'grid',gap:6 }}>
                {catItems.map(item=>{
                  const isStopped=stopSet.has(item.id)
                  const isToggling=toggling.has(item.id)
                  return(
                    <div key={item.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderRadius:12,background:isStopped?'rgba(239,68,68,0.08)':D.surface,border:`1px solid ${isStopped?'rgba(239,68,68,0.3)':D.border}`,gap:12,transition:'all 0.15s' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0 }}>
                        {item.image_url
                          ?<img src={item.image_url} alt={item.name} style={{ width:36,height:36,borderRadius:8,objectFit:'cover',flexShrink:0,opacity:isStopped?0.4:1 }} />
                          :<div style={{ width:36,height:36,borderRadius:8,background:D.surface2,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,opacity:isStopped?0.4:1 }}>🍽</div>
                        }
                        <div>
                          <div style={{ fontWeight:700,fontSize:14,color:isStopped?D.sub:D.text,textDecoration:isStopped?'line-through':'none' }}>
                            {isStopped&&'🚫 '}{item.name}
                            {item.variant&&<span style={{ marginLeft:6,fontSize:11,color:D.sub,fontWeight:600 }}>{item.variant==='chicken'?'курица':item.variant==='pork'?'свинина':item.variant}</span>}
                          </div>
                          <div style={{ fontSize:12,color:D.gold,fontWeight:700,marginTop:2 }}>{fmt(item.price)}</div>
                        </div>
                      </div>
                      {/* Тоггл */}
                      <button onClick={()=>toggle(item.id)} disabled={isToggling} style={{
                        width:52,height:28,borderRadius:999,border:'none',cursor:isToggling?'default':'pointer',
                        background:isStopped?D.red:D.green,
                        position:'relative',transition:'background 0.2s',flexShrink:0,opacity:isToggling?0.6:1,
                      }}>
                        <div style={{ position:'absolute',top:3,width:22,height:22,borderRadius:'50%',background:'#fff',transition:'left 0.2s',left:isStopped?3:27,boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

// ─── AdminPage ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [session,setSession]=useState(null)
  const [authChecked,setAuthChecked]=useState(false)
  const [assignedBranch,setAssignedBranch]=useState(undefined)
  const [tab,setTab]=useState('orders')
  const [branch,setBranch]=useState('all')
  const [orders,setOrders]=useState([])
  const [itemsMap,setItemsMap]=useState({})
  const [loading,setLoading]=useState(false)
  const [showDone,setShowDone]=useState(false)
  const prevNewRef=useRef(-1)
  const tickRef=useRef(0)
  const [tick,setTick]=useState(0)

  const sb=supabase

  // Auth
  useEffect(()=>{
    if(!sb){setAuthChecked(true);return}
    sb.auth.getSession().then(async({data})=>{
      setSession(data.session)
      if(data.session?.access_token){
        try{
          const res=await fetch('/api/admin/me',{headers:{Authorization:`Bearer ${data.session.access_token}`}})
          const json=await res.json()
          setAssignedBranch(json.branch_id??null)
        }catch{setAssignedBranch(null)}
      }else{setAssignedBranch(null)}
      setAuthChecked(true)
    })
    const{data:{subscription}}=sb.auth.onAuthStateChange(async(_,s)=>{
      setSession(s)
      if(s?.access_token){
        try{const res=await fetch('/api/admin/me',{headers:{Authorization:`Bearer ${s.access_token}`}});const json=await res.json();setAssignedBranch(json.branch_id??null)}
        catch{setAssignedBranch(null)}
      }else{setAssignedBranch(null)}
    })
    return()=>subscription.unsubscribe()
  },[])

  async function load(){
    if(!session)return
    if(assignedBranch===undefined)return
    setLoading(true)
    const effectiveBranch=assignedBranch?assignedBranch:branch
    const url=effectiveBranch==='all'||!effectiveBranch?'/api/admin/orders':`/api/admin/orders?branch_id=${effectiveBranch}`
    try{
      const res=await fetch(url)
      const data=await res.json()
      setOrders(data.orders||[])
      setItemsMap(data.itemsMap||{})
    }catch{}
    setLoading(false)
  }

  useEffect(()=>{if(session&&assignedBranch!==undefined)load()},[session,branch,assignedBranch])

  // Realtime
  useEffect(()=>{
    if(!sb||!session)return
    const ch=sb.channel('admin-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>load())
      .subscribe()
    return()=>sb.removeChannel(ch)
  },[session,assignedBranch])

  // Tick каждые 30 сек
  useEffect(()=>{
    const id=setInterval(()=>{tickRef.current++;setTick(tickRef.current)},30000)
    return()=>clearInterval(id)
  },[])

  // Звук + счётчик вкладки
  useEffect(()=>{
    const newCnt=orders.filter(o=>o.status==='new').length
    document.title=newCnt>0?`(${newCnt}) Админка — На Виражах`:'Админка — На Виражах'
    if(prevNewRef.current!==-1&&newCnt>prevNewRef.current){
      try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=880;gain.gain.setValueAtTime(0.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.5)}catch{}
    }
    prevNewRef.current=newCnt
  },[orders])

  // Аnim стиль
  useEffect(()=>{
    if(typeof document!=='undefined'&&!document.getElementById('admin-styles')){
      const s=document.createElement('style');s.id='admin-styles'
      s.textContent='@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#2a2f45;border-radius:3px}'
      document.head.appendChild(s)
    }
  },[])

  const active=useMemo(()=>orders.filter(o=>ACTIVE_ST.includes(o.status)).sort((a,b)=>{
    const an=a.status==='new'?0:1,bn=b.status==='new'?0:1
    if(an!==bn)return an-bn
    return new Date(b.created_at)-new Date(a.created_at)
  }),[orders])
  const done=useMemo(()=>orders.filter(o=>DONE_ST.includes(o.status)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[orders])

  function bName(id){ return BRANCHES.find(b=>b.id===id)?.name||id }

  if(!authChecked)return null
  if(!session)return <Login onLogin={s=>setSession(s)} />

  return (
    <div style={{ background:D.bg,minHeight:'100vh',color:D.text,fontFamily:"'Nunito',sans-serif" }}>
      {/* Шапка */}
      <header style={{ background:D.surface,borderBottom:`1px solid ${D.border}`,padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:50 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:20,color:D.text }}>Админка</div>
          <div style={{ fontSize:12,color:D.sub }}>На Виражах</div>
        </div>
        <div style={{ display:'flex',gap:12,alignItems:'center' }}>
          {active.filter(o=>o.status==='new').length>0&&(
            <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:999,background:'rgba(255,107,53,0.15)',border:'1px solid rgba(255,107,53,0.4)',color:D.accent,fontSize:13,fontWeight:800,animation:'pulse 2s infinite' }}>
              🔔 {active.filter(o=>o.status==='new').length} новых
            </div>
          )}
          <a href="/" style={{ color:D.sub,fontSize:13,textDecoration:'none',fontWeight:600 }}>← Меню</a>
          <button onClick={()=>sb.auth.signOut()} style={{ border:`1px solid ${D.border}`,borderRadius:10,background:'transparent',color:D.sub,padding:'7px 14px',fontSize:13,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontWeight:700 }}>Выйти</button>
        </div>
      </header>

      <main style={{ maxWidth:1000,margin:'0 auto',padding:'20px 16px' }}>
        {/* Вкладки */}
        <div style={{ display:'flex',gap:8,marginBottom:20 }}>
          {[['orders','📋 Заказы'],['stoplist','🚫 Стоп-лист']].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              border:`2px solid ${tab===key?D.accent:D.border}`,
              background:tab===key?'rgba(255,107,53,0.12)':D.surface,
              color:tab===key?D.accent:D.sub,
              borderRadius:12,padding:'10px 20px',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:'pointer',
            }}>{label}</button>
          ))}
        </div>

        {tab==='stoplist'&&<StopListTab defaultBranch={assignedBranch} />}

        {tab==='orders'&&(
          <>
            {/* Фильтр + обновить */}
            <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center' }}>
              {assignedBranch===null&&[{id:'all',name:'Все точки'},...BRANCHES].map(b=>(
                <button key={b.id} onClick={()=>setBranch(b.id)} style={{
                  border:`2px solid ${branch===b.id?D.accent:D.border}`,
                  background:branch===b.id?'rgba(255,107,53,0.12)':D.surface,
                  color:branch===b.id?D.accent:D.sub,
                  borderRadius:999,padding:'8px 16px',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:'pointer',
                }}>{b.name}</button>
              ))}
              {assignedBranch&&(
                <div style={{ padding:'8px 16px',borderRadius:999,background:'rgba(255,107,53,0.12)',border:`2px solid ${D.accent}`,color:D.accent,fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13 }}>
                  📍 {BRANCHES.find(b=>b.id===assignedBranch)?.name||assignedBranch}
                </div>
              )}
              <button onClick={load} style={{ border:`1px solid ${D.border}`,borderRadius:999,background:D.surface,color:D.sub,padding:'8px 14px',fontFamily:"'Nunito',sans-serif",fontSize:13,cursor:'pointer',marginLeft:'auto' }}>↻ Обновить</button>
            </div>

            {/* Счётчики */}
            {active.length>0&&(
              <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' }}>
                {[['new','Новых',STATUS_CLR.new],['confirmed','Подтв.',STATUS_CLR.confirmed],['preparing','Готовится',STATUS_CLR.preparing],['ready','Готово',STATUS_CLR.ready]].map(([st,label,clr])=>{
                  const cnt=active.filter(o=>o.status===st).length
                  if(!cnt)return null
                  return(
                    <div key={st} style={{ padding:'6px 14px',borderRadius:999,background:`${clr}18`,border:`1px solid ${clr}40`,color:clr,fontSize:13,fontWeight:800 }}>
                      {label}: {cnt}
                    </div>
                  )
                })}
                <div style={{ marginLeft:'auto',padding:'6px 14px',borderRadius:999,background:D.surface,border:`1px solid ${D.border}`,color:D.sub,fontSize:13,fontWeight:700 }}>
                  В работе: {active.length} / 10
                </div>
              </div>
            )}

            {/* Активные заказы */}
            {loading&&<div style={{ color:D.sub,padding:'20px',textAlign:'center' }}>Загрузка…</div>}
            {!loading&&active.length===0&&(
              <div style={{ textAlign:'center',padding:'60px 20px',color:D.sub }}>
                <div style={{ fontSize:48,marginBottom:12 }}>🎉</div>
                <div style={{ fontSize:16,fontWeight:600 }}>Активных заказов нет</div>
              </div>
            )}
            {!loading&&active.length>0&&(
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12,marginBottom:24 }}>
                {active.map(order=>(
                  <OrderCard key={order.id+'-'+tick} order={order} items={itemsMap[order.id]} branchLabel={branch==='all'?bName(order.branch_id):null} />
                ))}
              </div>
            )}

            {/* Архив */}
            {done.length>0&&(
              <div>
                <button onClick={()=>setShowDone(v=>!v)} style={{ border:`1px solid ${D.border}`,borderRadius:12,background:D.surface,color:D.sub,fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,padding:'10px 18px',cursor:'pointer',marginBottom:12 }}>
                  {showDone?'▲ Скрыть':'▼ Отработанные'} ({done.length})
                </button>
                {showDone&&(
                  <div style={{ display:'grid',gap:6 }}>
                    {done.map(o=>(
                      <div key={o.id} style={{ padding:'12px 16px',borderRadius:12,background:D.surface,border:`1px solid ${o.review_rating?'rgba(255,107,53,0.2)':D.border}`,opacity:0.75 }}>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap' }}>
                          <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:900,color:D.accent,fontSize:16 }}>{o.short_number||o.id.slice(0,8)}</span>
                          <span style={{ color:D.sub,fontSize:13 }}>{bName(o.branch_id)}</span>
                          <span style={{ color:D.sub,fontSize:13 }}>{o.customer_name||'—'}</span>
                          <span style={{ color:STATUS_CLR[o.status],fontSize:12,fontWeight:700 }}>{LABELS[o.status]}</span>
                          <span style={{ color:D.gold,fontWeight:800,marginLeft:'auto',fontSize:14 }}>{fmt(o.total)}</span>
                        </div>
                        {o.review_rating&&(
                          <div style={{ marginTop:8,paddingTop:8,borderTop:`1px solid ${D.border}`,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                            <span style={{ fontSize:14 }}>{'⭐'.repeat(o.review_rating)}</span>
                            {o.review_comment&&<span style={{ color:D.sub,fontSize:12,fontStyle:'italic' }}>«{o.review_comment}»</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
