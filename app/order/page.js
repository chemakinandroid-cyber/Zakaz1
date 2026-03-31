'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const BRANCH_NAMES = { 'nv-fr-002':'На Виражах — Аэропорт', 'nv-sh-001':'На Виражах — Конечная' }
const STATUS_LABELS = { new:'Новый', confirmed:'Подтверждён', preparing:'Готовится', ready:'Готов к выдаче', completed:'Выдан', cancelled:'Отменён', expired:'Истёк' }
const STATUS_COLORS = { new:'#3b82f6', confirmed:'#8b5cf6', preparing:'#f59e0b', ready:'#22c55e', completed:'#94a3b8', cancelled:'#ef4444', expired:'#94a3b8' }
const STATUS_ICONS  = { new:'🕐', confirmed:'✅', preparing:'🍳', ready:'🔔', completed:'✔️', cancelled:'❌', expired:'⏰' }
const STATUS_STEPS  = ['new','confirmed','preparing','ready']

const C = { orange:'#ff6b35', orangeLight:'#fff0ea', orangeDark:'#e5501a', bg:'#f7f3ee', card:'#ffffff', text:'#1a1a1a', muted:'#8a8a8a', border:'#f0ebe4' }

function fmt(v){ return `${Number(v||0)} ₽` }
function formatDT(v){
  if (!v) return ''
  const d=new Date(v); if(isNaN(d))return ''
  return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)
}
function candidates(raw){
  const v=String(raw||'').trim(); const c=v.replace(/\s+/g,''); const d=c.replace(/\D/g,'').replace(/^0+/,'')||'0'
  const s=new Set([v,c,d]); if(/^\d+$/.test(c)){s.add(c.padStart(4,'0'));s.add(c.padStart(3,'0'))} return [...s].filter(Boolean)
}
function pickBest(rows,raw){
  if (!rows?.length)return null
  const c=String(raw||'').trim().replace(/\s+/g,''); const d=c.replace(/\D/g,'').replace(/^0+/,'')||'0'
  const score=r=>{const sn=String(r.short_number||'').trim();const on=String(r.order_number||'').trim();if(sn===c)return 100;if(sn.replace(/^0+/,'')=== d)return 95;if(on===c)return 90;if(on.endsWith(`-${c}`))return 85;return 0}
  return [...rows].sort((a,b)=>score(b)-score(a)||new Date(b.created_at)-new Date(a.created_at))[0]
}

// ─── ReviewForm ───────────────────────────────────────────────────────────────

