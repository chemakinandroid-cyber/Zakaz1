'use client'

import { useState } from 'react'

const BRANCHES = [
  {
    id: 'nv-fr-002',
    name: 'Аэропорт',
    fullName: 'На Виражах — Аэропорт',
    address: 'Аэропорт, 7',
    phone: '+7 902 452-42-22',
    hours: '10:00 — 21:00',
    yandexUrl: 'https://yandex.ru/maps/?text=Улан-Удэ+Аэропорт+7&z=16',
    yandexEmbed: 'https://yandex.ru/map-widget/v1/?text=Улан-Удэ%2C+Аэропорт%2C+7&z=16&l=map',
  },
  {
    id: 'nv-sh-001',
    name: 'Конечная',
    fullName: 'На Виражах — Конечная',
    address: 'Конечная, 10/4',
    phone: '+7 908 593-26-88',
    hours: '10:00 — 22:00',
    yandexUrl: 'https://yandex.ru/maps/?text=Улан-Удэ+Конечная+10/4&z=16',
    yandexEmbed: 'https://yandex.ru/map-widget/v1/?text=Улан-Удэ%2C+Конечная%2C+10%2F4&z=16&l=map',
  },
]

export default function WherePage() {
  const [active, setActive] = useState(0)
  const branch = BRANCHES[active]

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '16px 12px 40px' }}>

      {/* Шапка */}
      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ color: '#6b8ecf', fontSize: 14, textDecoration: 'none' }}>← Меню</a>
        <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 22, marginTop: 12 }}>
          Как нас найти
        </div>
      </div>

      {/* Переключатель точек */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {BRANCHES.map((b, i) => (
          <button key={b.id} onClick={() => setActive(i)} style={{
            border: active === i ? '2px solid #f4a01d' : '1px solid rgba(255,255,255,0.1)',
            background: active === i ? 'rgba(244,160,29,0.12)' : 'rgba(255,255,255,0.03)',
            color: active === i ? '#f4a01d' : '#c8d5f5',
            borderRadius: 999, padding: '9px 20px',
            fontFamily: "'Onest',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>{b.name}</button>
        ))}
      </div>

      {/* Карточка точки */}
      <div style={{ background: 'linear-gradient(160deg,#0d1f4e,#07122e)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>

        {/* Яндекс карта */}
        <div style={{ height: 280, background: '#0a1628', position: 'relative' }}>
          <iframe
            src={branch.yandexEmbed}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            style={{ border: 'none', display: 'block' }}
            title={branch.fullName}
          />
        </div>

        {/* Информация */}
        <div style={{ padding: '16px 18px' }}>
          <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 14, color: '#f4a01d' }}>
            {branch.fullName}
          </div>

          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <span style={{ color: '#c8d5f5' }}>{branch.address}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>🕐</span>
              <span style={{ color: '#c8d5f5' }}>Работаем {branch.hours}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>📞</span>
              <a href={`tel:${branch.phone.replace(/\s/g,'')}`} style={{ color: '#f4a01d', textDecoration: 'none', fontWeight: 700 }}>
                {branch.phone}
              </a>
            </div>
          </div>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={branch.yandexUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, minWidth: 160,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 12,
                background: '#f4a01d', color: '#07122e',
                fontFamily: "'Onest',sans-serif", fontWeight: 700, fontSize: 14,
                textDecoration: 'none',
              }}
            >
              🗺 Открыть в Яндекс.Картах
            </a>
            <a
              href={`tel:${branch.phone.replace(/\s/g,'')}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: '#c8d5f5',
                fontFamily: "'Onest',sans-serif", fontWeight: 700, fontSize: 14,
                textDecoration: 'none',
              }}
            >
              📞 Позвонить
            </a>
          </div>
        </div>
      </div>

      {/* Ссылка на меню */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <a href="/" style={{
          display: 'inline-block', padding: '13px 32px', borderRadius: 14,
          background: '#22c55e', color: '#07122e',
          fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 15,
          textDecoration: 'none',
        }}>
          Сделать заказ →
        </a>
      </div>
    </main>
  )
}
