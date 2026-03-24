
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  STORAGE_KEYS, branches, categories, shawarmaAddonsChicken, shawarmaAddonsPork,
  items, MAX_ACTIVE_ORDERS, fmt, styles, safeLoad, orderAllowed, getSuggestions, formatDateTime
} from "@/lib/data";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const run = () => setIsMobile(window.innerWidth < 900);
    run();
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, []);
  return isMobile;
}

function StatusBadge({ status }) {
  const m = { new:"ждёт звонка", accepted:"подтверждён", preparing:"готовится", ready:"готов", completed:"выдан", canceled:"отменён", no_show:"не забран" };
  return <span style={styles.badge}>{m[status] || status}</span>;
}

export default function Page() {
  const isMobile = useIsMobile();
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0].id);
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [clientOrders, setClientOrders] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
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
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("branch_id", selectedBranchId)
      .in("status", ["accepted", "preparing", "ready"]);
    setActiveLoadCount(count || 0);
  };

  useEffect(() => {
    loadBranchLoad();
    const ch = supabase
      .channel("client-load-" + selectedBranchId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "branch_id=eq." + selectedBranchId }, loadBranchLoad)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedBranchId]);

  const ordersTemporarilyDisabled = activeLoadCount >= MAX_ACTIVE_ORDERS;
  const branchItems = useMemo(() => items.filter((i) => i.branches.includes(selectedBranchId)), [selectedBranchId]);
  const filteredItems = useMemo(() => {
    return branchItems.filter((i) =>
      i.category === activeCategory &&
      (i.name + " " + (i.variant || "")).toLowerCase().includes(query.toLowerCase())
    );
  }, [branchItems, activeCategory, query]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice * item.qty, 0), [cart]);
  const availableAddons = useMemo(() => {
    if (!selectedItem) return [];
    return selectedItem.addonGroup === "shawarma-chicken" ? shawarmaAddonsChicken : shawarmaAddonsPork;
  }, [selectedItem]);
  const visibleOrders = useMemo(() => clientOrders.filter((o) => o.branchId === selectedBranchId), [clientOrders, selectedBranchId]);

  const toggleFavorite = (id) => setFavorites((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const openItem = (item) => {
    if (item.comingSoon || ordersTemporarilyDisabled) return;
    if (item.category === "Шаурма в лаваше") {
      setSelectedItem(item);
      setSelectedAddons([]);
      return;
    }
    addToCart(item, []);
  };

  const addToCart = (item, addons) => {
    const addonTotal = addons.reduce((sum, a) => sum + a.price, 0);
    setCart((p) => [
      ...p,
      {
        cartId: item.id + "-" + Date.now() + "-" + Math.random(),
        itemId: item.id,
        name: item.name,
        variant: item.variant,
        price: item.price,
        addons,
        qty: 1,
        totalPrice: item.price + addonTotal,
        category: item.category,
      },
    ]);
    setSelectedItem(null);
    setSelectedAddons([]);
  };

  const addSuggestionToCart = (s) => {
    if (s.category === "Добавки") {
      setCart((p) => [...p, { ...s, itemId: s.id, qty: 1, addons: [], totalPrice: s.price, cartId: s.id + "-" + Date.now() }]);
      return;
    }
    addToCart(s, []);
  };

  const updateQty = (cartId, delta) => {
    setCart((p) => p.map((i) => i.cartId === cartId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0));
  };

  const placeOrder = async () => {
    if (!cart.length || !branchOrderAllowed || ordersTemporarilyDisabled || submitting) return;
    setSubmitting(true);

    const orderId = "NV-" + Date.now().toString().slice(-6);
    const nowIso = new Date().toISOString();

    const { error: orderError } = await supabase.from("orders").insert([{
      id: orderId,
      branch_id: selectedBranchId,
      branch_name: branch.name,
      status: "new",
      payment_method: "pay_on_pickup",
      payment_status: "unpaid",
      total: cartTotal,
      note: "Ожидает звонка клиента для подтверждения",
      created_at: nowIso,
    }]);

    if (orderError) {
      setSubmitting(false);
      alert("Ошибка отправки заказа");
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      cart.map((item) => ({
        order_id: orderId,
        item_id: item.itemId,
        name: item.name,
        variant: item.variant || null,
        price: item.price,
        qty: item.qty,
      }))
    );

    if (itemsError) {
      setSubmitting(false);
      alert("Заказ создан, но позиции заказа не сохранились");
      return;
    }

    setClientOrders((p) => [{
      id: orderId,
      branchId: selectedBranchId,
      branchName: branch.name,
      status: "new",
      items: cart,
      total: cartTotal,
      createdAt: formatDateTime(nowIso),
    }, ...p]);

    setCart([]);
    setSubmitting(false);
    alert("Заказ " + orderId + " создан.\n\nДля подтверждения обязательно позвоните:\n" + branch.name + "\n" + branch.phone + "\n\nБез звонка заказ не готовится.");
  };

  const currentSuggestions = cart.length
    ? getSuggestions(items.find((i) => i.id === cart[cart.length - 1].itemId) || { category: "" })
    : [];

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.h1}>На Виражах</h1>
            <p style={styles.subtitle}>Максимально заряженная версия. Заказ подтверждается звонком в точку.</p>
          </div>
          <a href="/admin" style={{ ...styles.button, ...styles.lightBtn, textDecoration: "none" }}>Вход для сотрудников</a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.25fr) minmax(320px, .75fr)", gap: 16 }}>
          <div>
            <div style={styles.card}>
              <div style={{ ...styles.row, alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px" }}>Выбор точки</h2>
                  <div style={{ color: "#94a3b8" }}>После оформления заказа клиент сам звонит для подтверждения</div>
                </div>
                <div style={{ textAlign: isMobile ? "left" : "right" }}>
                  <div style={{ fontSize: 14, color: "#94a3b8" }}>Заказы до {branch.cutoff}</div>
                  <span style={branchOrderAllowed ? styles.badgeSuccess : styles.badgeDanger}>
                    {branchOrderAllowed ? "Открыто" : "Прием заказов завершен"}
                  </span>
                </div>
              </div>

              {ordersTemporarilyDisabled ? (
                <div style={{ marginTop: 16, padding: 12, border: "1px solid #f59e0b", background: "#2a1c07", borderRadius: 16, color: "#fde68a" }}>
                  Заказы временно не принимаются. Сейчас в работе {activeLoadCount} из {MAX_ACTIVE_ORDERS} активных заказов.
                </div>
              ) : activeLoadCount >= MAX_ACTIVE_ORDERS - 2 ? (
                <div style={{ marginTop: 16, padding: 12, border: "1px solid #f59e0b", background: "#2a1c07", borderRadius: 16, color: "#fde68a" }}>
                  Высокая загрузка точки: в работе {activeLoadCount} из {MAX_ACTIVE_ORDERS} заказов.
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))", marginTop: 16 }}>
                {branches.map((b) => (
                  <button key={b.id} onClick={() => setSelectedBranchId(b.id)} style={{ ...styles.branchBtn(selectedBranchId === b.id), width: "100%" }}>
                    <div style={{ fontWeight: 700 }}>{b.name}</div>
                    <div style={{ marginTop: 6, opacity: .8 }}>{b.address}</div>
                    <div style={{ marginTop: 6, opacity: .8 }}>Телефон: <a href={"tel:" + b.phone} style={{ color: "inherit" }}>{b.phone}</a></div>
                    <div style={{ marginTop: 8, opacity: .8 }}>{b.open}–{b.close} · заказы до {b.cutoff}</div>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <input style={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по меню" />
              </div>

              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 16, paddingBottom: 4 }}>
                {categories.map((c) => (
                  <button key={c} onClick={() => setActiveCategory(c)} style={styles.categoryBtn(activeCategory === c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))", marginTop: 16 }}>
              {filteredItems.map((item) => (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.row}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{item.name} {item.spicy ? "🌶" : ""}</div>
                      <div style={{ marginTop: 6, color: "#94a3b8" }}>{item.variant ? item.variant + " · " : ""}{fmt(item.price)}</div>
                    </div>
                    <button onClick={() => toggleFavorite(item.id)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>
                      {favorites.includes(item.id) ? "❤️" : "🤍"}
                    </button>
                  </div>

                  {item.description && <div style={{ marginTop: 12, color: "#cbd5e1", fontSize: 14 }}>{item.description}</div>}
                  {item.comingSoon && <div style={{ marginTop: 12 }}><span style={styles.badge}>Скоро в продаже</span></div>}

                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button style={{ ...styles.button, ...styles.darkBtn, flex: 1 }} disabled={item.comingSoon || !branchOrderAllowed || ordersTemporarilyDisabled} onClick={() => openItem(item)}>
                      {item.category === "Шаурма в лаваше" ? "Выбрать" : "В корзину"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ ...styles.card, position: isMobile ? "static" : "sticky", top: 16 }}>
              <div style={{ ...styles.row, marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Корзина</h3>
                {cart.length > 0 && <span style={styles.badge}>{cart.length} поз.</span>}
              </div>

              {cart.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>Корзина пока пустая.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 12 }}>
                    {cart.map((item) => (
                      <div key={item.cartId} style={styles.cartItem}>
                        <div style={styles.row}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{item.name}{item.variant ? " · " + item.variant : ""}</div>
                            {item.addons.length > 0 && <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 14 }}>{item.addons.map((a) => a.name + " (+" + fmt(a.price) + ")").join(", ")}</div>}
                          </div>
                          <button onClick={() => updateQty(item.cartId, -item.qty)} style={{ ...styles.button, ...styles.lightBtn, padding: "6px 10px" }}>×</button>
                        </div>

                        <div style={{ ...styles.row, marginTop: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button style={{ ...styles.button, ...styles.lightBtn, padding: "6px 10px" }} onClick={() => updateQty(item.cartId, -1)}>-</button>
                            <span>{item.qty}</span>
                            <button style={{ ...styles.button, ...styles.lightBtn, padding: "6px 10px" }} onClick={() => updateQty(item.cartId, 1)}>+</button>
                          </div>
                          <div style={{ fontWeight: 700 }}>{fmt(item.totalPrice * item.qty)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {currentSuggestions.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Рекомендуем добавить</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {currentSuggestions.map((s) => (
                          <div key={s.id} style={{ ...styles.row, border: "1px solid #1f2937", borderRadius: 16, padding: 10, background: "#0b1220" }}>
                            <div style={{ fontSize: 14 }}>{s.name}</div>
                            <button style={{ ...styles.button, ...styles.darkBtn, padding: "8px 12px" }} onClick={() => addSuggestionToCart(s)}>+ {fmt(s.price)}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ ...styles.row, marginTop: 16, paddingTop: 16, borderTop: "1px solid #1f2937", fontSize: 20, fontWeight: 700 }}>
                    <span>Итого</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>

                  <button style={{ ...styles.button, ...styles.darkBtn, width: "100%", marginTop: 12, opacity: submitting ? .7 : 1 }} onClick={placeOrder} disabled={!branchOrderAllowed || ordersTemporarilyDisabled || submitting}>
                    {submitting ? "Отправка..." : "Оформить заказ"}
                  </button>
                </>
              )}
            </div>

            <div style={{ ...styles.card, marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Мои заказы</h3>
              {visibleOrders.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>Заказов пока нет.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {visibleOrders.map((order) => (
                    <div key={order.id} style={styles.cartItem}>
                      <div style={{ ...styles.row, alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{order.id}</div>
                          <div style={{ color: "#94a3b8", fontSize: 14 }}>{order.branchName}</div>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 14 }}>{order.createdAt}</div>
                      <div style={{ marginTop: 8, fontWeight: 700 }}>{fmt(order.total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedItem && (
          <div style={styles.modalBg} onClick={() => setSelectedItem(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.row}>
                <h3 style={{ margin: 0 }}>{selectedItem.name}{selectedItem.variant ? " · " + selectedItem.variant : ""}</h3>
                <button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setSelectedItem(null)}>Закрыть</button>
              </div>

              <p style={{ color: "#94a3b8", marginTop: 8 }}>Выберите добавки. Общая цена пересчитывается автоматически.</p>

              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {availableAddons.map((addon) => {
                  const checked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <label key={addon.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #1f2937", borderRadius: 16, padding: 12, cursor: "pointer" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{addon.name}</div>
                        <div style={{ fontSize: 14, color: "#94a3b8" }}>+{fmt(addon.price)}</div>
                      </div>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedAddons((prev) => checked ? prev.filter((a) => a.id !== addon.id) : [...prev, addon])} />
                    </label>
                  );
                })}
              </div>

              <div style={{ ...styles.row, marginTop: 16, fontSize: 20, fontWeight: 700 }}>
                <span>Итого</span>
                <span>{fmt((selectedItem?.price || 0) + selectedAddons.reduce((sum, addon) => sum + addon.price, 0))}</span>
              </div>

              <button style={{ ...styles.button, ...styles.darkBtn, width: "100%", marginTop: 16 }} onClick={() => addToCart(selectedItem, selectedAddons)}>
                Добавить в корзину
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
