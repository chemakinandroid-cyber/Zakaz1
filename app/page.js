"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  STORAGE_KEYS, branches, categories, items,
  MAX_ACTIVE_ORDERS, fmt, safeLoad, orderAllowed, formatDateTime, getSuggestions
} from "@/lib/data";

const T = {
  bg:      "#111212",
  surface: "#1a1c1c",
  card:    "#222424",
  card2:   "#2a2c2c",
  border:  "#333535",
  text:    "#f4f4f2",
  muted:   "#7a7e7e",
  accent:  "#4ade80",
  accentD: "#22c55e",
  accentBg:"rgba(74,222,128,.1)",
  red:     "#f87171",
  redBg:   "rgba(248,113,113,.12)",
};

const FOOD_EMOJIS = {
  "Шаурма в лаваше": "🌯", "Бургеры": "🍔", "Хот-доги": "🌭",
  "Шашлык": "🍢", "Блюда во фритюре": "🍟", "Напитки": "🥤",
};
const ITEM_EMOJIS = {
  shawarma1: "🌯", shawarma2: "🌶️", burger1: "🍗", burger2: "🧀",
  hotdog1: "🌭", fries: "🍟", shashlik: "🔥", mors: "🫐",
};

function useMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const run = () => setM(window.innerWidth < 900);
    run();
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, []);
  return m;
}

function Badge({ children, color = "rgba(74,222,128,.1)", textColor = "#4ade80" }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      background: color, color: textColor, fontSize: 11, fontWeight: 700,
      letterSpacing: ".4px", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    new:       ["ждёт звонка",  "rgba(248,113,113,.12)", "#f87171"],
    accepted:  ["подтверждён",  "rgba(74,222,128,.1)",   "#4ade80"],
    preparing: ["готовится",    "rgba(251,191,36,.12)",  "#fbbf24"],
    ready:     ["готов!",       "rgba(74,222,128,.1)",   "#4ade80"],
    completed: ["выдан",        "#1a1a1a",               "#7a7e7e"],
    canceled:  ["отменён",      "rgba(248,113,113,.12)", "#f87171"],
    no_show:   ["не забран",    "rgba(248,113,113,.12)", "#f87171"],
  };
  const [label, bg, color] = MAP[status] || [status, "#222", "#7a7e7e"];
  return <Badge color={bg} textColor={color}>{label}</Badge>;
}

function FoodThumb({ item, size = 76 }) {
  const emoji = ITEM_EMOJIS[item.id] || FOOD_EMOJIS[item.category] || "🍽️";
  const gradients = {
    "Шаурма в лаваше": "linear-gradient(135deg,#3d2c1e,#5a3820)",
    "Бургеры":          "linear-gradient(135deg,#2c1e0f,#4a2e10)",
    "Хот-доги":         "linear-gradient(135deg,#2a1a0e,#3d2a15)",
    "Шашлык":           "linear-gradient(135deg,#2c1a0a,#4a2800)",
    "Блюда во фритюре": "linear-gradient(135deg,#2a2000,#3d3200)",
    "Напитки":          "linear-gradient(135deg,#0e2a1a,#103d28)",
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: 16, flexShrink: 0,
      background: gradients[item.category] || "#222",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.44, border: "1px solid #333535",
    }}>
      {emoji}
    </div>
  );
}

