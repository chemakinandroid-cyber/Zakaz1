'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const BRANCHES = [
  { id: 'nv-fr-002', name: 'Аэропорт', fullName: 'На Виражах — Аэропорт' },
  { id: 'nv-sh-001', name: 'Конечная',  fullName: 'На Виражах — Конечная' },
]
const CATEGORY_ORDER = ['shawarma','shawarma_addons','burgers','hotdogs','shashlik','quesadilla','fries','sauces','drinks']
const CATEGORY_LABELS = {
  shawarma:'Шаурма', shawarma_addons:'Добавки к шаурме',
  burgers:'Бургеры', hotdogs:'Хот-доги', shashlik:'Шашлык',
  quesadilla:'Кесадилья', fries:'Фритюр', sauces:'Соусы', drinks:'Напитки',
}
const ACTIVE_ST = ['new','confirmed','preparing','ready']
const DONE_ST   = ['completed','cancelled','expired']
const LABELS = {
  new:'Новый', confirmed:'Подтверждён', preparing:'Готовится',
  ready:'Готов', completed:'Выдан', cancelled:'Отменён', expired:'Истёк',
}
const COLORS = {
  new:'#6b8ecf', confirmed:'#a78bfa', preparing:'#f4a01d',
  ready:'#22c55e', completed:'#3d4f6e', cancelled:'#7f3a3a', expired:'#3d4f6e',
}
const NEXT_ACTIONS = {
  new:       [{ v:'confirmed', label:'✅ Подтвердить' }, { v:'cancelled', label:'❌ Отменить' }],
  confirmed: [{ v:'preparing', label:'🍳 В работу'   }, { v:'cancelled', label:'❌ Отменить' }],
  preparing: [{ v:'ready',     label:'🔔 Готов'       }],
  ready:     [{ v:'completed', label:'✔️ Выдан'       }],
}

