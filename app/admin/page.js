"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { branches, fmt, formatDateTime, getTimerMinutes, STORAGE_KEYS, safeLoad } from "@/lib/data";

const C = {
  bg: "#0b1020",
  panel: "#171b2d",
  panel2: "#21253a",
  text: "#ffffff",
  muted: "#a7aec7",
  accent: "#ff5b6a",
  accent2: "#ff7a59",
  border: "#2f344a",
  green: "#22c55e"
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

function playBeepStrong() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [740, 980].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + idx * 0.14;
      osc.start(start);
      osc.stop(start + 0.12);
    });
  } catch {}
}

function Chip({ children, bg }) {
  return <span style={{ display:"inline-block", padding:"6px 10px", borderRadius:999, background:bg, color:"#fff", fontSize:12, fontWeight:700 }}>{children}</span>;
}

function StatusChip({ status }) {
  const map = {
    new: ["ждёт звонка", "#3a1d24"],
    accepted: ["подтверждён", "#173324"],
    preparing: ["готовится", "#332813"],
    ready: ["готов", "#173324"],
    completed: ["выдан", "#1f2937"],
    canceled: ["отменён", "#3a1d24"],
    no_show: ["не забран", "#3a1d24"]
  };
  const [label, bg] = map[status] || [status, "#1f2937"];
  return <Chip bg={bg}>{label}</Chip>;
}

function TimerChip({ mins, status }) {
  if (["completed","canceled","no_show"].includes(status)) return <Chip bg="#1f2937">закрыт</Chip>;
  const bg = mins >= 30 ? "#4c1010" : mins >= 15 ? "#52350d" : "#153422";
  return <Chip bg={bg}>{mins} мин</Chip>;
}