function ReviewForm({ orderId, onDone }) {
  const [rating,setRating]=useState(0)
  const [hovered,setHovered]=useState(0)
  const [comment,setComment]=useState('')
  const [busy,setBusy]=useState(false)
  const [done,setDone]=useState(false)

  async function submit(){
    if (!rating||!supabase)return
    setBusy(true)
    try {
      await supabase.from('order_reviews').upsert({order_id:orderId,rating,comment:comment.trim()||null},{onConflict:'order_id'})
      setDone(true); onDone&&onDone(rating)
    } catch {}
    finally{setBusy(false)}
  }

  if (done) return (
    <div style={{ marginTop:16, padding:'16px', borderRadius:16, background:C.orangeLight, border:`1px solid #ffd4c2`, textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:6 }}>🙏</div>
      <div style={{ fontWeight:700, color:C.orangeDark, fontSize:15 }}>Спасибо за оценку!</div>
    </div>
  )

  return (
    <div style={{ marginTop:16, padding:'16px', borderRadius:16, background:C.orangeLight, border:`1px solid #ffd4c2` }}>
      <div style={{ fontWeight:800, fontSize:15, color:C.orange, marginBottom:14 }}>⭐ Оцените заказ</div>
      <div style={{ display:'flex', gap:8, marginBottom:14, justifyContent:'center' }}>
        {[1,2,3,4,5].map(star=>(
          <button key={star} onClick={()=>setRating(star)} onMouseEnter={()=>setHovered(star)} onMouseLeave={()=>setHovered(0)}
            style={{ background:'transparent', border:0, cursor:'pointer', fontSize:36, lineHeight:1, padding:4, filter:(hovered||rating)>=star?'none':'grayscale(1) opacity(0.3)', transform:(hovered||rating)>=star?'scale(1.1)':'scale(1)', transition:'all 0.1s' }}>⭐</button>
        ))}
      </div>
      {rating>0 && (
        <>
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий (необязательно)" rows={2}
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:10, border:'1.5px solid #ffd4c2', background:'#fff', color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:14, outline:'none', resize:'none', marginBottom:10 }} />
          <button onClick={submit} disabled={busy}
            style={{ width:'100%', border:0, borderRadius:12, background:C.orange, color:'#fff', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, padding:'12px', cursor:busy?'default':'pointer', opacity:busy?0.7:1 }}>
            {busy?'Отправляем…':'Отправить оценку'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function Inner() {
  const searchParams=useSearchParams()
  const [input,setInput]=useState('')
  const [order,setOrder]=useState(null)
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [review,setReview]=useState(null)

  async function search(forced){
    const val=String(forced??input).trim()
    setError('');setOrder(null);setItems([]);setReview(null)
    if (!val)return setError('Введите номер заказа')
    if (!supabase)return setError('Supabase не настроен')
    setLoading(true)
    try {
      const cands=candidates(val)
      const orParts=[]
      for(const c of cands){const safe=c.replace(/[,%]/g,'');orParts.push(`short_number.eq.${safe}`,`order_number.eq.${safe}`);if(/^[0-9a-f-]{36}$/i.test(safe))orParts.push(`id.eq.${safe}`)}
      const {data:rows,error:e}=await supabase.from('orders').select('*').or(orParts.join(',')).order('created_at',{ascending:false}).limit(20)
      if (e)throw e
      const best=pickBest(rows,val)
      if (!best)return setError('Заказ не найден')
      const {data:oi,error:e2}=await supabase.from('order_items').select('*').eq('order_id',best.id).order('created_at')
      if (e2)throw e2
      setOrder(best);setItems(oi||[])
      if (best.status==='completed'){
        const {data:rv}=await supabase.from('order_reviews').select('rating,comment').eq('order_id',best.id).maybeSingle()
        setReview(rv||null)
      }
    } catch{setError('Ошибка загрузки заказа')}
    finally{setLoading(false)}
  }

  useEffect(()=>{
    const num=String(searchParams.get('number')||'').trim()
    if (!num)return
    setInput(num);search(num)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[searchParams])

  useEffect(()=>{
    if (!supabase||!order?.id)return
    const ch=supabase.channel(`order-${order.id}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:`id=eq.${order.id}`},p=>{setOrder(p.new)})
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[order?.id])

  const st=order?.status
  const stepIdx=STATUS_STEPS.indexOf(st)
  const isDone=['completed','cancelled','expired'].includes(st)
  const displayNum=order?.short_number||order?.order_number||order?.id||''
  const branchName=BRANCH_NAMES[order?.branch_id]||order?.branch_id||'—'
  const stColor=STATUS_COLORS[st]||C.muted

  return (
    <main style={{ maxWidth:600, margin:'0 auto', padding:'24px 14px 60px', background:C.bg, minHeight:'100vh' }}>
      <div style={{ marginBottom:24 }}>
        <a href="/" style={{ color:C.orange, fontSize:14, textDecoration:'none', fontWeight:700 }}>← Меню</a>
        <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:24, marginTop:12, color:C.text }}>Отследить заказ</div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
          placeholder="Номер заказа, например 0007"
          style={{ flex:1, minWidth:200, padding:'13px 16px', borderRadius:14, border:`1.5px solid ${C.border}`, background:'#fff', color:C.text, fontFamily:"'Nunito',sans-serif", fontSize:16, outline:'none' }} />
        <button onClick={()=>search()} disabled={loading}
          style={{ padding:'13px 22px', border:0, borderRadius:14, background:C.orange, color:'#fff', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:loading?'default':'pointer', opacity:loading?0.7:1 }}>
          {loading?'…':'Найти'}
        </button>
      </div>

      {error && <div style={{ color:'#e53e3e', marginBottom:16, fontSize:14, fontWeight:600 }}>{error}</div>}

      {order && (
        <div style={{ background:'#fff', borderRadius:24, padding:20, boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ color:C.muted, fontSize:12, marginBottom:4, fontWeight:600 }}>Номер заказа</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:48, lineHeight:1, color:C.orange }}>{displayNum}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:28 }}>{STATUS_ICONS[st]||'•'}</div>
              <div style={{ fontWeight:800, fontSize:14, color:stColor, marginTop:4 }}>{STATUS_LABELS[st]||st}</div>
            </div>
          </div>

          {!isDone && stepIdx>=0 && (
            <div style={{ display:'flex', gap:4, marginBottom:16 }}>
              {STATUS_STEPS.map((s,i)=>(
                <div key={s} style={{ flex:1, height:5, borderRadius:3, background:i<=stepIdx?stColor:'#f0ebe4', transition:'background 0.3s' }} />
              ))}
            </div>
          )}

          <div style={{ display:'grid', gap:6, fontSize:14, color:C.muted, marginBottom:16 }}>
            <div>📍 {branchName}</div>
            {order.customer_name && <div>👤 {order.customer_name}</div>}
            {order.created_at && <div>🕐 {formatDT(order.created_at)}</div>}
          </div>

          {items.length>0 && (
            <div style={{ display:'grid', gap:8, marginBottom:16 }}>
              {items.map(item=>(
                <div key={item.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, background:'#fafaf8', border:`1.5px solid ${C.border}`, fontSize:14 }}>
                  <div>
                    <div style={{ fontWeight:700, color:C.text }}>{item.item_name}</div>
                    <div style={{ color:C.muted, fontSize:12 }}>{item.quantity} × {fmt(item.price)}</div>
                  </div>
                  <div style={{ fontWeight:800, color:C.orange }}>{fmt(item.line_total)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1.5px solid ${C.border}`, paddingTop:14 }}>
            <div style={{ color:C.muted, fontSize:14, fontWeight:600 }}>Итого</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:22, color:C.orange }}>{fmt(order.total)}</div>
          </div>

          {order.status==='completed' && (
            review
              ? <div style={{ marginTop:16, padding:'12px 14px', borderRadius:12, background:C.orangeLight, border:`1px solid #ffd4c2`, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{'⭐'.repeat(review.rating)}</span>
                  {review.comment&&<span style={{ color:C.muted, fontSize:13 }}>{review.comment}</span>}
                </div>
              : <ReviewForm orderId={order.id} onDone={rating=>setReview({rating,comment:''})} />
          )}
        </div>
      )}
    </main>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ padding:24, color:'#8a8a8a' }}>Загрузка…</div>}>
      <Inner />
    </Suspense>
  )
}
