"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS, branches, categories, items, MAX_ACTIVE_ORDERS, fmt, safeLoad, orderAllowed, formatDateTime, getSuggestions } from "@/lib/data";

const C = {
  bg: "#0b1020",
  panel: "#171b2d",
  panel2: "#21253a",
  text: "#ffffff",
  muted: "#a7aec7",
  accent: "#ff5b6a",
  accent2: "#ff7a59",
  border: "#2f344a"
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

function Pill({ children, color }) {
  return <span style={{ display:"inline-block", padding:"6px 10px", borderRadius:999, background: color || "#2a3045", color:"#fff", fontSize:12, fontWeight:700 }}>{children}</span>;
}

function StatusBadge({ status }) {
  const map = { new: "ждёт звонка", accepted: "подтверждён", preparing: "готовится", ready: "готов", completed: "выдан", canceled: "отменён", no_show: "не забран" };
  return <Pill>{map[status] || status}</Pill>;
}

function DishThumb({ index }) {
  const gradients = [
    "linear-gradient(135deg,#ff9a5a,#ff5b6a)",
    "linear-gradient(135deg,#f8d66d,#ff8f5a)",
    "linear-gradient(135deg,#7ed6ff,#7c83ff)",
    "linear-gradient(135deg,#7cffb2,#2dd4bf)"
  ];
  return <div style={{ width: 74, height: 74, borderRadius: 18, background: gradients[index % gradients.length], boxShadow: "inset 0 0 28px rgba(255,255,255,.22)" }} />;
}

function DishCard({ item, index, favorite, onFav, onAdd }) {
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:24, padding:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
        <DishThumb index={index} />
        <button onClick={onFav} style={{ border:"none", background:"transparent", color:"#ff6b7d", fontSize:22, cursor:"pointer" }}>{favorite ? "♥" : "♡"}</button>
      </div>
      <div style={{ marginTop:12, fontSize:18, fontWeight:800, lineHeight:1.15 }}>{item.name}</div>
      <div style={{ marginTop:6, color:C.muted, fontSize:14 }}>{item.variant || item.description}</div>
      {item.badge && <div style={{ marginTop:8 }}><Pill color="#382042">{item.badge}</Pill></div>}
      <div style={{ marginTop:12, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:18, fontWeight:900 }}>{fmt(item.price)}</div>
        <button onClick={onAdd} style={{ border:"none", borderRadius:14, background:`linear-gradient(135deg,${C.accent},${C.accent2})`, color:"#fff", padding:"12px 14px", fontWeight:800, cursor:"pointer" }}>В корзину</button>
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

  useEffect(() => {
    setSelectedBranchId(safeLoad(STORAGE_KEYS.branch, branches[0].id));
    setFavorites(safeLoad(STORAGE_KEYS.favorites, []));
    setClientOrders(safeLoad(STORAGE_KEYS.client_orders, []));
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.branch, JSON.stringify(selectedBranchId)); }, [selectedBranchId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.client_orders, JSON.stringify(clientOrders)); }, [clientOrders]);

  const branch = branches.find((b) => b.id === selectedBranchId);
  const branchOrderAllowed = orderAllowed(branch);

  const loadBranchLoad = async () => {
    const { count } = await supabase.from("orders").select("*", { count:"exact", head:true }).eq("branch_id", selectedBranchId).in("status", ["accepted","preparing","ready"]);
    setActiveLoadCount(count || 0);
  };

  useEffect(() => {
    loadBranchLoad();
    const ch = supabase.channel("client-load-" + selectedBranchId)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders", filter:"branch_id=eq." + selectedBranchId }, loadBranchLoad)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [selectedBranchId]);

  const disabled = activeLoadCount >= MAX_ACTIVE_ORDERS;
  const filtered = useMemo(() => items.filter((i) => i.branches.includes(selectedBranchId) && i.category === activeCategory && (i.name + " " + (i.variant || "")).toLowerCase().includes(query.toLowerCase())), [selectedBranchId, activeCategory, query]);
  const popular = useMemo(() => items.filter((i) => i.branches.includes(selectedBranchId) && i.popular).slice(0, 4), [selectedBranchId]);
  const cartTotal = useMemo(() => cart.reduce((s, x) => s + x.totalPrice * x.qty, 0), [cart]);
  const suggestions = cart.length ? getSuggestions(items.find((i) => i.id === cart[cart.length - 1].itemId)) : [];

  const addToCart = (item) => {
    setCart((prev) => [...prev, { cartId: item.id + "-" + Date.now(), itemId:item.id, name:item.name, variant:item.variant, price:item.price, qty:1, totalPrice:item.price }]);
  };

  const updateQty = (cartId, delta) => {
    setCart((prev) => prev.map((x) => x.cartId === cartId ? { ...x, qty: Math.max(0, x.qty + delta) } : x).filter((x) => x.qty > 0));
  };

  const doPlaceOrder = async () => {
    if (!cart.length || disabled || !branchOrderAllowed || submitting) return;
    setSubmitting(true);
    const id = "NV-" + Date.now().toString().slice(-6);
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("orders").insert([{
      id,
      branch_id: branch.id,
      branch_name: branch.name,
      status: "new",
      payment_method: "pay_on_pickup",
      payment_status: "unpaid",
      total: cartTotal,
      note: "Ожидает звонка клиента для подтверждения",
      created_at: nowIso
    }]);
    if (error) {
      setSubmitting(false);
      alert("Ошибка отправки заказа");
      return;
    }
    await supabase.from("order_items").insert(cart.map((item) => ({
      order_id: id,
      item_id: item.itemId,
      name: item.name,
      variant: item.variant || null,
      price: item.price,
      qty: item.qty
    })));
    setClientOrders((prev) => [{ id, branchName: branch.name, branchId: branch.id, status: "new", total: cartTotal, createdAt: formatDateTime(nowIso) }, ...prev]);
    setCart([]);
    setSubmitting(false);
    alert("Заказ " + id + " создан.\n\nДля подтверждения обязательно позвоните:\n" + branch.name + "\n" + branch.phone);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding: mobile ? 14 : 18 }}>
      <div style={{ maxWidth: 1320, margin:"0 auto", display:"grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1.2fr) 390px", gap: 18 }}>
        <div>
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:28, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <div>
                <div style={{ fontSize: mobile ? 31 : 36, fontWeight: 900, lineHeight: 1 }}>На Виражах</div>
                <div style={{ color: C.muted, marginTop: 6, fontSize: 15 }}>Стиль как у food apps, но под самовывоз и звонок</div>
              </div>
              <a href="/admin" style={{ textDecoration:"none", color:"#fff", background: C.panel2, border:`1px solid ${C.border}`, padding:"12px 14px", borderRadius:16, fontWeight:800 }}>Админка</a>
            </div>

            <div style={{ marginTop: 14, display:"grid", gap: 10 }}>
              {branches.map((b) => (
                <button key={b.id} onClick={() => setSelectedBranchId(b.id)} style={{ border:"none", cursor:"pointer", textAlign:"left", borderRadius:20, padding:16, background: selectedBranchId === b.id ? `linear-gradient(135deg,${C.accent},${C.accent2})` : C.panel2, color:"#fff" }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{b.name}</div>
                  <div style={{ marginTop: 6, opacity:.88, fontSize: 14 }}>{b.address}</div>
                  <div style={{ marginTop: 6, opacity:.88, fontSize: 14 }}>{b.phone}</div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск блюд..." style={{ width:"100%", boxSizing:"border-box", border:"1px solid " + C.border, background:C.panel2, color:"#fff", borderRadius:18, padding:"16px 16px", fontSize:17, outline:"none" }} />
            </div>

            <div style={{ marginTop: 14, background:`linear-gradient(135deg,${C.accent},${C.accent2})`, borderRadius:24, padding:18, display:"flex", justifyContent:"space-between", gap:12, alignItems:"center" }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>Счастливые часы</div>
                <div style={{ marginTop: 6, opacity:.92, fontSize: 15 }}>Ежедневно 10:00–13:00 · скидка 10%</div>
                <div style={{ marginTop: 12, fontSize: 14 }}>Подтверждение заказа по звонку</div>
              </div>
              <div style={{ width: mobile ? 84 : 100, height: mobile ? 84 : 100, borderRadius: 24, background: "rgba(255,255,255,.18)" }} />
            </div>

            {disabled && <div style={{ marginTop: 14, padding: 14, borderRadius: 18, background: "#3a1920", color:"#ffd3d8", fontSize: 16 }}>Заказы временно не принимаются: в работе {activeLoadCount} из {MAX_ACTIVE_ORDERS}.</div>}

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Категории</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 10 }}>
                {categories.map((c) => (
                  <button key={c.key} onClick={() => setActiveCategory(c.key)} style={{ border:"none", cursor:"pointer", borderRadius:22, padding:"14px 8px", background: activeCategory === c.key ? `linear-gradient(135deg,${C.accent},${C.accent2})` : C.panel2, color:"#fff" }}>
                    <div style={{ fontSize: 30 }}>{c.emoji}</div>
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, lineHeight: 1.15 }}>{c.key}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, background:C.panel, border:`1px solid ${C.border}`, borderRadius:28, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Популярное</div>
              <div style={{ color: C.muted, fontSize: 14 }}>Сейчас берут чаще</div>
            </div>
            <div style={{ marginTop: 14, display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
              {popular.map((item, idx) => (
                <DishCard
                  key={item.id}
                  item={item}
                  index={idx}
                  favorite={favorites.includes(item.id)}
                  onFav={() => setFavorites((prev) => prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id])}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18, background:C.panel, border:`1px solid ${C.border}`, borderRadius:28, padding:16 }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>{activeCategory}</div>
            <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
              {filtered.map((item, idx) => (
                <DishCard
                  key={item.id}
                  item={item}
                  index={idx + 3}
                  favorite={favorites.includes(item.id)}
                  onFav={() => setFavorites((prev) => prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id])}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ position: mobile ? "static" : "sticky", top: 18, display:"grid", gap: 16 }}>
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius: 28, padding: 16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>Корзина</div>
                {cart.length > 0 && <Pill>{cart.length} поз.</Pill>}
              </div>

              {cart.length === 0 ? (
                <div style={{ marginTop: 12, color: C.muted, fontSize: 16 }}>Добавь блюда, чтобы оформить заказ.</div>
              ) : (
                <>
                  <div style={{ marginTop: 14, display:"grid", gap: 12 }}>
                    {cart.map((item) => (
                      <div key={item.cartId} style={{ background:C.panel2, borderRadius: 20, padding: 12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 800 }}>{item.name}</div>
                            <div style={{ marginTop: 4, color: C.muted, fontSize: 14 }}>{item.variant || "стандарт"}</div>
                          </div>
                          <div style={{ fontWeight: 900 }}>{fmt(item.totalPrice * item.qty)}</div>
                        </div>
                        <div style={{ marginTop: 12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ display:"flex", gap: 8, alignItems:"center" }}>
                            <button onClick={() => updateQty(item.cartId, -1)} style={{ border:"none", cursor:"pointer", borderRadius:12, background:"#111827", color:"#fff", width:34, height:34 }}>-</button>
                            <div style={{ minWidth: 24, textAlign:"center", fontWeight: 800 }}>{item.qty}</div>
                            <button onClick={() => updateQty(item.cartId, 1)} style={{ border:"none", cursor:"pointer", borderRadius:12, background:"#111827", color:"#fff", width:34, height:34 }}>+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {suggestions.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Добавить к заказу</div>
                      <div style={{ display:"grid", gap: 8 }}>
                        {suggestions.map((s) => (
                          <button key={s.id} onClick={() => addToCart({ id:s.id, name:s.name, price:s.price, category:"Добавки" })} style={{ border:"none", cursor:"pointer", borderRadius:16, padding:"12px 14px", background: C.panel2, color:"#fff", display:"flex", justifyContent:"space-between", fontWeight:700 }}>
                            <span>{s.name}</span>
                            <span>+ {fmt(s.price)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 16, paddingTop: 14, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", fontSize: 24, fontWeight: 900 }}>
                    <span>Итого</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>

                  <button onClick={doPlaceOrder} disabled={disabled || !branchOrderAllowed || submitting} style={{ marginTop: 14, width:"100%", border:"none", cursor:"pointer", borderRadius:18, padding:"16px 18px", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, color:"#fff", fontSize: 19, fontWeight: 900, opacity: submitting ? .7 : 1 }}>
                    {submitting ? "Отправка..." : "Оформить заказ"}
                  </button>
                </>
              )}
            </div>

            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius: 28, padding: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Мои заказы</div>
              <div style={{ marginTop: 12, display:"grid", gap: 12 }}>
                {clientOrders.length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 16 }}>Заказов пока нет.</div>
                ) : clientOrders.map((o) => (
                  <div key={o.id} style={{ background:C.panel2, borderRadius: 18, padding: 12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{o.id}</div>
                        <div style={{ color: C.muted, marginTop: 4, fontSize: 14 }}>{o.branchName}</div>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div style={{ marginTop: 8, color: C.muted, fontSize: 14 }}>{o.createdAt}</div>
                    <div style={{ marginTop: 8, fontWeight: 900 }}>{fmt(o.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
