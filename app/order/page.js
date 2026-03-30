'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── ReviewForm ───────────────────────────────────────────────────────────────

function ReviewForm({ orderId, onDone }) {
  const [rating,    setRating]    = useState(0)
  const [hovered,   setHovered]   = useState(0)
  const [comment,   setComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,      setDone]      = useState(false)

  async function submit() {
    if (!rating || !supabase) return
    setSubmitting(true)
    try {
      await supabase.from('order_reviews').upsert({
        order_id: orderId,
        rating,
        comment: comment.trim() || null,
      }, { onConflict: 'order_id' })
      setDone(true)
      onDone && onDone(rating)
    } catch {}
    finally { setSubmitting(false) }
  }

  if (done) {
    return (
      <div style={{ marginTop:20, padding:'16px', borderRadius:16, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:8 }}>🙏</div>
        <div style={{ fontWeight:700, color:'#a0f0c0', fontSize:15 }}>Спасибо за оценку!</div>
      </div>
    )
  }

  return (
    <div style={{ marginTop:20, padding:'16px', borderRadius:16, background:'rgba(244,160,29,0.06)', border:'1px solid rgba(244,160,29,0.2)' }}>
      <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:700, fontSize:14, marginBottom:14, color:'#f4a01d' }}>
        ⭐ Оцените заказ
      </div>

      {/* Звёздочки */}
      <div style={{ display:'flex', gap:8, marginBottom:14, justifyContent:'center' }}>
        {[1,2,3,4,5].map(star => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background:'transparent', border:0, cursor:'pointer',
              fontSize:36, lineHeight:1, padding:4,
              filter: (hovered || rating) >= star ? 'none' : 'grayscale(1) opacity(0.3)',
              transform: (hovered || rating) >= star ? 'scale(1.1)' : 'scale(1)',
              transition:'all 0.1s',
            }}
          >⭐</button>
        ))}
      </div>

      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            rows={2}
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#f0f4ff', fontFamily:"'Onest',sans-serif", fontSize:14, outline:'none', resize:'none', marginBottom:10 }}
          />
          <button
            onClick={submit}
            disabled={submitting}
            style={{ width:'100%', border:0, borderRadius:10, background:'#f4a01d', color:'#07122e', fontFamily:"'Unbounded',sans-serif", fontWeight:700, fontSize:14, padding:'12px', cursor:submitting?'default':'pointer', opacity:submitting?0.7:1 }}
          >
            {submitting ? 'Отправляем…' : 'Отправить оценку'}
          </button>
        </>
      )}
    </div>
  )
}

const BRANCH_NAMES = {
  'nv-fr-002': 'На Виражах — Аэропорт',
  'nv-sh-001': 'На Виражах — Конечная',
}

const STATUS_LABELS = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  preparing: 'Готовится',
  ready: 'Готов к выдаче',
  completed: 'Выдан',
  cancelled: 'Отменён',
  expired: 'Истёк',
}
const STATUS_COLORS = {
  new: '#6b8ecf', confirmed: '#a78bfa', preparing: '#f4a01d',
  ready: '#22c55e', completed: '#6b7db5', cancelled: '#ef4444', expired: '#6b7db5',
}
const STATUS_ICONS = {
  new: '🕐', confirmed: '✅', preparing: '🍳',
  ready: '🔔', completed: '✔️', cancelled: '❌', expired: '⏰',
}
const STATUS_STEPS = ['new', 'confirmed', 'preparing', 'ready']

function fmt(v) { return `${Number(v || 0)} ₽` }
function formatDT(v) {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d) ? '' : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}
function candidates(raw) {
  const v = String(raw || '').trim()
  const c = v.replace(/\s+/g, '')
  const d = c.replace(/\D/g, '').replace(/^0+/, '') || '0'
  const s = new Set([v, c, d])
  if (/^\d+$/.test(c)) { s.add(c.padStart(4, '0')); s.add(c.padStart(3, '0')) }
  return [...s].filter(Boolean)
}
function pickBest(rows, raw) {
  if (!rows?.length) return null
  const c = String(raw || '').trim().replace(/\s+/g, '')
  const d = c.replace(/\D/g, '').replace(/^0+/, '') || '0'
  const score = r => {
    const sn = String(r.short_number || '').trim()
    const on = String(r.order_number || '').trim()
    if (sn === c) return 100
    if (sn.replace(/^0+/, '') === d) return 95
    if (on === c) return 90
    if (on.endsWith(`-${c}`)) return 85
    return 0
  }
  return [...rows].sort((a, b) => score(b) - score(a) || new Date(b.created_at) - new Date(a.created_at))[0]
}

