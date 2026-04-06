'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function PrintInner() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id')
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId || !supabase) return
    Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at'),
    ]).then(([{data: o}, {data: i}]) => {
      setOrder(o)
      setItems(i || [])
      setLoading(false)
    })
  }, [orderId])

  useEffect(() => {
    if (!loading && order) {
      setTimeout(() => window.print(), 500)
    }
  }, [loading, order])

  if (loading) return <div style={{ padding:20, fontFamily:'monospace' }}>Загрузка…</div>
  if (!order) return <div style={{ padding:20, fontFamily:'monospace' }}>Заказ не найден</div>

  const num = order.short_number || order.order_number || order.id.slice(0,8)
  const time = new Date(order.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})
  const BRANCH_NAMES = { 'nv-fr-002':'Аэропорт', 'nv-sh-001':'Конечная' }
  const branchName = BRANCH_NAMES[order.branch_id] || order.branch_id || ''

  return (
    <div style={{ fontFamily:"'Courier New',monospace", fontSize:14, padding:10, maxWidth:300, margin:'0 auto', background:'#fff', color:'#000' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:'bold' }}>НА ВИРАЖАХ</div>
        <div style={{ fontSize:12 }}>{branchName}</div>
      </div>
      <div style={{ borderTop:'1px dashed #000', margin:'6px 0' }} />
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:12 }}>ЗАКАЗ</div>
        <div style={{ fontSize:36, fontWeight:'bold', lineHeight:1 }}>{num}</div>
        <div style={{ fontSize:12 }}>{time}</div>
      </div>
      <div style={{ borderTop:'1px dashed #000', margin:'6px 0' }} />
      {order.customer_name && <div>Клиент: <strong>{order.customer_name}</strong></div>}
      {order.comment && <div style={{ fontSize:12 }}>Комм: {order.comment}</div>}
      <div style={{ borderTop:'1px dashed #000', margin:'6px 0' }} />
      {items.map(i => {
        let mods = []
        try { mods = i.modifiers ? (typeof i.modifiers==='string' ? JSON.parse(i.modifiers) : i.modifiers) : [] } catch {}
        return (
          <div key={i.id} style={{ marginBottom:4 }}>
            <div><strong>{i.item_name}</strong> x{i.quantity} — {i.line_total} р.</div>
            {mods.length > 0 && <div style={{ fontSize:12, paddingLeft:10 }}>+ {mods.map(m=>m.name).join(', ')}</div>}
          </div>
        )
      })}
      <div style={{ borderTop:'1px dashed #000', margin:'6px 0' }} />
      <div style={{ textAlign:'center', fontSize:18, fontWeight:'bold' }}>ИТОГО: {order.total} р.</div>

      {/* Кнопка для ручной печати если авто не сработало */}
      <div style={{ marginTop:20, textAlign:'center' }} className="no-print">
        <button onClick={()=>window.print()} style={{ padding:'10px 24px', fontSize:16, background:'#ff6b35', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:'bold' }}>
          🖨️ Печать
        </button>
        <div style={{ marginTop:10 }}>
          <button onClick={()=>window.close()} style={{ padding:'8px 20px', fontSize:14, background:'#eee', color:'#333', border:'none', borderRadius:10, cursor:'pointer' }}>
            Закрыть
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 5mm; size: 80mm auto; }
          body { width: 80mm; }
        }
      `}</style>
    </div>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div style={{ padding:20 }}>Загрузка…</div>}>
      <PrintInner />
    </Suspense>
  )
}
