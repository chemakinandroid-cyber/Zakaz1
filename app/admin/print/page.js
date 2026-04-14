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
      setTimeout(() => window.print(), 600)
    }
  }, [loading, order])

  if (loading) return <div style={{ padding:10, fontFamily:'monospace', fontSize:12 }}>...</div>
  if (!order) return <div style={{ padding:10, fontFamily:'monospace', fontSize:12 }}>Не найден</div>

  const num = order.short_number || order.order_number || order.id.slice(0,8)
  const time = new Date(order.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})
  const date = new Date(order.created_at).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})
  const BRANCH_NAMES = { 'nv-fr-002':'Аэропорт', 'nv-sh-001':'Конечная' }
  const branchName = BRANCH_NAMES[order.branch_id] || ''

  // Разделитель на 24 символа (ширина 48мм ~24 символа шрифтом 12x24)
  const SEP = '------------------------'

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.4;
          width: 48mm;
          padding: 2mm;
          background: #fff;
          color: #000;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .big { font-size: 28px; font-weight: bold; letter-spacing: 2px; }
        .medium { font-size: 16px; font-weight: bold; }
        .sep { border: none; border-top: 1px dashed #000; margin: 3px 0; }
        .row { display: flex; justify-content: space-between; gap: 4px; }
        .row .name { flex: 1; word-break: break-word; }
        .row .price { flex-shrink: 0; font-weight: bold; }
        .mod { font-size: 11px; padding-left: 8px; }
        .total-row { font-size: 15px; font-weight: bold; }
        .no-print { margin-top: 8mm; text-align: center; }
        @media print {
          .no-print { display: none !important; }
          @page {
            margin: 0;
            size: 48mm auto;
          }
          body { width: 48mm; padding: 1mm 2mm; }
        }
      `}</style>

      <div class="center bold" style={{fontSize:14}}>НА ВИРАЖАХ</div>
      <div class="center" style={{fontSize:11}}>{branchName}</div>
      <hr class="sep" />

      <div class="center" style={{fontSize:11}}>ЗАКАЗ</div>
      <div class="center big">{num}</div>
      <div class="center" style={{fontSize:11}}>{date} {time}</div>
      <hr class="sep" />

      {order.customer_name && (
        <div><span style={{fontSize:11}}>Клиент: </span><span class="bold">{order.customer_name}</span></div>
      )}
      {order.comment && (
        <div style={{fontSize:11}}>Комм: {order.comment}</div>
      )}
      {(order.customer_name || order.comment) && <hr class="sep" />}

      {items.map(i => {
        let mods = []
        try { mods = i.modifiers ? (typeof i.modifiers==='string' ? JSON.parse(i.modifiers) : i.modifiers) : [] } catch {}
        return (
          <div key={i.id} style={{marginBottom:3}}>
            <div class="row">
              <span class="name">{i.item_name} x{i.quantity}</span>
              <span class="price">{i.line_total}р</span>
            </div>
            {mods.length > 0 && (
              <div class="mod">+{mods.map(m=>m.name).join(', ')}</div>
            )}
          </div>
        )
      })}

      <hr class="sep" />
      <div class="row total-row">
        <span>ИТОГО:</span>
        <span>{order.total} р.</span>
      </div>
      <hr class="sep" />
      <div class="center" style={{fontSize:10, marginTop:2}}>Спасибо за заказ!</div>

      <div className="no-print">
        <button
          onClick={() => window.print()}
          style={{
            padding:'8px 20px', fontSize:14, background:'#ff6b35',
            color:'#fff', border:'none', borderRadius:8,
            cursor:'pointer', fontWeight:'bold', marginBottom:6, display:'block', width:'100%'
          }}
        >🖨️ Печать</button>
        <button
          onClick={() => window.close()}
          style={{
            padding:'6px 20px', fontSize:13, background:'#eee',
            color:'#333', border:'none', borderRadius:8,
            cursor:'pointer', display:'block', width:'100%'
          }}
        >Закрыть</button>
      </div>
    </>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div style={{padding:10,fontFamily:'monospace'}}>...</div>}>
      <PrintInner />
    </Suspense>
  )
}