export default function AdminPage() {
  const mobile = useMobile();
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0].id);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const previousNew = useRef(0);

  useEffect(() => setAudioEnabled(safeLoad(STORAGE_KEYS.audio_enabled, true)), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadOrders = async () => {
    const { data: orderRows } = await supabase.from("orders").select("*").eq("branch_id", selectedBranchId).order("created_at", { ascending: false });
    const ids = (orderRows || []).map((o) => o.id);
    let map = {};
    if (ids.length) {
      const { data: itemRows } = await supabase.from("order_items").select("*").in("order_id", ids);
      map = (itemRows || []).reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {});
    }
    setOrders((orderRows || []).map((o) => ({ ...o, items: map[o.id] || [] })));
  };

  useEffect(() => {
    if (!session) return;
    loadOrders();
    const c1 = supabase.channel("admin-orders-" + selectedBranchId)
      .on("postgres_changes", { event:"*", schema:"public", table:"orders", filter:"branch_id=eq." + selectedBranchId }, loadOrders)
      .subscribe();
    const c2 = supabase.channel("admin-items-" + selectedBranchId)
      .on("postgres_changes", { event:"*", schema:"public", table:"order_items" }, loadOrders)
      .subscribe();
    const t = setInterval(async () => {
      const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      await supabase.from("orders").update({ status:"canceled", note:"Автоотмена: клиент не подтвердил заказ звонком за 15 минут" }).eq("branch_id", selectedBranchId).eq("status", "new").lt("created_at", threshold);
    }, 60000);
    return () => {
      clearInterval(t);
      supabase.removeChannel(c1);
      supabase.removeChannel(c2);
    };
  }, [session, selectedBranchId]);

  useEffect(() => {
    const newCount = orders.filter((o) => o.status === "new").length;
    if (audioEnabled && previousNew.current !== 0 && newCount > previousNew.current) playBeepStrong();
    previousNew.current = newCount;
    localStorage.setItem(STORAGE_KEYS.audio_enabled, JSON.stringify(audioEnabled));
  }, [orders, audioEnabled]);

  const signIn = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const setStatus = async (id, status) => {
    const patch = { status };
    if (status === "accepted") patch.confirmed_at = new Date().toISOString();
    if (status === "ready") patch.ready_at = new Date().toISOString();
    await supabase.from("orders").update(patch).eq("id", id);
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const newOrders = useMemo(() => orders.filter((o) => o.status === "new"), [orders]);
  const activeOrders = useMemo(() => orders.filter((o) => ["accepted","preparing","ready"].includes(o.status)), [orders]);
  const doneOrders = useMemo(() => orders.filter((o) => ["completed","canceled","no_show"].includes(o.status)), [orders]);

  if (loading) return <div style={{ minHeight:"100vh", padding:20, background:C.bg }}>Загрузка...</div>;

  if (!session) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, padding:20 }}>
        <div style={{ maxWidth:420, margin:"0 auto", background:C.panel, border:`1px solid ${C.border}`, borderRadius:28, padding:18 }}>
          <div style={{ fontSize:32, fontWeight:900 }}>Вход в админку</div>
          <div style={{ marginTop:8, color:C.muted }}>Закрытый доступ для сотрудников</div>
          <form onSubmit={signIn} style={{ display:"grid", gap:12, marginTop:18 }}>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" style={{ border:"1px solid "+C.border, background:C.panel2, color:"#fff", borderRadius:16, padding:"16px 14px", fontSize:16 }} />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Пароль" style={{ border:"1px solid "+C.border, background:C.panel2, color:"#fff", borderRadius:16, padding:"16px 14px", fontSize:16 }} />
            <button style={{ border:"none", cursor:"pointer", borderRadius:16, padding:"16px 18px", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, color:"#fff", fontSize:18, fontWeight:900 }}>Войти</button>
          </form>
        </div>
      </div>
    );
  }

  const block = (title, rows, activeActions) => (
    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:28, padding:16 }}>
      <div style={{ fontSize:24, fontWeight:900 }}>{title}</div>
      {rows.length === 0 ? <div style={{ marginTop:12, color:C.muted }}>Нет заказов.</div> : (
        <div style={{ marginTop:12, display:"grid", gap:12 }}>
          {rows.map((o) => (
            <div key={o.id} style={{ background:C.panel2, borderRadius:22, padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems: mobile ? "flex-start" : "center", gap:10, flexDirection: mobile ? "column" : "row" }}>
                <div>
                  <div style={{ fontWeight:900, fontSize:18 }}>{o.id}</div>
                  <div style={{ marginTop:4, color:C.muted, fontSize:14 }}>Создан: {formatDateTime(o.created_at)}</div>
                  {o.confirmed_at && <div style={{ marginTop:4, color:C.muted, fontSize:14 }}>Подтверждён: {formatDateTime(o.confirmed_at)}</div>}
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <StatusChip status={o.status} />
                  <TimerChip mins={getTimerMinutes(o)} status={o.status} />
                </div>
              </div>
              <div style={{ marginTop:10, fontWeight:900, fontSize:18 }}>{fmt(o.total)}</div>
              <div style={{ marginTop:8, display:"grid", gap:4 }}>
                {(o.items || []).map((it, idx) => <div key={idx} style={{ fontSize:15 }}>• {it.name}{it.variant ? " · " + it.variant : ""} × {it.qty}</div>)}
              </div>
              {o.note && <div style={{ marginTop:8, color:C.muted, fontSize:14 }}>{o.note}</div>}
              <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
                {o.status === "new" && (
                  <>
                    <button onClick={() => setStatus(o.id, "accepted")} style={{ border:"none", cursor:"pointer", borderRadius:14, padding:"12px 14px", background:C.green, color:"#fff", fontWeight:800 }}>Клиент позвонил</button>
                    <button onClick={() => setStatus(o.id, "canceled")} style={{ border:"none", cursor:"pointer", borderRadius:14, padding:"12px 14px", background:"#dc2626", color:"#fff", fontWeight:800 }}>Отменить</button>
                  </>
                )}
                {activeActions && (
                  <>
                    <button onClick={() => setStatus(o.id, "preparing")} style={{ border:"none", cursor:"pointer", borderRadius:14, padding:"12px 14px", background:"#374151", color:"#fff", fontWeight:800 }}>Готовится</button>
                    <button onClick={() => setStatus(o.id, "ready")} style={{ border:"none", cursor:"pointer", borderRadius:14, padding:"12px 14px", background:C.green, color:"#fff", fontWeight:800 }}>Готов</button>
                    <button onClick={() => setStatus(o.id, "completed")} style={{ border:"none", cursor:"pointer", borderRadius:14, padding:"12px 14px", background:"#374151", color:"#fff", fontWeight:800 }}>Выдан</button>
                    <button onClick={() => setStatus(o.id, "no_show")} style={{ border:"none", cursor:"pointer", borderRadius:14, padding:"12px 14px", background:"#dc2626", color:"#fff", fontWeight:800 }}>Не забран</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding: mobile ? 14 : 18 }}>
      <div style={{ maxWidth: 1320, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:16 }}>
          <div>
            <div style={{ fontSize: mobile ? 34 : 40, fontWeight:900, lineHeight:1 }}>Админка</div>
            <div style={{ color:C.muted, marginTop:6 }}>Крупные блоки, таймер от подтверждения, тест звука и локальное время устройства</div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => setAudioEnabled((v) => !v)} style={{ border:"none", cursor:"pointer", borderRadius:16, padding:"12px 14px", background:C.panel2, color:"#fff", fontWeight:800 }}>Звук: {audioEnabled ? "вкл" : "выкл"}</button>
            <button onClick={playBeepStrong} style={{ border:"none", cursor:"pointer", borderRadius:16, padding:"12px 14px", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, color:"#fff", fontWeight:800 }}>Тест звука</button>
            <a href="/" style={{ textDecoration:"none", borderRadius:16, padding:"12px 14px", background:C.panel2, color:"#fff", fontWeight:800 }}>К клиенту</a>
            <button onClick={signOut} style={{ border:"none", cursor:"pointer", borderRadius:16, padding:"12px 14px", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, color:"#fff", fontWeight:800 }}>Выйти</button>
          </div>
        </div>

        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:28, padding:16, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap:12 }}>
            {branches.map((b) => (
              <button key={b.id} onClick={() => setSelectedBranchId(b.id)} style={{ border:"none", cursor:"pointer", textAlign:"left", borderRadius:20, padding:16, background: selectedBranchId === b.id ? `linear-gradient(135deg,${C.accent},${C.accent2})` : C.panel2, color:"#fff" }}>
                <div style={{ fontWeight:800, fontSize:18 }}>{b.name}</div>
                <div style={{ marginTop:6, opacity:.88, fontSize:14 }}>{b.address}</div>
                <div style={{ marginTop:6, opacity:.88, fontSize:14 }}>{b.phone}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gap:16 }}>
          {block("Новые — ждут звонка клиента", newOrders, false)}
          {block("Подтверждённые и активные (" + activeOrders.length + ")", activeOrders, true)}
          {block("Завершённые", doneOrders, false)}
        </div>
      </div>
    </div>
  );
}