function fmt(v) { return `${Number(v||0)} ₽` }
function elapsed(ts) {
  if (!ts) return ''
  const m = Math.floor((Date.now()-new Date(ts))/60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин`
  return `${Math.floor(m/60)} ч ${m%60} мин`
}
function fmtTime(v) {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d) ? '' : d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})
}
function normCat(cat) {
  const r = String(cat||'').trim().toLowerCase()
  if (r === 'fryer') return 'fries'
  return r
}


// ─── Login ────────────────────────────────────────────────────────────────────

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [err,   setErr]   = useState('')
  const [busy,  setBusy]  = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) return setErr(error.message)
      onLogin(data.session)
    } catch { setErr('Ошибка входа') }
    finally { setBusy(false) }
  }

  return (
    <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:380, background:'linear-gradient(160deg,#0d1f4e,#07122e)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:28 }}>
        <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:20, marginBottom:4 }}>На Виражах</div>
        <div style={{ color:'#6b7db5', fontSize:14, marginBottom:24 }}>Панель администратора</div>
        <form onSubmit={submit} style={{ display:'grid', gap:12 }}>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email"
            style={{ padding:'12px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'#f0f4ff', fontFamily:"'Onest',sans-serif", fontSize:15, outline:'none' }} required />
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="Пароль"
            style={{ padding:'12px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'#f0f4ff', fontFamily:"'Onest',sans-serif", fontSize:15, outline:'none' }} required />
          {err && <div style={{ color:'#ff7c7c', fontSize:13 }}>{err}</div>}
          <button type="submit" disabled={busy} style={{ border:0, borderRadius:10, background:'#f4a01d', color:'#07122e', fontFamily:"'Unbounded',sans-serif", fontWeight:700, fontSize:14, padding:13, cursor:busy?'default':'pointer', opacity:busy?0.7:1 }}>
            {busy ? 'Входим…' : 'Войти'}
          </button>
        </form>
      </div>
    </main>
  )
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, items, branchLabel }) {
  const [updating, setUpdating] = useState(false)
  const [el, setEl] = useState(elapsed(order.created_at))
  const actions = NEXT_ACTIONS[order.status] || []
  const color = COLORS[order.status] || '#3d4f6e'
  const isNew = order.status === 'new'

  useEffect(() => {
    const id = setInterval(() => setEl(elapsed(order.created_at)), 30000)
    return () => clearInterval(id)
  }, [order.created_at])

  async function changeStatus(v) {
    setUpdating(true)
    try {
      await fetch('/api/admin/orders', {
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: order.id, status: v }),
      })
      // Отправляем push клиенту при подтверждении или готовности
      if (v === 'confirmed' || v === 'ready') {
        fetch('/api/push/send', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ order_id: order.id, status: v }),
        }).catch(() => {})
      }
    } finally { setUpdating(false) }
  }

  return (
    <div style={{
      background:'linear-gradient(160deg,#0d1f4e,#07122e)',
      border:`1px solid ${isNew ? 'rgba(244,160,29,0.45)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius:16, padding:16,
      boxShadow: isNew ? '0 0 28px rgba(244,160,29,0.1)' : 'none',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:28, color:'#f4a01d', lineHeight:1 }}>
            {order.short_number || order.order_number || order.id.slice(0,8)}
          </div>
          <div style={{ color:'#6b7db5', fontSize:12, marginTop:4 }}>
            {fmtTime(order.created_at)} · {el}{branchLabel ? ` · ${branchLabel}` : ''}
          </div>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:999, background:`${color}22`, border:`1px solid ${color}55`, color, fontSize:12, fontWeight:700 }}>
          {LABELS[order.status] || order.status}
        </div>
      </div>

      {order.customer_name && (
        <div style={{ fontSize:14, marginBottom:6 }}>
          👤 <strong>{order.customer_name}</strong>
          {order.customer_phone && <span style={{ color:'#6b7db5' }}> · {order.customer_phone}</span>}
        </div>
      )}
      {order.comment && (
        <div style={{ fontSize:13, color:'#8fa3cc', marginBottom:8, padding:'6px 10px', background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
          💬 {order.comment}
        </div>
      )}

      {items?.length > 0 && (
        <div style={{ display:'grid', gap:5, marginBottom:10, padding:'8px 10px', background:'rgba(255,255,255,0.02)', borderRadius:10 }}>
          {items.map(i => {
            let mods = []
            try { mods = i.modifiers ? (typeof i.modifiers === 'string' ? JSON.parse(i.modifiers) : i.modifiers) : [] } catch {}
            return (
              <div key={i.id}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#c8d5f5' }}>
                  <span>{i.item_name} × {i.quantity}</span>
                  <span style={{ color:'#8fa3cc' }}>{fmt(i.line_total)}</span>
                </div>
                {mods.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:3, paddingLeft:8 }}>
                    {mods.map(m => (
                      <span key={m.id} style={{ fontSize:11, padding:'1px 7px', borderRadius:999, background:'rgba(34,197,94,0.1)', color:'#a0f0c0', border:'1px solid rgba(34,197,94,0.2)' }}>
                        +{m.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:10, gap:10, flexWrap:'wrap' }}>
        <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:16 }}>{fmt(order.total)}</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {actions.map(a => (
            <button key={a.v} disabled={updating} onClick={() => changeStatus(a.v)} style={{
              border:0, borderRadius:10, padding:'9px 14px', fontSize:13,
              background: a.v==='cancelled'?'#7f1d1d': a.v==='completed'?'#14532d':'#f4a01d',
              color: (a.v==='cancelled'||a.v==='completed')?'#f0f4ff':'#07122e',
              fontFamily:"'Onest',sans-serif", fontWeight:700, cursor:updating?'default':'pointer', opacity:updating?0.6:1,
            }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── StopListTab ──────────────────────────────────────────────────────────────

function StopListTab({ defaultBranch }) {
  const [stopBranch,  setStopBranch]  = useState(defaultBranch || BRANCHES[0].id)
  const [menuItems,   setMenuItems]   = useState([])
  const [stopSet,     setStopSet]     = useState(new Set()) // id позиций в стопе
  const [loading,     setLoading]     = useState(true)
  const [toggling,    setToggling]    = useState(new Set()) // id в процессе переключения

  async function loadData(branchId) {
    if (!supabase) return
    setLoading(true)
    const [{ data: menu }, { data: stop }] = await Promise.all([
      supabase.from('menu_items').select('id,name,category,variant,price').order('name'),
      supabase.from('stop_list').select('menu_item_id').eq('branch_id', branchId).eq('is_stopped', true),
    ])
    setMenuItems(menu || [])
    setStopSet(new Set((stop || []).map(r => r.menu_item_id)))
    setLoading(false)
  }

  useEffect(() => { loadData(stopBranch) }, [stopBranch])

  async function toggle(itemId) {
    if (!supabase || toggling.has(itemId)) return
    setToggling(prev => new Set([...prev, itemId]))

    const isStopped = stopSet.has(itemId)

    try {
      if (isStopped) {
        // Убираем из стопа
        await supabase.from('stop_list')
          .delete()
          .eq('branch_id', stopBranch)
          .eq('menu_item_id', itemId)
        setStopSet(prev => { const n = new Set(prev); n.delete(itemId); return n })
      } else {
        // Добавляем в стоп
        await supabase.from('stop_list')
          .upsert({ branch_id: stopBranch, menu_item_id: itemId, is_stopped: true }, { onConflict: 'branch_id,menu_item_id' })
        setStopSet(prev => new Set([...prev, itemId]))
      }
    } catch (e) {
      console.error('toggle stop error', e)
    } finally {
      setToggling(prev => { const n = new Set(prev); n.delete(itemId); return n })
    }
  }

  // Группируем по категории
  const grouped = useMemo(() => {
    const g = {}
    for (const cat of CATEGORY_ORDER) g[cat] = []
    for (const item of menuItems) {
      const cat = normCat(item.category)
      if (!g[cat]) g[cat] = []
      g[cat].push(item)
    }
    return g
  }, [menuItems])

  const stoppedCount = stopSet.size

  return (
    <div>
      {/* Вкладки точек — скрываем если назначена конкретная точка */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {BRANCHES.filter(b => !defaultBranch || b.id === defaultBranch).map(b => (
          <button key={b.id} onClick={() => setStopBranch(b.id)} style={{
            border: stopBranch===b.id ? '2px solid #f4a01d' : '1px solid rgba(255,255,255,0.1)',
            background: stopBranch===b.id ? 'rgba(244,160,29,0.12)' : 'rgba(255,255,255,0.03)',
            color: stopBranch===b.id ? '#f4a01d' : '#c8d5f5',
            borderRadius:999, padding:'9px 18px',
            fontFamily:"'Onest',sans-serif", fontWeight:700, fontSize:14, cursor:'pointer',
          }}>{b.name}</button>
        ))}
        {stoppedCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', padding:'9px 14px', borderRadius:999, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', fontSize:13, fontWeight:700 }}>
            🚫 В стопе: {stoppedCount}
          </div>
        )}
      </div>

      {loading && <div style={{ color:'#6b7db5', padding:'20px 0' }}>Загрузка меню…</div>}

      {!loading && CATEGORY_ORDER.map(cat => {
        const catItems = grouped[cat] || []
        if (!catItems.length) return null
        const stoppedInCat = catItems.filter(i => stopSet.has(i.id)).length

        return (
          <div key={cat} style={{ marginBottom:16 }}>
            {/* Заголовок категории */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:700, fontSize:13, color:'#f4a01d' }}>
                {CATEGORY_LABELS[cat] || cat}
              </div>
              {stoppedInCat > 0 && (
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:999, background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)' }}>
                  {stoppedInCat} в стопе
                </span>
              )}
            </div>

            {/* Позиции */}
            <div style={{ display:'grid', gap:6 }}>
              {catItems.map(item => {
                const isStopped = stopSet.has(item.id)
                const isToggling = toggling.has(item.id)

                return (
                  <div key={item.id} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'11px 14px', borderRadius:12, gap:12,
                    background: isStopped ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
                    border: isStopped ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    opacity: isToggling ? 0.6 : 1,
                    transition:'all 0.15s',
                  }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color: isStopped ? '#9ca3af' : '#f0f4ff' }}>
                        {isStopped && <span style={{ marginRight:6 }}>🚫</span>}
                        {item.name}
                        {item.variant && (
                          <span style={{ marginLeft:6, fontSize:11, color:'#6b7db5' }}>
                            {item.variant==='chicken'?'курица':item.variant==='pork'?'свинина':item.variant}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'#6b7db5', marginTop:2 }}>{fmt(item.price)}</div>
                    </div>

                    {/* Тоггл */}
                    <button
                      onClick={() => toggle(item.id)}
                      disabled={isToggling}
                      style={{
                        position:'relative', width:52, height:28, borderRadius:14,
                        border:0, cursor:isToggling?'default':'pointer',
                        background: isStopped ? '#ef4444' : '#22c55e',
                        transition:'background 0.2s', flexShrink:0,
                      }}
                    >
                      <div style={{
                        position:'absolute', top:3,
                        left: isStopped ? 4 : 24,
                        width:22, height:22, borderRadius:'50%',
                        background:'#fff', transition:'left 0.2s',
                        boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
                      }} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [session,        setSession]        = useState(null)
  const [authChecked,    setAuthChecked]    = useState(false)
  const [assignedBranch, setAssignedBranch] = useState(undefined) // undefined=загружается, null=мастер, 'id'=точка
  const [tab,            setTab]            = useState('orders')
  const [orders,      setOrders]      = useState([])
  const [itemsMap,    setItemsMap]    = useState({})
  const [loading,     setLoading]     = useState(true)
  const [branch,      setBranch]      = useState('all')
  const [showDone,    setShowDone]    = useState(false)
  const [tick,        setTick]        = useState(0)
  const prevNewRef = useRef(-1)

  useEffect(() => {
    if (!supabase) { setAuthChecked(true); return }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user?.id) {
        // Загружаем привязку к точке
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('branch_id')
          .eq('user_id', data.session.user.id)
          .maybeSingle()
        // Если записи нет → мастер (null), если есть → берём branch_id
        setAssignedBranch(adminRow ? (adminRow.branch_id || null) : null)
      } else {
        setAssignedBranch(null)
      }
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_,s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  async function load() {
    if (!session) return
    setLoading(true)
    // Если у пользователя назначена точка — принудительно фильтруем по ней
    const effectiveBranch = assignedBranch !== null && assignedBranch !== undefined ? assignedBranch : branch
    const url = effectiveBranch === 'all' || !effectiveBranch ? '/api/admin/orders' : `/api/admin/orders?branch_id=${effectiveBranch}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      setOrders(data.orders || [])
      setItemsMap(data.itemsMap || {})
    } catch {}
    setLoading(false)
  }

  useEffect(() => { if (session) load() }, [session, branch])

  useEffect(() => {
    if (!supabase || !session) return
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'orders' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [session, branch])

  useEffect(() => {
    const newCnt = orders.filter(o => o.status==='new').length
    if (prevNewRef.current !== -1 && newCnt > prevNewRef.current) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
      } catch {}
    }
    prevNewRef.current = newCnt
  }, [orders])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 30000)
    return () => clearInterval(id)
  }, [])

  const bName  = id => BRANCHES.find(b => b.id===id)?.name || id
  const active = useMemo(() => orders.filter(o => ACTIVE_ST.includes(o.status)).sort((a,b) => {
    // Новые заказы всегда сверху, остальные по времени (новые сначала)
    const aIsNew = a.status === 'new' ? 0 : 1
    const bIsNew = b.status === 'new' ? 0 : 1
    if (aIsNew !== bIsNew) return aIsNew - bIsNew
    return new Date(b.created_at) - new Date(a.created_at)
  }), [orders])
  const done   = useMemo(() => orders.filter(o => DONE_ST.includes(o.status)).sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,30), [orders])
  const newCnt = active.filter(o => o.status==='new').length

  async function logout() { await supabase.auth.signOut(); setSession(null) }

  if (!authChecked) return null
  if (!session) return <Login onLogin={setSession} />

  return (
    <main style={{ maxWidth:1100, margin:'0 auto', padding:'16px 12px 60px' }}>

      {/* Шапка */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:20 }}>Админка</div>
          <div style={{ color:'#6b7db5', fontSize:13 }}>На Виражах</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {newCnt > 0 && (
            <div style={{ padding:'6px 14px', borderRadius:999, background:'rgba(244,160,29,0.15)', border:'1px solid rgba(244,160,29,0.4)', color:'#f4a01d', fontWeight:800, fontSize:14 }}>
              🔔 {newCnt} {newCnt===1?'новый':'новых'}
            </div>
          )}

          <a href="/" style={{ color:'#6b8ecf', fontSize:13, textDecoration:'none' }}>← Меню</a>
          <button onClick={logout} style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, background:'transparent', color:'#8fa3cc', fontFamily:"'Onest',sans-serif", fontSize:13, padding:'8px 14px', cursor:'pointer' }}>Выйти</button>
        </div>
      </div>

      {/* Главные вкладки: Заказы / Стоп-лист */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'rgba(255,255,255,0.03)', borderRadius:14, padding:4, width:'fit-content' }}>
        {[['orders','📋 Заказы'],['stoplist','🚫 Стоп-лист']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            border:0, borderRadius:10, padding:'10px 20px',
            background: tab===key ? '#f4a01d' : 'transparent',
            color: tab===key ? '#07122e' : '#8fa3cc',
            fontFamily:"'Onest',sans-serif", fontWeight:700, fontSize:14, cursor:'pointer',
            transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Вкладка: Стоп-лист ── */}
      {tab === 'stoplist' && <StopListTab defaultBranch={assignedBranch} />}

      {/* ── Вкладка: Заказы ── */}
      {tab === 'orders' && (
        <>
          {/* Фильтр по точке — только для мастера */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {assignedBranch === null && [{ id:'all', name:'Все точки' }, ...BRANCHES].map(b => (
              <button key={b.id} onClick={() => setBranch(b.id)} style={{
                border: branch===b.id ? '2px solid #f4a01d' : '1px solid rgba(255,255,255,0.1)',
                background: branch===b.id ? 'rgba(244,160,29,0.12)' : 'rgba(255,255,255,0.03)',
                color: branch===b.id ? '#f4a01d' : '#c8d5f5',
                borderRadius:999, padding:'9px 16px',
                fontFamily:"'Onest',sans-serif", fontWeight:700, fontSize:14, cursor:'pointer',
              }}>{b.name}</button>
            ))}
            {assignedBranch && (
              <div style={{ padding:'9px 16px', borderRadius:999, background:'rgba(244,160,29,0.12)', border:'2px solid #f4a01d', color:'#f4a01d', fontFamily:"'Onest',sans-serif", fontWeight:700, fontSize:14 }}>
                📍 {BRANCHES.find(b=>b.id===assignedBranch)?.name || assignedBranch}
              </div>
            )}
            <button onClick={load} style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:999, background:'transparent', color:'#8fa3cc', padding:'9px 16px', fontFamily:"'Onest',sans-serif", fontSize:14, cursor:'pointer' }}>↻</button>
          </div>

          {/* Счётчики статусов */}
          {active.length > 0 && (
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {Object.entries(LABELS).filter(([k]) => ACTIVE_ST.includes(k)).map(([k,label]) => {
                const cnt = active.filter(o => o.status===k).length
                if (!cnt) return null
                return <div key={k} style={{ padding:'5px 12px', borderRadius:999, background:`${COLORS[k]}22`, border:`1px solid ${COLORS[k]}44`, color:COLORS[k], fontSize:12, fontWeight:700 }}>{label}: {cnt}</div>
              })}
              <div style={{ padding:'5px 12px', borderRadius:999, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#8fa3cc', fontSize:12, fontWeight:700 }}>
                В работе: {active.length} / 10
              </div>
            </div>
          )}

          {loading && <div style={{ color:'#6b7db5', padding:'20px 0' }}>Загрузка заказов…</div>}

          {!loading && active.length===0 && (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#3d4f6e' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
              <div style={{ fontSize:16 }}>Активных заказов нет</div>
            </div>
          )}

          <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', marginBottom:32 }}>
            {active.map(order => (
              <OrderCard key={order.id+'-'+tick} order={order} items={itemsMap[order.id]} branchLabel={branch==='all'?bName(order.branch_id):null} />
            ))}
          </div>

          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone(v=>!v)} style={{ border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, background:'rgba(255,255,255,0.03)', color:'#6b7db5', fontFamily:"'Onest',sans-serif", fontWeight:700, fontSize:14, padding:'10px 18px', cursor:'pointer', marginBottom:12 }}>
                {showDone ? '▲ Скрыть' : '▼ Отработанные'} ({done.length})
              </button>
              {showDone && (
                <div style={{ display:'grid', gap:6, opacity:0.6 }}>
                  {done.map(o => (
                    <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', fontSize:14, gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:700, color:'#6b7db5', minWidth:48 }}>{o.short_number||o.id.slice(0,8)}</span>
                      <span style={{ color:'#4a5f8a', fontSize:13 }}>{bName(o.branch_id)}</span>
                      <span style={{ color:'#4a5f8a', fontSize:13 }}>{o.customer_name||'—'}</span>
                      <span style={{ color:COLORS[o.status], fontSize:12, fontWeight:700 }}>{LABELS[o.status]}</span>
                      <span style={{ color:'#8fa3cc', fontWeight:700, marginLeft:'auto' }}>{fmt(o.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
