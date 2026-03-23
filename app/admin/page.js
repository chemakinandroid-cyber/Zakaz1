"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { branches, fmt, styles, MAX_ACTIVE_ORDERS, formatDateTime } from "@/lib/data";

function StatusBadge({ status }) {
  const m = { new:"ждёт звонка", accepted:"подтверждён", preparing:"готовится", ready:"готов", completed:"выдан", canceled:"отменён", no_show:"не забран" };
  return <span style={styles.badge}>{m[status] || status}</span>;
}
function minsSince(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
}
function TimerBadge({ mins }) {
  const style = mins >= 10 ? styles.badgeDanger : mins >= 5 ? styles.badgeWarn : styles.badge;
  return <span style={style}>{mins} мин</span>;
}
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

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0].id);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session || null); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s || null); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadOrders = async () => {
    const { data: ordersData, error } = await supabase.from("orders").select("*").eq("branch_id", selectedBranchId).order("created_at", { ascending: false });
    if (error) return console.error(error);
    const ids = (ordersData || []).map((o) => o.id);
    let itemsMap = {};
    if (ids.length) {
      const { data: itemsData } = await supabase.from("order_items").select("*").in("order_id", ids);
      itemsMap = (itemsData || []).reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {});
    }
    setOrders((ordersData || []).map((o) => ({ ...o, items: itemsMap[o.id] || [] })));
  };

  useEffect(() => {
    if (!session) return;
    loadOrders();
    const ch1 = supabase.channel(`admin-orders-${selectedBranchId}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders", filter:`branch_id=eq.${selectedBranchId}` }, loadOrders)
      .subscribe();
    const ch2 = supabase.channel(`admin-order-items-${selectedBranchId}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"order_items" }, loadOrders)
      .subscribe();
    const timer = setInterval(async () => {
      const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      await supabase.from("orders")
        .update({ status:"canceled", note:"Автоотмена: клиент не подтвердил заказ звонком за 15 минут" })
        .eq("branch_id", selectedBranchId)
        .eq("status", "new")
        .lt("created_at", threshold);
    }, 60000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [session, selectedBranchId]);

  const signIn = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  const setOrderStatus = async (id, status) => {
    const patch = { status };
    if (status === "accepted") patch.confirmed_at = new Date().toISOString();
    if (status === "ready") patch.ready_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) alert("Не удалось обновить статус");
  };

  const newOrders = useMemo(() => orders.filter((o) => o.status === "new"), [orders]);
  const activeOrders = useMemo(() => orders.filter((o) => ["accepted","preparing","ready"].includes(o.status)), [orders]);
  const finishedOrders = useMemo(() => orders.filter((o) => ["completed","canceled","no_show"].includes(o.status)), [orders]);

  if (loading) return <div style={styles.page}><div style={styles.wrap}>Загрузка...</div></div>;

  if (!session) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.wrap, maxWidth:460 }}>
          <div style={styles.card}>
            <h1 style={styles.h1}>Вход для сотрудников</h1>
            <p style={styles.subtitle}>Закрытая админка /admin</p>
            <form onSubmit={signIn} style={{ display:"grid", gap:12, marginTop:16 }}>
              <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email сотрудника" />
              <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" />
              <button style={{ ...styles.button, ...styles.darkBtn }} type="submit">Войти</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const renderOrder = (o, activeSection=False) if False else None

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div><h1 style={styles.h1}>Админка На Виражах</h1><p style={styles.subtitle}>Улан-Удэ время, мобильная адаптация, лимит {MAX_ACTIVE_ORDERS} активных заказов</p></div>
          <div style={{ display:"flex", gap:8 }}>
            <a href="/" style={{ ...styles.button, ...styles.lightBtn, textDecoration:"none" }}>К клиентской части</a>
            <button style={{ ...styles.button, ...styles.darkBtn }} onClick={signOut}>Выйти</button>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ display:"grid", gap:12, gridTemplateColumns:isMobile ? "1fr" : "repeat(2, minmax(0,1fr))" }}>
            {branches.map((b) => (
              <button key={b.id} onClick={() => setSelectedBranchId(b.id)} style={{ ...styles.branchBtn(selectedBranchId === b.id), width:"100%" }}>
                <div style={{ fontWeight:700 }}>{b.name}</div>
                <div style={{ marginTop:6, opacity:.8 }}>{b.address}</div>
                <div style={{ marginTop:6, opacity:.8 }}>Телефон: {b.phone}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop:16, display:"grid", gap:16 }}>
          <div style={styles.card}>
            <h3 style={{ marginTop:0 }}>Новые — ждут звонка клиента</h3>
            {newOrders.length === 0 ? <div style={{ color:"#64748b" }}>Нет новых заказов.</div> : newOrders.map((o) => (
              <div key={o.id} style={{ ...styles.cartItem, marginTop:12 }}>
                <div style={{ ...styles.row, alignItems:isMobile ? "flex-start" : "center", flexDirection:isMobile ? "column" : "row" }}>
                  <div><b>{o.id}</b></div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}><StatusBadge status={o.status} /><TimerBadge mins={minsSince(o.created_at)} /></div>
                </div>
                <div style={{ marginTop:8 }}>{fmt(o.total)}</div>
                <div style={{ marginTop:8, color:"#64748b", fontSize:14 }}>{formatDateTime(o.created_at)}</div>
                <div style={{ marginTop:8, display:"grid", gap:4, fontSize:14 }}>{(o.items || []).map((it, idx) => <div key={idx}>• {it.name}{it.variant ? ` · ${it.variant}` : ""} × {it.qty}</div>)}</div>
                {o.note && <div style={{ marginTop:8, color:"#64748b", fontSize:13 }}>{o.note}</div>}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
                  <button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(o.id, "accepted")}>Клиент позвонил / подтвердить</button>
                  <button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => setOrderStatus(o.id, "canceled")}>Отменить</button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop:0 }}>Подтверждённые и активные ({activeOrders.length}/{MAX_ACTIVE_ORDERS})</h3>
            {activeOrders.length >= MAX_ACTIVE_ORDERS && <div style={{ marginBottom:12, color:"#991b1b" }}>Лимит достигнут: клиентская часть временно блокирует новые заказы.</div>}
            {activeOrders.length === 0 ? <div style={{ color:"#64748b" }}>Нет активных заказов.</div> : activeOrders.map((o) => (
              <div key={o.id} style={{ ...styles.cartItem, marginTop:12 }}>
                <div style={{ ...styles.row, alignItems:isMobile ? "flex-start" : "center", flexDirection:isMobile ? "column" : "row" }}>
                  <div><b>{o.id}</b></div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}><StatusBadge status={o.status} /><TimerBadge mins={minsSince(o.created_at)} /></div>
                </div>
                <div style={{ marginTop:8 }}>{fmt(o.total)}</div>
                <div style={{ marginTop:8, color:"#64748b", fontSize:14 }}>{formatDateTime(o.created_at)}</div>
                <div style={{ marginTop:8, display:"grid", gap:4, fontSize:14 }}>{(o.items || []).map((it, idx) => <div key={idx}>• {it.name}{it.variant ? ` · ${it.variant}` : ""} × {it.qty}</div>)}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
                  <button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(o.id, "preparing")}>Готовится</button>
                  <button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(o.id, "ready")}>Готов</button>
                  <button style={{ ...styles.button, ...styles.lightBtn }} onClick={() => setOrderStatus(o.id, "completed")}>Выдан</button>
                  <button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => setOrderStatus(o.id, "no_show")}>Не забран</button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop:0 }}>Завершённые</h3>
            {finishedOrders.length === 0 ? <div style={{ color:"#64748b" }}>Нет завершённых заказов.</div> : finishedOrders.map((o) => (
              <div key={o.id} style={{ ...styles.cartItem, marginTop:12 }}>
                <div style={{ ...styles.row, alignItems:isMobile ? "flex-start" : "center", flexDirection:isMobile ? "column" : "row" }}>
                  <div><b>{o.id}</b></div>
                  <StatusBadge status={o.status} />
                </div>
                <div style={{ marginTop:8 }}>{fmt(o.total)}</div>
                <div style={{ marginTop:8, color:"#64748b", fontSize:14 }}>{formatDateTime(o.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
