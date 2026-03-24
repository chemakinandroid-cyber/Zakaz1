"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  STORAGE_KEYS, branches, categories, items,
  MAX_ACTIVE_ORDERS, fmt, safeLoad, orderAllowed, formatDateTime, getSuggestions
} from "@/lib/data";

/* ─── THEME ─────────────────────────────────────────────── */
const T = {
  bg:      "#111212",
  surface: "#1a1c1c",
  card:    "#222424",
  card2:   "#2a2c2c",
  border:  "#333535",
  text:    "#f4f4f2",
  muted:   "#7a7e7e",
  accent:  "#4ade80",   // green accent
  accentD: "#22c55e",
  accentBg:"rgba(74,222,128,.1)",
  red:     "#f87171",
  redBg:   "rgba(248,113,113,.12)",
};

/* ─── FOOD EMOJI THUMBNAILS ──────────────────────────────── */
const FOOD_EMOJIS = {
  "Шаурма в лаваше": "🌯",
  "Бургеры": "🍔",
  "Хот-доги": "🌭",
  "Шашлык": "🍢",
  "Блюда во фритюре": "🍟",
  "Напитки": "🥤",
};
const ITEM_EMOJIS = {
  shawarma1: "🌯", shawarma2: "🌶️", burger1: "🍗", burger2: "🧀",
  hotdog1: "🌭", fries: "🍟", shashlik: "🔥", mors: "🫐",
};

/* ─── HOOKS ──────────────────────────────────────────────── */
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

/* ─── SMALL COMPONENTS ───────────────────────────────────── */
function Badge({ children, color = T.accentBg, textColor = T.accent }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      background: color, color: textColor, fontSize: 11, fontWeight: 700,
      letterSpacing: ".4px", textTransform: "uppercase"
    }}>{children}</span>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    new: ["ждёт звонка", T.redBg, T.red],
    accepted: ["подтверждён", T.accentBg, T.accent],
    preparing: ["готовится", "rgba(251,191,36,.12)", "#fbbf24"],
    ready: ["готов!", T.accentBg, T.accent],
    completed: ["выдан", "#1a1a1a", T.muted],
    canceled: ["отменён", T.redBg, T.red],
    no_show: ["не забран", T.redBg, T.red],
  };
  const [label, bg, color] = MAP[status] || [status, T.card2, T.muted];
  return <Badge color={bg} textColor={color}>{label}</Badge>;
}

function Icon({ name, size = 20, color = "currentColor" }) {
  const icons = {
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
    heart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    heartFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    cart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    map: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
    minus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return icons[name] || null;
}

/* ─── FOOD CARD THUMBNAIL ────────────────────────────────── */
function FoodThumb({ item, size = 80 }) {
  const emoji = ITEM_EMOJIS[item.id] || FOOD_EMOJIS[item.category] || "🍽️";
  const gradients = {
    "Шаурма в лаваше": "linear-gradient(135deg,#3d2c1e,#5a3820)",
    "Бургеры": "linear-gradient(135deg,#2c1e0f,#4a2e10)",
    "Хот-доги": "linear-gradient(135deg,#2a1a0e,#3d2a15)",
    "Шашлык": "linear-gradient(135deg,#2c1a0a,#4a2800)",
    "Блюда во фритюре": "linear-gradient(135deg,#2a2000,#3d3200)",
    "Напитки": "linear-gradient(135deg,#0e2a1a,#103d28)",
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: 18, flexShrink: 0,
      background: gradients[item.category] || "#222",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.44, border: `1px solid ${T.border}`,
    }}>
      {emoji}
    </div>
  );
}

