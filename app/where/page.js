'use client'

import { useState } from 'react'

const C = { orange:'#ff6b35', orangeLight:'#fff0ea', orangeDark:'#e5501a', bg:'#f7f3ee', card:'#ffffff', text:'#1a1a1a', muted:'#8a8a8a', border:'#f0ebe4' }

const BRANCHES = [
  {
    id: 'nv-fr-002',
    name: 'Аэропорт',
    fullName: 'На Виражах — Аэропорт',
    address: 'мкр. Аэропорт, 7',
    phone: '+7 902 452-42-22',
    hours: '10:00 — 21:00',
    cutoff: 'Приём заказов до 20:30',
    yandexUrl: 'https://yandex.ru/maps/?text=Улан-Удэ%2C+микрорайон+Аэропорт%2C+7&z=17',
    yandexEmbed: 'https://yandex.ru/map-widget/v1/?text=Улан-Удэ%2C+микрорайон+Аэропорт%2C+7&z=17&l=map',
  },
  {
    id: 'nv-sh-001',
    name: 'Конечная',
    fullName: 'На Виражах — Конечная',
    address: '47-й квартал, ул. Конечная, 10, корп. 4',
    phone: '+7 908 593-26-88',
    hours: '10:00 — 22:00',
    cutoff: 'Приём заказов до 21:30',
    yandexUrl: 'https://yandex.ru/maps/?text=Улан-Удэ%2C+47+квартал%2C+Конечная+улица%2C+10%2C+корпус+4&z=17',
    yandexEmbed: 'https://yandex.ru/map-widget/v1/?text=Улан-Удэ%2C+47+квартал%2C+Конечная+улица%2C+10%2C+корпус+4&z=17&l=map',
  },
]

export default function WherePage() {
  const [active, setActive] = useState(0)
  const branch = BRANCHES[active]

  return (
    <main style={{ maxWidth:680, margin:'0 auto', padding:'24px 14px 60px', background:C.bg, minHeight:'100vh' }}>

      {/* Шапка */}
      <div style={{ marginBottom:24 }}>
        <a href="/" style={{ color:C.orange, fontSize:14, textDecoration:'none', fontWeight:700 }}>← Меню</a>
        <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:26, marginTop:12, color:C.text }}>
          Как нас найти
        </div>
      </div>

      {/* Переключатель */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {BRANCHES.map((b,i) => (
          <button key={b.id} onClick={()=>setActive(i)} style={{
            border: active===i ? `2px solid ${C.orange}` : '2px solid #e8e0d8',
            background: active===i ? C.orangeLight : '#fff',
            color: active===i ? C.orange : C.muted,
            borderRadius:999, padding:'9px 22px',
            fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:'pointer',
            transition:'all 0.15s',
          }}>{b.name}</button>
        ))}
      </div>

      {/* Карточка */}
      <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>

        {/* Карта */}
        <div style={{ height:280, background:'#f0ebe4' }}>
          <iframe
            src={branch.yandexEmbed}
            width="100%" height="100%"
            frameBorder="0" allowFullScreen
            style={{ border:'none', display:'block' }}
            title={branch.fullName}
          />
        </div>

        {/* Инфо */}
        <div style={{ padding:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:18, color:C.orange, marginBottom:16 }}>
            {branch.fullName}
          </div>

          <div style={{ display:'grid', gap:12, marginBottom:20 }}>
            {[
              { icon:'📍', label:'Адрес', value:branch.address },
              { icon:'🕐', label:'Работаем', value:branch.hours },
              { icon:'🛑', label:'Заказы', value:branch.cutoff },
            ].map(row=>(
              <div key={row.label} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 14px', borderRadius:12, background:'#fafaf8', border:`1.5px solid ${C.border}` }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{row.icon}</span>
                <div>
                  <div style={{ fontSize:12, color:C.muted, fontWeight:600 }}>{row.label}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginTop:2 }}>{row.value}</div>
                </div>
              </div>
            ))}
            <div style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 14px', borderRadius:12, background:C.orangeLight, border:`1.5px solid #ffd4c2` }}>
              <span style={{ fontSize:20, flexShrink:0 }}>📞</span>
              <div>
                <div style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Телефон</div>
                <a href={`tel:${branch.phone.replace(/\s/g,'')}`} style={{ fontSize:14, fontWeight:800, color:C.orange, textDecoration:'none', marginTop:2, display:'block' }}>{branch.phone}</a>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <a href={branch.yandexUrl} target="_blank" rel="noopener noreferrer" style={{
              flex:1, minWidth:160, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'13px 16px', borderRadius:14, background:C.orange, color:'#fff',
              fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, textDecoration:'none',
            }}>🗺 Открыть в Яндекс.Картах</a>
            <a href={`tel:${branch.phone.replace(/\s/g,'')}`} style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'13px 18px', borderRadius:14, border:`2px solid ${C.orange}`,
              background:'transparent', color:C.orange,
              fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, textDecoration:'none',
            }}>📞 Позвонить</a>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign:'center', marginTop:28 }}>
        <a href="/" style={{
          display:'inline-block', padding:'14px 36px', borderRadius:16,
          background:C.orange, color:'#fff',
          fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:15, textDecoration:'none',
          boxShadow:`0 4px 16px rgba(255,107,53,0.3)`,
        }}>Сделать заказ →</a>
      </div>
    </main>
  )
}