const inp = { flex: 1, minWidth: 220, padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f0f4ff', fontFamily: "'Onest',sans-serif", fontSize: 16, outline: 'none' }

function Inner() {
  const searchParams = useSearchParams()
  const [input, setInput] = useState('')
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [review,   setReview]   = useState(null) // существующий отзыв
  const [showReview, setShowReview] = useState(false)

  async function search(forced) {
    const val = String(forced ?? input).trim()
    setError(''); setOrder(null); setItems([])
    if (!val) return setError('Введите номер заказа')
    if (!supabase) return setError('Supabase не настроен')
    setLoading(true)
    try {
      const cands = candidates(val)
      const orParts = []
      for (const c of cands) {
        const safe = c.replace(/[,%]/g, '')
        orParts.push(`short_number.eq.${safe}`, `order_number.eq.${safe}`)
        if (/^[0-9a-f-]{36}$/i.test(safe)) orParts.push(`id.eq.${safe}`)
      }
      const { data: rows, error: e } = await supabase.from('orders').select('*').or(orParts.join(',')).order('created_at', { ascending: false }).limit(20)
      if (e) throw e
      const best = pickBest(rows, val)
      if (!best) return setError('Заказ не найден')
      const { data: oi, error: e2 } = await supabase.from('order_items').select('*').eq('order_id', best.id).order('created_at')
      if (e2) throw e2
      setOrder(best)
      setItems(oi || [])

      // Для выданных заказов — загружаем отзыв и показываем форму
      if (best.status === 'completed') {
        const { data: rv } = await supabase
          .from('order_reviews')
          .select('rating, comment')
          .eq('order_id', best.id)
          .maybeSingle()
        setReview(rv || null)
        setShowReview(true)
      } else {
        setShowReview(false)
        setReview(null)
      }
    } catch { setError('Ошибка загрузки заказа') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const num = String(searchParams.get('number') || '').trim()
    if (!num) return
    setInput(num); search(num)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!supabase || !order?.id) return
    const ch = supabase.channel(`order-${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` }, p => {
        setOrder(p.new)
        if (p.new.status === 'completed') setShowReview(true)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [order?.id])

  const st = order?.status
  const stepIdx = STATUS_STEPS.indexOf(st)
  const isDone = ['completed', 'cancelled', 'expired'].includes(st)
  const displayNum = order?.short_number || order?.order_number || order?.id || ''
  const branchName = BRANCH_NAMES[order?.branch_id] || order?.branch_id || '—'

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 14px 60px' }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/" style={{ color: '#6b8ecf', fontSize: 14, textDecoration: 'none' }}>← Меню</a>
        <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 22, marginTop: 12 }}>Отследить заказ</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Номер заказа, например 0007" style={inp} />
        <button onClick={() => search()} disabled={loading} style={{ padding: '13px 20px', border: 0, borderRadius: 12, background: '#f4a01d', color: '#07122e', fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '…' : 'Найти'}
        </button>
      </div>

      {error && <div style={{ color: '#ff7c7c', marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {order && (
        <div style={{ background: 'linear-gradient(160deg,#0d1f4e,#07122e)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#6b7db5', fontSize: 12, marginBottom: 4 }}>Номер заказа</div>
              <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 44, lineHeight: 1, color: '#f4a01d' }}>{displayNum}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30 }}>{STATUS_ICONS[st] || '•'}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: STATUS_COLORS[st] || '#6b7db5', marginTop: 4 }}>{STATUS_LABELS[st] || st}</div>
            </div>
          </div>

          {!isDone && stepIdx >= 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {STATUS_STEPS.map((s, i) => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? (STATUS_COLORS[st] || '#f4a01d') : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gap: 6, fontSize: 14, color: '#8fa3cc', marginBottom: 16 }}>
            <div>📍 {branchName}</div>
            {order.customer_name && <div>👤 {order.customer_name}</div>}
            {order.created_at && <div>🕐 {formatDT(order.created_at)}</div>}
          </div>

          {items.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', fontSize: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.item_name}</div>
                    <div style={{ color: '#6b7db5', fontSize: 12 }}>{item.quantity} × {fmt(item.price)}</div>
                  </div>
                  <div style={{ fontWeight: 800 }}>{fmt(item.line_total)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
            <div style={{ color: '#8fa3cc', fontSize: 14 }}>Итого</div>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 20 }}>{fmt(order.total)}</div>
          </div>

          {/* Форма отзыва для выданных заказов */}
          {order.status === 'completed' && (
            showReview
              ? review
                ? <div style={{ marginTop:16, padding:'12px 14px', borderRadius:12, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>{'⭐'.repeat(review.rating)}</span>
                    {review.comment && <span style={{ color:'#8fa3cc', fontSize:13 }}>{review.comment}</span>}
                  </div>
                : <ReviewForm orderId={order.id} onDone={rating => setReview({ rating, comment:'' })} />
              : <ReviewForm orderId={order.id} onDone={rating => setReview({ rating, comment:'' })} />
          )}
        </div>
      )}
    </main>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#6b7db5' }}>Загрузка…</div>}>
      <Inner />
    </Suspense>
  )
}
