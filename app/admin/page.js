"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { branches, fmt, styles } from "@/lib/data";

function StatusBadge({ status }) {
  const labelMap = {
    new: "ждёт звонка",
    accepted: "подтверждён",
    preparing: "готовится",
    ready: "готов",
    completed: "выдан",
    canceled: "отменён",
    no_show: "не забран",
  };
  return <span style={styles.badge}>{labelMap[status] || status}</span>;
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0].id);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session || null);
      setLoading(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const loadOrders = async () => {
    const { data: ordersData, error: ordersError } = await supabase.from("orders").select("*").eq("branch_id", selectedBranchId).order("created_at", { ascending: false });
    if (ordersError) { console.error(ordersError); return; }
    const orderIds = (ordersData || []).map((o) => o.id);
    let itemsMap = {};
    if (orderIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase.from("order_items").select("*").in("order_id", orderIds);
      if (itemsError) console.error(itemsError);
      else {
        itemsMap = (itemsData || []).reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push({ itemId: item.item_id, name: item.name, variant: item.variant, price: item.price, qty: item.qty });
          return acc;
        }, {});
      }
    }
    setOrders((ordersData || []).map((o) => ({
      id: o.id, branchId: o.branch_id, branchName: o.branch_name, status: o.status,
      paymentMethod: o.payment_method, paymentStatus: o.payment_status, total: o.total,
      createdAt: o.created_at ? new Date(o.created_at).toLocaleString("ru-RU") : "",
      items: itemsMap[o.id] || [], note: o.note || ""
    })));
  };

  useEffect(() => {
    if (!session) return;
    loadOrders();
    const ordersChannel = supabase.channel(`orders-${selectedBranchId}`).on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `branch_id=eq.${selectedBranchId}` }, () => loadOrders()).subscribe();
    const itemsChannel = supabase.channel(`order-items-${selectedBranchId}`).on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => loadOrders()).subscribe();
    return () => { supabase.removeChannel(ordersChannel); supabase.removeChannel(itemsChannel); };
  }, [session, selectedBranchId]);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(async () => {
      const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { error } = await supabase.from("orders").update({ status: "canceled", note: "Автоотмена: клиент не подтвердил заказ звонком за 15 минут" }).eq("branch_id", selectedBranchId).eq("status", "new").lt("created_at", threshold);
      if (error) console.error(error);
    }, 60000);
    return () => clearInterval(timer);
  }, [session, selectedBranchId]);

  const signIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setBusy(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const setOrderStatus = async (orderId, status) => {
    const patch = { status };
    if (status === "accepted") { patch.confirmed_at = new Date().toISOString(); patch.note = "Клиент позвонил, заказ подтверждён"; }
    if (status === "ready") patch.ready_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) { console.error(error); alert("Не удалось обновить статус"); }
  };

  const newOrders = useMemo(() => orders.filter((o) => o.status === "new"), [orders]);
  const activeOrders = useMemo(() => orders.filter((o) => ["accepted", "preparing", "ready"].includes(o.status)), [orders]);
  const finishedOrders = useMemo(() => orders.filter((o) => ["completed", "canceled", "no_show"].includes(o.status)), [orders]);

  if (loading) return <div style={styles.page}><div style={styles.wrap}>Загрузка...</div></div>;

  if (!session) {
    return <div style={styles.page}><div style={{ ...styles.wrap, maxWidth: 480 }}><div style={styles.card}><h1 style={styles.h1}>Вход для сотрудников</h1><p style={styles.subtitle}>Закрытая админка через Supabase Auth</p><form onSubmit={signIn} style={{ display: "grid", gap: 12, marginTop: 20 }}><input style={styles.input} type="email" placeholder="Email сотрудника" value={email} onChange={(e) => setEmail(e.target.value)} /><input style={styles.input} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} /><button style={{ ...styles.button, ...styles.darkBtn }} disabled={busy} type="submit">{busy ? "Вход..." : "Войти"}</button></form><div style={{ marginTop: 16, color: "#64748b", fontSize: 14 }}>Обычным клиентам сюда доступ не нужен. Рабочее место сотрудника: отдельная страница <b>/admin</b>.</div></div></div></div>;
  }

  return <div style={styles.page}><div style={styles.wrap}>
    <div style={styles.top}><div><h1 style={styles.h1}>Админка На Виражах</h1><p style={styles.subtitle}>Живые заказы, подтверждение по звонку, автоотмена неподтверждённых</p></div><div style={{ display: "flex", gap: 8 }}><a href="/" style={{ ...styles.button, ...styles.lightBtn, textDecoration: "none" }}>К клиентской части</a><button style={{ ...styles.button, ...styles.darkBtn }} onClick={signOut}>Выйти</button></div></div>
    <div style={styles.card}><div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit, minmax(240px,1fr))"}}>{branches.map((b) => (<button key={b.id} onClick={() => setSelectedBranchId(b.id)} style={styles.branchBtn(selectedBranchId === b.id)}><div style={{ fontWeight: 700 }}>{b.name}</div><div style={{ marginTop: 6, opacity: 0.8 }}>{b.address}</div><div style={{ marginTop: 6, opacity: 0.8 }}>Телефон: <a href={`tel:${b.phone}`} style={{ color: "inherit" }}>{b.phone}</a></div><div style={{ marginTop: 8, opacity: 0.8 }}>{b.open}–{b.close} · заказы до {b.cutoff}</div></button>))}</div></div>
    <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
      <div style={styles.card}><h3 style={{ marginTop: 0 }}>Новые — ждут звонка клиента</h3><div style={{ color: "#64748b", marginBottom: 12 }}>Если клиент не подтверждает заказ звонком в течение 15 минут, заказ автоматически уходит в отменённые.</div>{newOrders.length === 0 ? <div style={{ color: "#64748b" }}>Нет новых заказов.</div> : <div style={{ display: "grid", gap: 12 }}>{newOrders.map((order) => (<div key={order.id} style={styles.cartItem}><div style={styles.row}><div><div style={{ fontWeight: 700 }}>{order.id}</div><div style={{ color: "#64748b", fontSize: 14 }}>{order.branchName}</div></div><StatusBadge status={order.status} /></div><div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>{order.createdAt}</div><div style={{ marginTop: 8, fontWeight: 700 }}>{fmt(order.total)}</div><div style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 14, color: "#475569" }}>{order.items.map((it, idx) => (<div key={idx}>• {it.name}{it.variant ? ` · ${it.variant}` : ""} × {it.qty}</div>))}</div>{order.note && <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>{order.note}</div>}<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(order.id, "accepted")}>Клиент позвонил / подтвердить</button><button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => setOrderStatus(order.id, "canceled")}>Отменить</button></div></div>))}</div>}</div>
      <div style={styles.card}><h3 style={{ marginTop: 0 }}>Подтверждённые и активные</h3>{activeOrders.length === 0 ? <div style={{ color: "#64748b" }}>Нет активных заказов.</div> : <div style={{ display: "grid", gap: 12 }}>{activeOrders.map((order) => (<div key={order.id} style={styles.cartItem}><div style={styles.row}><div><div style={{ fontWeight: 700 }}>{order.id}</div><div style={{ color: "#64748b", fontSize: 14 }}>{order.branchName}</div></div><StatusBadge status={order.status} /></div><div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>{order.createdAt}</div><div style={{ marginTop: 8, fontWeight: 700 }}>{fmt(order.total)}</div><div style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 14, color: "#475569" }}>{order.items.map((it, idx) => (<div key={idx}>• {it.name}{it.variant ? ` · ${it.variant}` : ""} × {it.qty}</div>))}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(order.id, "preparing")}>Готовится</button><button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(order.id, "ready")}>Готов</button><button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(order.id, "completed")}>Выдан</button><button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => setOrderStatus(order.id, "no_show")}>Не забран</button></div></div>))}</div>}</div>
      <div style={styles.card}><h3 style={{ marginTop: 0 }}>Завершённые</h3>{finishedOrders.length === 0 ? <div style={{ color: "#64748b" }}>Нет завершённых заказов.</div> : <div style={{ display: "grid", gap: 12 }}>{finishedOrders.map((order) => (<div key={order.id} style={styles.cartItem}><div style={styles.row}><div><div style={{ fontWeight: 700 }}>{order.id}</div><div style={{ color: "#64748b", fontSize: 14 }}>{order.branchName}</div></div><StatusBadge status={order.status} /></div><div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>{order.createdAt}</div><div style={{ marginTop: 8, fontWeight: 700 }}>{fmt(order.total)}</div>{order.note && <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>{order.note}</div>}</div>))}</div>}</div>
    </div>
  </div></div>;
}