/* ─── DISH CARD ──────────────────────────────────────────── */
function DishCard({ item, favorite, onFav, onAdd }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card, border: `1px solid ${hovered ? T.border : "transparent"}`,
        borderRadius: 20, padding: 16, transition: "all .2s",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,.35)" : "none",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <FoodThumb item={item} size={76} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{item.name}</div>
            <button onClick={onFav} style={{ border: "none", background: "none", cursor: "pointer", flexShrink: 0, color: favorite ? T.red : T.muted, padding: 2, lineHeight: 0 }}>
              <Icon name={favorite ? "heartFill" : "heart"} size={18} color={favorite ? T.red : T.muted} />
            </button>
          </div>
          {item.variant && <div style={{ marginTop: 3, color: T.muted, fontSize: 13 }}>{item.variant}</div>}
          {item.description && <div style={{ marginTop: 4, color: T.muted, fontSize: 12, lineHeight: 1.4 }}>{item.description}</div>}
          {item.badge && (
            <div style={{ marginTop: 6 }}>
              <Badge color={item.badge === "Острое" ? "rgba(239,68,68,.15)" : T.accentBg}
                     textColor={item.badge === "Острое" ? "#ef4444" : T.accent}>
                {item.badge}
              </Badge>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{fmt(item.price)}</div>
        <button onClick={onAdd} style={{
          border: "none", cursor: "pointer", borderRadius: 14,
          background: T.accent, color: "#111", padding: "10px 18px",
          fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 6,
          transition: "opacity .15s",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <Icon name="plus" size={16} color="#111" /> В корзину
        </button>
      </div>
    </div>
  );
}

/* ─── CART ITEM ──────────────────────────────────────────── */
function CartItem({ item, onInc, onDec }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, background: T.card2, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
      }}>
        {ITEM_EMOJIS[item.itemId] || "🍽️"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
        {item.variant && <div style={{ fontSize: 12, color: T.muted }}>{item.variant}</div>}
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginTop: 2 }}>{fmt(item.price)} × {item.qty}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={onDec} style={{ border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 10, background: T.card2, color: T.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="minus" size={14} color={T.text} />
        </button>
        <div style={{ minWidth: 20, textAlign: "center", fontSize: 15, fontWeight: 800 }}>{item.qty}</div>
        <button onClick={onInc} style={{ border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 10, background: T.accent, color: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={14} color="#111" />
        </button>
      </div>
    </div>
  );
}

/* ─── SECTION HEADER ─────────────────────────────────────── */
function SectionHeader({ title, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: T.muted }}>{sub}</div>}
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────── */
export default function Page() {
  const mobile = useMobile();
  const [tab, setTab] = useState("menu"); // menu | orders | favorites
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
  const filtered = useMemo(() => items.filter(i =>
    i.branches.includes(selectedBranchId) &&
    i.category === activeCategory &&
    (i.name + " " + (i.variant || "")).toLowerCase().includes(query.toLowerCase())
  ), [selectedBranchId, activeCategory, query]);

  const popular = useMemo(() => items.filter(i => i.branches.includes(selectedBranchId) && i.popular).slice(0, 4), [selectedBranchId]);
  const favoriteItems = useMemo(() => items.filter(i => favorites.includes(i.id)), [favorites]);
  const cartTotal = useMemo(() => cart.reduce((s, x) => s + x.totalPrice * x.qty, 0), [cart]);
  const suggestions = cart.length ? getSuggestions(items.find(i => i.id === cart[cart.length - 1].itemId)) : [];
  const totalCartQty = cart.reduce((s, x) => s + x.qty, 0);

  const addToCart = (item) => {
    setCart(prev => [...prev, {
      cartId: item.id + "-" + Date.now(),
      itemId: item.id, name: item.name, variant: item.variant,
      price: item.price, qty: 1, totalPrice: item.price,
    }]);
    if (mobile) setCartOpen(true);
  };

  const updateQty = (cartId, delta) => {
    setCart(prev => prev.map(x => x.cartId === cartId ? { ...x, qty: Math.max(0, x.qty + delta) } : x).filter(x => x.qty > 0));
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
    setClientOrders(prev => [{ id, branchName: branch.name, branchId: branch.id, status: "new", total: cartTotal, createdAt: formatDateTime(nowIso) }, ...prev]);
    setCart([]);
    setSubmitting(false);
    setCartOpen(false);
    alert(`Заказ ${id} создан!\n\nПозвоните для подтверждения:\n${branch.name}\n${branch.phone}`);
  };

  const toggleFav = (id) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* ── SIDEBAR / RIGHT PANEL ── */
  const Sidebar = () => (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Branch selector */}
      <div style={{ background: T.surface, borderRadius: 24, padding: 20, border: `1px solid ${T.border}` }}>
        <SectionHeader title="Точка самовывоза" />
        <div style={{ display: "grid", gap: 10 }}>
          {branches.map(b => {
            const selected = b.id === selectedBranchId;
            return (
              <button key={b.id} onClick={() => setSelectedBranchId(b.id)} style={{
                border: `1.5px solid ${selected ? T.accent : T.border}`,
                borderRadius: 16, padding: 14, background: selected ? T.accentBg : T.card,
                cursor: "pointer", textAlign: "left", transition: "all .18s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Icon name="map" size={15} color={selected ? T.accent : T.muted} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: selected ? T.accent : T.text }}>{b.name}</div>
                </div>
                <div style={{ fontSize: 13, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="map" size={13} color={T.muted} /> {b.address}
                </div>
                <div style={{ marginTop: 5, fontSize: 13, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="phone" size={13} color={T.muted} /> {b.phone}
                </div>
                <div style={{ marginTop: 5, fontSize: 13, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="clock" size={13} color={T.muted} /> {b.open} – {b.close}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart */}
      <div style={{ background: T.surface, borderRadius: 24, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Корзина</div>
          {cart.length > 0 && (
            <div style={{ background: T.accentBg, color: T.accent, fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 999 }}>
              {totalCartQty} шт.
            </div>
          )}
        </div>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: T.muted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🛒</div>
            <div style={{ fontSize: 14 }}>Добавь блюда из меню</div>
          </div>
        ) : (
          <>
            <div>
              {cart.map(item => (
                <CartItem key={item.cartId} item={item}
                  onInc={() => updateQty(item.cartId, 1)}
                  onDec={() => updateQty(item.cartId, -1)} />
              ))}
            </div>

            {suggestions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 8 }}>Добавить к заказу</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => addToCart({ id: s.id, name: s.name, price: s.price, category: "Добавки" })} style={{
                      border: `1px dashed ${T.border}`, borderRadius: 12, padding: "10px 14px",
                      background: "transparent", color: T.text, cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 14 }}>{s.name}</span>
                      <span style={{ fontSize: 13, color: T.accent, fontWeight: 700 }}>+ {fmt(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {disabled && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: T.redBg, color: T.red, fontSize: 13 }}>
                Кухня перегружена: {activeLoadCount}/{MAX_ACTIVE_ORDERS} заказов. Попробуйте позже.
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 15, color: T.muted }}>Итого</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: T.text }}>{fmt(cartTotal)}</div>
            </div>

            <button onClick={doPlaceOrder} disabled={disabled || !branchOrderAllowed || submitting} style={{
              marginTop: 14, width: "100%", border: "none", cursor: disabled || !branchOrderAllowed ? "not-allowed" : "pointer",
              borderRadius: 16, padding: "16px 18px",
              background: disabled || !branchOrderAllowed ? T.card2 : T.accent,
              color: disabled || !branchOrderAllowed ? T.muted : "#111",
              fontSize: 16, fontWeight: 800, transition: "opacity .15s",
              opacity: submitting ? .7 : 1,
            }}>
              {submitting ? "Отправляем..." : !branchOrderAllowed ? "Заказы закрыты" : "Оформить заказ"}
            </button>
            <div style={{ marginTop: 10, fontSize: 12, color: T.muted, textAlign: "center" }}>
              Подтверждение по звонку · самовывоз
            </div>
          </>
        )}
      </div>

      {/* My Orders */}
      <div style={{ background: T.surface, borderRadius: 24, padding: 20, border: `1px solid ${T.border}` }}>
        <SectionHeader title="Мои заказы" />
        {clientOrders.length === 0 ? (
          <div style={{ color: T.muted, fontSize: 14, textAlign: "center", padding: "16px 0" }}>Заказов пока нет</div>
        ) : clientOrders.map(o => (
          <div key={o.id} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{o.id}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{o.branchName}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{o.createdAt}</div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: T.text }}>{fmt(o.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── MOBILE CART SHEET ── */
  const CartSheet = () => (
    <>
      <div onClick={() => setCartOpen(false)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 99,
        backdropFilter: "blur(4px)",
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: T.surface, borderRadius: "24px 24px 0 0",
        padding: "20px 20px 32px", maxHeight: "85vh", overflowY: "auto",
        border: `1px solid ${T.border}`, borderBottom: "none",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 20px" }} />
        <Sidebar />
      </div>
    </>
  );

  /* ── LAYOUT ── */
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${T.bg}; color: ${T.text}; font-family: 'Nunito', 'Segoe UI', sans-serif; }
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${T.bg}; } ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        button { font-family: inherit; }
        input { font-family: inherit; }
        input::placeholder { color: ${T.muted}; }
        input:focus { outline: none; border-color: ${T.accent} !important; }
      `}</style>

      {mobile && cartOpen && <CartSheet />}

      <div style={{ minHeight: "100vh", background: T.bg }}>
        {/* TOP NAV */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: T.bg + "ee", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${T.border}`,
          padding: "0 20px",
        }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏎️</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-.3px" }}>На Виражах</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!mobile && (
                <a href="/admin" style={{
                  textDecoration: "none", color: T.muted, background: T.card,
                  border: `1px solid ${T.border}`, padding: "8px 14px",
                  borderRadius: 12, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Icon name="settings" size={15} color={T.muted} /> Админка
                </a>
              )}
              {mobile && (
                <button onClick={() => setCartOpen(true)} style={{
                  border: "none", cursor: "pointer", background: T.accent, borderRadius: 14,
                  padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
                  color: "#111", fontWeight: 800, fontSize: 14, position: "relative",
                }}>
                  <Icon name="cart" size={18} color="#111" />
                  {totalCartQty > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 900 }}>{totalCartQty}</span>
                  )}
                  {cartTotal > 0 && <span>{fmt(cartTotal)}</span>}
                </button>
              )}
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "16px 14px" : "24px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1fr) 380px", gap: 24, alignItems: "start" }}>

            {/* LEFT: MAIN CONTENT */}
            <div style={{ display: "grid", gap: 20 }}>

              {/* PROMO BANNER */}
              <div style={{
                borderRadius: 24, padding: "20px 24px",
                background: "linear-gradient(120deg, #1a3a28 0%, #0e2a1a 100%)",
                border: `1px solid rgba(74,222,128,.2)`,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Каждый день</div>
                  <div style={{ fontSize: mobile ? 22 : 28, fontWeight: 900, lineHeight: 1.2 }}>Счастливые часы</div>
                  <div style={{ marginTop: 8, color: "rgba(244,244,242,.7)", fontSize: 14 }}>Ежедневно 10:00–13:00 · скидка 10%</div>
                  <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>Заказ подтверждается по звонку · самовывоз</div>
                </div>
                <div style={{ fontSize: mobile ? 52 : 70, flexShrink: 0 }}>⏰</div>
              </div>

              {/* SEARCH */}
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <Icon name="search" size={18} color={T.muted} />
                </div>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Поиск блюд..."
                  style={{
                    width: "100%", border: `1.5px solid ${T.border}`,
                    background: T.surface, color: T.text, borderRadius: 16,
                    padding: "14px 16px 14px 46px", fontSize: 15, transition: "border-color .2s",
                  }}
                />
              </div>

              {/* CATEGORIES */}
              <div style={{ background: T.surface, borderRadius: 24, padding: 20, border: `1px solid ${T.border}` }}>
                <SectionHeader title="Категории" />
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${mobile ? 3 : 6}, 1fr)`, gap: 10 }}>
                  {categories.map(c => {
                    const active = activeCategory === c.key;
                    return (
                      <button key={c.key} onClick={() => setActiveCategory(c.key)} style={{
                        border: `1.5px solid ${active ? T.accent : T.border}`,
                        borderRadius: 18, padding: "14px 8px", cursor: "pointer",
                        background: active ? T.accentBg : T.card,
                        color: active ? T.accent : T.muted,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        transition: "all .18s",
                      }}>
                        <div style={{ fontSize: 28 }}>{c.emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>{c.key}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* POPULAR */}
              <div style={{ background: T.surface, borderRadius: 24, padding: 20, border: `1px solid ${T.border}` }}>
                <SectionHeader title="🔥 Популярное" sub="Сейчас заказывают" />
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
                  {popular.map(item => (
                    <DishCard key={item.id} item={item}
                      favorite={favorites.includes(item.id)}
                      onFav={() => toggleFav(item.id)}
                      onAdd={() => addToCart(item)} />
                  ))}
                </div>
              </div>

              {/* MENU BY CATEGORY */}
              <div style={{ background: T.surface, borderRadius: 24, padding: 20, border: `1px solid ${T.border}` }}>
                <SectionHeader title={categories.find(c => c.key === activeCategory)?.emoji + " " + activeCategory} sub={filtered.length + " позиций"} />
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: T.muted }}>
                    <div style={{ fontSize: 40 }}>🔍</div>
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

              {/* FAVORITES (mobile tab) */}
              {favoriteItems.length > 0 && (
                <div style={{ background: T.surface, borderRadius: 24, padding: 20, border: `1px solid ${T.border}` }}>
                  <SectionHeader title="♥ Избранное" />
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
                    {favoriteItems.map(item => (
                      <DishCard key={item.id} item={item}
                        favorite={true}
                        onFav={() => toggleFav(item.id)}
                        onAdd={() => addToCart(item)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: SIDEBAR (desktop only) */}
            {!mobile && (
              <div style={{ position: "sticky", top: 80 }}>
                <Sidebar />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