function DishCard({ item, favorite, onFav, onAdd }) {
  return (
    <div style={{
      background: "#222424", border: "1px solid #333535",
      borderRadius: 20, padding: 16,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <FoodThumb item={item} size={76} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f4f4f2", lineHeight: 1.3 }}>{item.name}</div>
            <button
              type="button"
              onClick={onFav}
              style={{ border: "none", background: "none", cursor: "pointer", flexShrink: 0, padding: 2, fontSize: 18, lineHeight: 1, color: favorite ? "#f87171" : "#7a7e7e" }}
            >
              {favorite ? "♥" : "♡"}
            </button>
          </div>
          {item.variant && <div style={{ marginTop: 3, color: "#7a7e7e", fontSize: 13 }}>{item.variant}</div>}
          {item.description && <div style={{ marginTop: 4, color: "#7a7e7e", fontSize: 12, lineHeight: 1.4 }}>{item.description}</div>}
          {item.badge && (
            <div style={{ marginTop: 6 }}>
              <Badge
                color={item.badge === "Острое" ? "rgba(239,68,68,.15)" : "rgba(74,222,128,.1)"}
                textColor={item.badge === "Острое" ? "#ef4444" : "#4ade80"}
              >{item.badge}</Badge>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f4f4f2" }}>{fmt(item.price)}</div>
        <button
          type="button"
          onClick={onAdd}
          style={{
            border: "none", cursor: "pointer", borderRadius: 14,
            background: "#4ade80", color: "#111", padding: "10px 18px",
            fontSize: 14, fontWeight: 800,
          }}
        >
          + В корзину
        </button>
      </div>
    </div>
  );
}

function CartRow({ item, onInc, onDec }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #333535" }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: "#2a2c2c", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>
        {ITEM_EMOJIS[item.itemId] || "🍽️"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f4f2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
        {item.variant && <div style={{ fontSize: 12, color: "#7a7e7e" }}>{item.variant}</div>}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginTop: 2 }}>{fmt(item.price)} × {item.qty}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button type="button" onClick={onDec} style={{ border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 10, background: "#2a2c2c", color: "#f4f4f2", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <div style={{ minWidth: 22, textAlign: "center", fontSize: 15, fontWeight: 800, color: "#f4f4f2" }}>{item.qty}</div>
        <button type="button" onClick={onInc} style={{ border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 10, background: "#4ade80", color: "#111", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
    </div>
  );
}

export default function Page() {
  const mobile = useMobile();
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0].id);
  const [activeCategory, setActiveCategory] = useState(categories[0].key);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [clientOrders, setClientOrders] = useState([]);
  const [activeLoadCount, setActiveLoadCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    setSelectedBranchId(safeLoad(STORAGE_KEYS.branch, branches[0].id));
    setFavorites(safeLoad(STORAGE_KEYS.favorites, []));
    setClientOrders(safeLoad(STORAGE_KEYS.client_orders, []));
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.branch, JSON.stringify(selectedBranchId)); }, [selectedBranchId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.client_orders, JSON.stringify(clientOrders)); }, [clientOrders]);

  const branch = branches.find(b => b.id === selectedBranchId);
  const branchOrderAllowed = orderAllowed(branch);

  const loadBranchLoad = async () => {
    const { count } = await supabase.from("orders").select("*", { count: "exact", head: true })
      .eq("branch_id", selectedBranchId).in("status", ["accepted", "preparing", "ready"]);
    setActiveLoadCount(count || 0);
  };

  useEffect(() => {
    loadBranchLoad();
    const ch = supabase.channel("client-load-" + selectedBranchId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "branch_id=eq." + selectedBranchId }, loadBranchLoad)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [selectedBranchId]);

  const disabled = activeLoadCount >= MAX_ACTIVE_ORDERS;

  const filtered = useMemo(() =>
    items.filter(i =>
      i.branches.includes(selectedBranchId) &&
      i.category === activeCategory &&
      (i.name + " " + (i.variant || "")).toLowerCase().includes(query.toLowerCase())
    ),
    [selectedBranchId, activeCategory, query]
  );

  const popular = useMemo(() =>
    items.filter(i => i.branches.includes(selectedBranchId) && i.popular).slice(0, 4),
    [selectedBranchId]
  );

  const cartTotal = useMemo(() => cart.reduce((s, x) => s + x.price * x.qty, 0), [cart]);
  const totalCartQty = cart.reduce((s, x) => s + x.qty, 0);

  const lastCartItem = cart.length ? items.find(i => i.id === cart[cart.length - 1].itemId) : null;
  const suggestions = lastCartItem ? getSuggestions(lastCartItem) : [];

  const addToCart = (item) => {
    const cartId = (item.id || item.itemId) + "-" + Date.now();
    setCart(prev => [
      ...prev,
      {
        cartId,
        itemId: item.id || item.itemId,
        name: item.name,
        variant: item.variant || null,
        price: item.price,
        qty: 1,
      }
    ]);
    if (mobile) setCartOpen(true);
  };

  const updateQty = (cartId, delta) => {
    setCart(prev =>
      prev.map(x => x.cartId === cartId ? { ...x, qty: Math.max(0, x.qty + delta) } : x)
          .filter(x => x.qty > 0)
    );
  };

  const doPlaceOrder = async () => {
    if (!cart.length || disabled || !branchOrderAllowed || submitting) return;
    setSubmitting(true);
    const id = "NV-" + Date.now().toString().slice(-6);
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("orders").insert([{
      id, branch_id: branch.id, branch_name: branch.name,
      status: "new", payment_method: "pay_on_pickup", payment_status: "unpaid",
      total: cartTotal, note: "Ожидает звонка клиента для подтверждения", created_at: nowIso,
    }]);
    if (error) { setSubmitting(false); alert("Ошибка отправки заказа"); return; }
    await supabase.from("order_items").insert(cart.map(item => ({
      order_id: id, item_id: item.itemId, name: item.name,
      variant: item.variant || null, price: item.price, qty: item.qty,
    })));
    setClientOrders(prev => [{
      id, branchName: branch.name, branchId: branch.id,
      status: "new", total: cartTotal, createdAt: formatDateTime(nowIso),
    }, ...prev]);
    setCart([]);
    setSubmitting(false);
    setCartOpen(false);
    alert(`Заказ ${id} создан!\n\nПозвоните для подтверждения:\n${branch.name}\n${branch.phone}`);
  };

  const toggleFav = (id) =>
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* ─── SIDEBAR ─── */
  const SidebarContent = () => (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Branch */}
      <div style={{ background: "#1a1c1c", borderRadius: 24, padding: 20, border: "1px solid #333535" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: "#f4f4f2" }}>Точка самовывоза</div>
        <div style={{ display: "grid", gap: 10 }}>
          {branches.map(b => {
            const sel = b.id === selectedBranchId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBranchId(b.id)}
                style={{
                  border: `1.5px solid ${sel ? "#4ade80" : "#333535"}`,
                  borderRadius: 16, padding: 14,
                  background: sel ? "rgba(74,222,128,.1)" : "#222424",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: sel ? "#4ade80" : "#f4f4f2", marginBottom: 6 }}>{b.name}</div>
                <div style={{ fontSize: 13, color: "#7a7e7e" }}>📍 {b.address}</div>
                <div style={{ fontSize: 13, color: "#7a7e7e", marginTop: 4 }}>📞 {b.phone}</div>
                <div style={{ fontSize: 13, color: "#7a7e7e", marginTop: 4 }}>🕐 {b.open} – {b.close}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart */}
      <div style={{ background: "#1a1c1c", borderRadius: 24, padding: 20, border: "1px solid #333535" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f2" }}>Корзина</div>
          {totalCartQty > 0 && (
            <div style={{ background: "rgba(74,222,128,.1)", color: "#4ade80", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 999 }}>
              {totalCartQty} шт.
            </div>
          )}
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "#7a7e7e" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
            <div style={{ fontSize: 14 }}>Добавь блюда из меню</div>
          </div>
        ) : (
          <>
            {cart.map(item => (
              <CartRow
                key={item.cartId}
                item={item}
                onInc={() => updateQty(item.cartId, 1)}
                onDec={() => updateQty(item.cartId, -1)}
              />
            ))}

            {suggestions.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7a7e7e", marginBottom: 8 }}>Добавить к заказу</div>
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addToCart(s)}
                    style={{
                      width: "100%", border: "1px dashed #333535", borderRadius: 12,
                      padding: "10px 14px", background: "transparent", color: "#f4f4f2",
                      cursor: "pointer", display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 8, fontSize: 14,
                    }}
                  >
                    <span>{s.name}</span>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>+ {fmt(s.price)}</span>
                  </button>
                ))}
              </div>
            )}

            {disabled && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "rgba(248,113,113,.12)", color: "#f87171", fontSize: 13 }}>
                Кухня перегружена ({activeLoadCount}/{MAX_ACTIVE_ORDERS}). Попробуйте позже.
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid #333535" }}>
              <div style={{ fontSize: 14, color: "#7a7e7e" }}>Итого</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#f4f4f2" }}>{fmt(cartTotal)}</div>
            </div>

            <button
              type="button"
              onClick={doPlaceOrder}
              disabled={disabled || !branchOrderAllowed || submitting}
              style={{
                marginTop: 14, width: "100%", border: "none",
                cursor: disabled || !branchOrderAllowed ? "not-allowed" : "pointer",
                borderRadius: 16, padding: "15px 18px",
                background: disabled || !branchOrderAllowed ? "#2a2c2c" : "#4ade80",
                color: disabled || !branchOrderAllowed ? "#7a7e7e" : "#111",
                fontSize: 16, fontWeight: 800,
                opacity: submitting ? .7 : 1,
              }}
            >
              {submitting ? "Отправляем..." : !branchOrderAllowed ? "Заказы закрыты" : "Оформить заказ"}
            </button>
            <div style={{ marginTop: 8, fontSize: 12, color: "#7a7e7e", textAlign: "center" }}>
              Подтверждение по звонку · самовывоз
            </div>
          </>
        )}
      </div>

      {/* Orders */}
      <div style={{ background: "#1a1c1c", borderRadius: 24, padding: 20, border: "1px solid #333535" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: "#f4f4f2" }}>Мои заказы</div>
        {clientOrders.length === 0 ? (
          <div style={{ color: "#7a7e7e", fontSize: 14, textAlign: "center", padding: "12px 0" }}>Заказов пока нет</div>
        ) : clientOrders.map(o => (
          <div key={o.id} style={{ padding: "12px 0", borderBottom: "1px solid #333535" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f2" }}>{o.id}</div>
                <div style={{ fontSize: 12, color: "#7a7e7e", marginTop: 2 }}>{o.branchName}</div>
                <div style={{ fontSize: 12, color: "#7a7e7e", marginTop: 2 }}>{o.createdAt}</div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: "#f4f4f2" }}>{fmt(o.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #111212; color: #f4f4f2; font-family: 'Nunito', 'Segoe UI', sans-serif; }
        button { font-family: inherit; }
        input { font-family: inherit; }
        input:focus { outline: none; border-color: #4ade80 !important; }
        input::placeholder { color: #7a7e7e; }
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
      `}</style>

      {/* Mobile cart sheet */}
      {mobile && cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 99, backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
            background: "#1a1c1c", borderRadius: "24px 24px 0 0",
            padding: "20px 20px 36px", maxHeight: "88vh", overflowY: "auto",
            border: "1px solid #333535", borderBottom: "none",
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#333535", margin: "0 auto 20px" }} />
            <SidebarContent />
          </div>
        </>
      )}

      <div style={{ minHeight: "100vh", background: "#111212" }}>
        {/* NAV */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(17,18,18,.92)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid #333535",
        }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏎️</div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>На Виражах</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!mobile && (
                <a href="/admin" style={{ textDecoration: "none", color: "#7a7e7e", background: "#222424", border: "1px solid #333535", padding: "8px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                  ⚙️ Админка
                </a>
              )}
              {mobile && (
                <button type="button" onClick={() => setCartOpen(true)} style={{
                  border: "none", cursor: "pointer", background: "#4ade80", borderRadius: 14,
                  padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
                  color: "#111", fontWeight: 800, fontSize: 14,
                }}>
                  🛒 {totalCartQty > 0 ? `${totalCartQty} · ${fmt(cartTotal)}` : "Корзина"}
                </button>
              )}
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "16px 14px" : "24px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1fr) 370px", gap: 24, alignItems: "start" }}>

            {/* LEFT */}
            <div style={{ display: "grid", gap: 20 }}>

              {/* PROMO */}
              <div style={{
                borderRadius: 24, padding: "22px 24px",
                background: "linear-gradient(120deg,#1a3a28,#0e2a1a)",
                border: "1px solid rgba(74,222,128,.2)",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Каждый день</div>
                  <div style={{ fontSize: mobile ? 22 : 28, fontWeight: 900, lineHeight: 1.2, color: "#f4f4f2" }}>Счастливые часы</div>
                  <div style={{ marginTop: 8, color: "rgba(244,244,242,.7)", fontSize: 14 }}>Ежедневно 10:00–13:00 · скидка 10%</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#7a7e7e" }}>Подтверждение по звонку · самовывоз</div>
                </div>
                <div style={{ fontSize: mobile ? 52 : 68, flexShrink: 0 }}>⏰</div>
              </div>

              {/* SEARCH */}
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</div>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Поиск блюд..."
                  style={{
                    width: "100%", border: "1.5px solid #333535",
                    background: "#1a1c1c", color: "#f4f4f2", borderRadius: 16,
                    padding: "14px 16px 14px 46px", fontSize: 15,
                  }}
                />
              </div>

              {/* CATEGORIES */}
              <div style={{ background: "#1a1c1c", borderRadius: 24, padding: 20, border: "1px solid #333535" }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: "#f4f4f2" }}>Категории</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${mobile ? 3 : 6}, 1fr)`, gap: 10 }}>
                  {categories.map(c => {
                    const active = activeCategory === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setActiveCategory(c.key)}
                        style={{
                          border: `1.5px solid ${active ? "#4ade80" : "#333535"}`,
                          borderRadius: 18, padding: "14px 6px", cursor: "pointer",
                          background: active ? "rgba(74,222,128,.1)" : "#222424",
                          color: active ? "#4ade80" : "#7a7e7e",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        }}
                      >
                        <div style={{ fontSize: 26 }}>{c.emoji}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>{c.key}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* POPULAR */}
              <div style={{ background: "#1a1c1c", borderRadius: 24, padding: 20, border: "1px solid #333535" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f2" }}>🔥 Популярное</div>
                  <div style={{ fontSize: 13, color: "#7a7e7e" }}>Сейчас заказывают</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
                  {popular.map(item => (
                    <DishCard key={item.id} item={item}
                      favorite={favorites.includes(item.id)}
                      onFav={() => toggleFav(item.id)}
                      onAdd={() => addToCart(item)} />
                  ))}
                </div>
              </div>

              {/* MENU */}
              <div style={{ background: "#1a1c1c", borderRadius: 24, padding: 20, border: "1px solid #333535" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f2" }}>
                    {categories.find(c => c.key === activeCategory)?.emoji} {activeCategory}
                  </div>
                  <div style={{ fontSize: 13, color: "#7a7e7e" }}>{filtered.length} позиций</div>
                </div>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#7a7e7e" }}>
                    <div style={{ fontSize: 36 }}>🔍</div>
                    <div style={{ marginTop: 10, fontSize: 14 }}>Ничего не найдено</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
                    {filtered.map(item => (
                      <DishCard key={item.id} item={item}
                        favorite={favorites.includes(item.id)}
                        onFav={() => toggleFav(item.id)}
                        onAdd={() => addToCart(item)} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT (desktop) */}
            {!mobile && (
              <div style={{ position: "sticky", top: 76 }}>
                <SidebarContent />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
