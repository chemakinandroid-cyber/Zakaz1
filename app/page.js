'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const BRANCHES = [
  { id: 'airport', name: 'На Виражах — Аэропорт' },
  { id: 'konechnaya', name: 'На Виражах — Конечная' },
]

const CATEGORY_LABELS = {
  shawarma: 'Шаурма',
  burgers: 'Бургеры',
  hotdogs: 'Хот-доги',
  shashlik: 'Шашлык',
  quesadilla: 'Кесадилья',
  fryer: 'Фритюр',
  sauces: 'Соусы',
  drinks: 'Напитки',
}

const CATEGORY_ORDER = [
  'shawarma',
  'burgers',
  'hotdogs',
  'shashlik',
  'quesadilla',
  'fryer',
  'sauces',
  'drinks',
]

const cardStyle = {
  background: 'linear-gradient(180deg, #0b1b45 0%, #081531 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
}

function ProductCard({ item }) {
  const isComingSoon = Number(item.price) <= 0

  return (
    <div
      style={{
        ...cardStyle,
        display: 'grid',
        gridTemplateColumns: '110px 1fr',
        gap: 14,
      }}
    >
      <div
        style={{
          height: 110,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #1c2d63, #0e1b40)',
          border: '1px dashed rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9bb0e5',
          fontSize: 12,
          textAlign: 'center',
          padding: 8,
        }}
      >
        Фото
        <br />
        скоро
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.2 }}>
            {item.name}
          </div>

          <div
            style={{
              color: isComingSoon ? '#9bb0e5' : '#ffb347',
              fontWeight: 800,
              fontSize: 22,
              whiteSpace: 'nowrap',
            }}
          >
            {isComingSoon ? '—' : `${item.price} ₽`}
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            color: '#d9e4ff',
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          {item.description || 'Описание скоро добавим'}
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(255,179,71,0.15)',
              color: '#ffd08a',
            }}
          >
            {CATEGORY_LABELS[item.category] || item.category}
          </span>

          {isComingSoon ? (
            <span
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(155,176,229,0.15)',
                color: '#9bb0e5',
              }}
            >
              Скоро в продаже
            </span>
          ) : null}

          <button
            disabled={isComingSoon}
            style={{
              marginLeft: 'auto',
              border: 0,
              borderRadius: 12,
              background: isComingSoon ? '#475569' : '#22c55e',
              color: '#071432',
              fontWeight: 700,
              padding: '10px 14px',
              cursor: isComingSoon ? 'not-allowed' : 'pointer',
              opacity: isComingSoon ? 0.6 : 1,
            }}
          >
            В корзину
          </button>
        </div>
      </div>
    </div>
  )
}

function AccordionSection({ title, items, open, onToggle }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          background: '#f4a01d',
          color: '#111',
          border: 0,
          borderRadius: 14,
          padding: '14px 16px',
          fontWeight: 800,
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        {title} {open ? '−' : '+'}
      </button>

      {open ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default function Page() {
  const [branch, setBranch] = useState('airport')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [openMap, setOpenMap] = useState({
    shawarma: true,
    burgers: true,
    hotdogs: true,
    shashlik: false,
    quesadilla: false,
    fryer: true,
    sauces: false,
    drinks: false,
  })

  useEffect(() => {
    let active = true

    async function loadMenu() {
      setLoading(true)
      setErrorText('')

      if (!supabase) {
        if (!active) return
        setItems([])
        setErrorText('Supabase не подключен')
        setLoading(false)
        return
      }

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true })

      if (!active) return

      if (menuError) {
        setItems([])
        setErrorText('Не удалось загрузить меню')
        setLoading(false)
        return
      }

      const { data: stopData, error: stopError } = await supabase
        .from('stop_list')
        .select('menu_item_id, is_stopped')
        .eq('branch_id', branch)

      if (!active) return

      if (stopError) {
        setItems(menuData || [])
        setErrorText('')
        setLoading(false)
        return
      }

      const stoppedIds = new Set(
        (stopData || [])
          .filter((row) => row.is_stopped)
          .map((row) => row.menu_item_id)
      )

      const filteredMenu = (menuData || []).filter(
        (item) => !stoppedIds.has(item.id)
      )

      setItems(filteredMenu)
      setLoading(false)
    }

    loadMenu()

    return () => {
      active = false
    }
  }, [branch])

  const groupedItems = useMemo(() => {
    const grouped = {}

    for (const category of CATEGORY_ORDER) {
      grouped[category] = []
    }

    for (const item of items) {
      const category = item.category || 'other'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    }

    return grouped
  }, [items])

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '18px 14px 48px' }}>
      <div
        style={{
          ...cardStyle,
          padding: 18,
          marginBottom: 18,
          background: 'linear-gradient(135deg, #0f255f 0%, #071432 100%)',
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>
          На Виражах
        </div>

        <div style={{ color: '#cdd9fb', marginBottom: 14 }}>
          Полное меню с фильтрацией по стоп-листу для выбранной точки.
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {BRANCHES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBranch(b.id)}
              style={{
                border:
                  branch === b.id
                    ? '1px solid #f4a01d'
                    : '1px solid rgba(255,255,255,0.1)',
                background:
                  branch === b.id
                    ? 'rgba(244,160,29,0.16)'
                    : 'rgba(255,255,255,0.03)',
                color: '#fff',
                borderRadius: 999,
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {b.name}
            </button>
          ))}

          <a
            href="/order"
            style={{
              marginLeft: 'auto',
              color: '#9fd4ff',
              textDecoration: 'none',
              alignSelf: 'center',
            }}
          >
            Отследить заказ
          </a>

          <a
            href="/admin"
            style={{
              color: '#9fd4ff',
              textDecoration: 'none',
              alignSelf: 'center',
            }}
          >
            Админка
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#cdd9fb', padding: '8px 4px 18px' }}>
          Загрузка меню...
        </div>
      ) : null}

      {!loading && errorText ? (
        <div style={{ color: '#ffb4b4', padding: '8px 4px 18px' }}>
          {errorText}
        </div>
      ) : null}

      {!loading &&
        CATEGORY_ORDER.map((categoryKey) => {
          const categoryItems = groupedItems[categoryKey] || []
          if (!categoryItems.length) return null

          return (
            <AccordionSection
              key={categoryKey}
              title={CATEGORY_LABELS[categoryKey] || categoryKey}
              items={categoryItems}
              open={!!openMap[categoryKey]}
              onToggle={() =>
                setOpenMap((prev) => ({
                  ...prev,
                  [categoryKey]: !prev[categoryKey],
                }))
              }
            />
          )
        })}
    </main>
  )
}
