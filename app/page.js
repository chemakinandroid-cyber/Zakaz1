"use client";

import { createClient } from "@supabase/supabase-js";
import React, { useEffect, useMemo, useState } from "react";

const supabase = createClient(
  "https://ltksgxmuxclhjpaizfpi.supabase.co",
  "sb_publishable_4yKGirSU8m5aL1-jy6xNTA_j8_pdYeV"
);

const STORAGE_KEYS = {
  branch: "na-virazhah.branch",
  stopList: "na-virazhah.stopList",
  orders: "na-virazhah.orders",
  favorites: "na-virazhah.favorites",
};

const branches = [
  { id: "konechnaya", name: "На Виражах — Конечная", address: "ул. Конечная, 10/4", phone: "+79085932688", open: "10:00", close: "22:00", cutoff: "21:30" },
  { id: "airport", name: "На Виражах — Аэропорт", address: "п. Аэропорт, 7", phone: "+79024524222", open: "10:00", close: "21:00", cutoff: "20:30" },
];

const categories = ["Шаурма в лаваше","Бургеры","Хот-доги","Шашлык","Кесадилья","Блюда во фритюре","Соусы","Напитки"];

const shawarmaAddonsChicken = [
  { id: "extra-chicken", name: "Курица 70 г", price: 60 },
  { id: "fries-addon", name: "Картофель фри", price: 40 },
  { id: "jalapeno", name: "Перец острый халапеньо", price: 40 },
  { id: "pickles", name: "Огурцы маринованные", price: 40 },
  { id: "mustard", name: "Сладкая горчица", price: 40 },
  { id: "cheese", name: "Сыр", price: 50 },
  { id: "cheese-sauce", name: "Сырный соус", price: 40 },
  { id: "crispy-onion", name: "Лук фри", price: 40 },
];

const shawarmaAddonsPork = [
  { id: "extra-pork", name: "Свинина 70 г", price: 60 },
  { id: "fries-addon", name: "Картофель фри", price: 40 },
  { id: "jalapeno", name: "Перец острый халапеньо", price: 40 },
  { id: "pickles", name: "Огурцы маринованные", price: 40 },
  { id: "mustard", name: "Сладкая горчица", price: 40 },
  { id: "cheese", name: "Сыр", price: 50 },
  { id: "cheese-sauce", name: "Сырный соус", price: 40 },
  { id: "crispy-onion", name: "Лук фри", price: 40 },
];

const items = [
  { id:"shawarma-na-virazhah-chicken",name:"Шаурма «На Виражах»",category:"Шаурма в лаваше",variant:"курица",price:260,spicy:false,branches:["konechnaya","airport"],description:"Курица, помидоры, огурцы, пекинская капуста, фирменный соус",addonGroup:"shawarma-chicken" },
  { id:"shawarma-na-virazhah-pork",name:"Шаурма «На Виражах»",category:"Шаурма в лаваше",variant:"свинина",price:270,spicy:false,branches:["konechnaya","airport"],description:"Свинина, помидоры, огурцы, пекинская капуста, фирменный соус",addonGroup:"shawarma-pork" },
  { id:"shawarma-caesario",name:"Шаурма «Цезарио»",category:"Шаурма в лаваше",variant:"курица",price:290,spicy:false,branches:["konechnaya","airport"],description:"Курица, помидоры, пекинская капуста, твердый сыр, фирменный соус, сухарики",addonGroup:"shawarma-chicken" },
  { id:"shawarma-redjet-chicken",name:"Шаурма «Ред.Джет»",category:"Шаурма в лаваше",variant:"курица",price:290,spicy:true,branches:["konechnaya","airport"],description:"Курица, огурцы, помидоры, пекинская капуста, фирменный и острый соусы, халапеньо",addonGroup:"shawarma-chicken" },
  { id:"shawarma-redjet-pork",name:"Шаурма «Ред.Джет»",category:"Шаурма в лаваше",variant:"свинина",price:320,spicy:true,branches:["konechnaya","airport"],description:"Свинина, огурцы, помидоры, пекинская капуста, фирменный и острый соусы, халапеньо",addonGroup:"shawarma-pork" },
  { id:"burger-chicken-cargo",name:"Чикен Карго",category:"Бургеры",price:300,branches:["konechnaya","airport"] },
  { id:"burger-cheeseburger",name:"Чизбургер",category:"Бургеры",price:299,branches:["konechnaya","airport"] },
  { id:"burger-double-cheese",name:"Двойной чизбургер",category:"Бургеры",price:429,branches:["konechnaya","airport"] },
  { id:"burger-forsage",name:"Форсаж",category:"Бургеры",price:319,branches:["konechnaya","airport"] },
  { id:"burger-cool-forsage",name:"Крутой Форсаж",category:"Бургеры",price:399,branches:["konechnaya","airport"] },
  { id:"burger-cheesy",name:"Сырный",category:"Бургеры",price:349,branches:["konechnaya","airport"] },
  { id:"hotdog-danish",name:"Датский классический",category:"Хот-доги",price:230,branches:["konechnaya","airport"] },
  { id:"hotdog-austrian",name:"Австрийский",category:"Хот-доги",price:230,branches:["konechnaya","airport"] },
  { id:"hotdog-chili",name:"Чили",category:"Хот-доги",price:260,branches:["konechnaya","airport"] },
  { id:"hotdog-three-peppers",name:"Три перца и сыр",category:"Хот-доги",price:270,branches:["konechnaya","airport"] },
  { id:"shashlik-neck",name:"Шашлык из свиной шеи",category:"Шашлык",price:400,branches:["konechnaya","airport"] },
  { id:"quesadilla",name:"Кесадилья сырная / острая",category:"Кесадилья",price:260,branches:["konechnaya","airport"] },
  { id:"fried-wings",name:"Куриные крылышки",category:"Блюда во фритюре",price:399,branches:["konechnaya","airport"] },
  { id:"fried-shrimp",name:"Креветки",category:"Блюда во фритюре",price:300,branches:["konechnaya","airport"] },
  { id:"strips-3",name:"Стрипсы куриные",category:"Блюда во фритюре",variant:"3 шт",price:190,branches:["konechnaya","airport"] },
  { id:"strips-6",name:"Стрипсы куриные",category:"Блюда во фритюре",variant:"6 шт",price:370,branches:["konechnaya","airport"] },
  { id:"fries",name:"Картофель фри",category:"Блюда во фритюре",variant:"100 г",price:150,branches:["konechnaya","airport"] },
  { id:"village-potato",name:"Картофель по-деревенски",category:"Блюда во фритюре",variant:"100 г",price:150,branches:["konechnaya","airport"] },
  { id:"cheese-sticks",name:"Сырные палочки",category:"Блюда во фритюре",price:250,branches:["konechnaya","airport"] },
  { id:"nuggets",name:"Наггетсы",category:"Блюда во фритюре",price:170,branches:["konechnaya","airport"] },
  { id:"garlic-sauce",name:"Чесночный",category:"Соусы",variant:"100 мл",price:60,branches:["konechnaya","airport"] },
  { id:"sauce-ketchup",name:"Кетчуп",category:"Соусы",variant:"30 мл",price:45,branches:["konechnaya","airport"] },
  { id:"sauce-cheese",name:"Сырный",category:"Соусы",variant:"30 мл",price:45,branches:["konechnaya","airport"] },
  { id:"sauce-sweet-mustard",name:"Сладкий горчичный",category:"Соусы",variant:"30 мл",price:45,branches:["konechnaya","airport"] },
  { id:"coffee-espresso",name:"Эспрессо",category:"Напитки",variant:"60 мл",price:100,branches:["konechnaya"] },
  { id:"coffee-double-espresso",name:"Двойной эспрессо",category:"Напитки",price:120,branches:["konechnaya"] },
  { id:"coffee-cappuccino",name:"Капучино",category:"Напитки",variant:"300 мл",price:210,branches:["konechnaya"] },
  { id:"coffee-latte",name:"Латте",category:"Напитки",variant:"300 мл",price:200,branches:["konechnaya"] },
  { id:"coffee-americano",name:"Американо",category:"Напитки",variant:"300 мл",price:190,branches:["konechnaya"] },
  { id:"lemonade-cherry-yuzu",name:"Лимонад Вишня–Юзу",category:"Напитки",variant:"0,34",price:130,branches:["konechnaya","airport"],comingSoon:true },
  { id:"lemonade-mango-maracuya",name:"Лимонад Манго–Маракуйя",category:"Напитки",variant:"0,34",price:130,branches:["konechnaya","airport"],comingSoon:true },
  { id:"lemonade-watermelon-basil",name:"Лимонад Арбуз–Базилик",category:"Напитки",variant:"0,34",price:130,branches:["konechnaya","airport"],comingSoon:true },
  { id:"berry-mors",name:"Морс ягодный",category:"Напитки",variant:"0,35",price:100,branches:["konechnaya","airport"] },
];

const initialStopList = {
  konechnaya: ["lemonade-cherry-yuzu","lemonade-mango-maracuya","lemonade-watermelon-basil"],
  airport: ["lemonade-cherry-yuzu","lemonade-mango-maracuya","lemonade-watermelon-basil"],
};

const fmt = (n) => `${n} ₽`;

const styles = {
  page:{minHeight:"100vh",padding:16,background:"#f8fafc",color:"#0f172a",boxSizing:"border-box"},
  wrap:{maxWidth:1280,margin:"0 auto"},
  top:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"},
  h1:{margin:0,fontSize:32},
  subtitle:{margin:"4px 0 0",color:"#64748b"},
  grid:{display:"grid",gridTemplateColumns:"minmax(0, 1.2fr) minmax(320px, 0.8fr)",gap:16},
  card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:24,padding:16,boxShadow:"0 1px 2px rgba(0,0,0,.04)"},
  button:{border:"none",borderRadius:14,padding:"10px 14px",cursor:"pointer",fontWeight:600},
  darkBtn:{background:"#0f172a",color:"white"},
  lightBtn:{background:"white",color:"#0f172a",border:"1px solid #cbd5e1"},
  dangerBtn:{background:"#dc2626",color:"white"},
  badge:{display:"inline-block",padding:"4px 10px",borderRadius:999,background:"#e2e8f0",fontSize:12},
  badgeDanger:{display:"inline-block",padding:"4px 10px",borderRadius:999,background:"#fee2e2",color:"#991b1b",fontSize:12},
  branchBtn:(active)=>({borderRadius:18,border:active?"1px solid #0f172a":"1px solid #e2e8f0",background:active?"#0f172a":"#fff",color:active?"#fff":"#0f172a",padding:16,textAlign:"left",cursor:"pointer"}),
  categoryBtn:(active)=>({borderRadius:999,border:"1px solid #cbd5e1",background:active?"#0f172a":"#fff",color:active?"#fff":"#0f172a",padding:"8px 12px",cursor:"pointer",whiteSpace:"nowrap"}),
  itemGrid:{display:"grid",gap:16,gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))"},
  itemCard:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:24,padding:16},
  input:{width:"100%",boxSizing:"border-box",borderRadius:14,border:"1px solid #cbd5e1",padding:12,fontSize:16},
  row:{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"},
  cartItem:{border:"1px solid #e2e8f0",borderRadius:18,padding:12},
  modalBg:{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:50},
  modal:{width:"100%",maxWidth:560,background:"#fff",borderRadius:24,padding:16,maxHeight:"85vh",overflow:"auto"},
};

function safeLoad(key,fallback){
  if (typeof window==="undefined") return fallback;
  try{
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}
function getMinutes(time){const [h,m]=time.split(":").map(Number);return h*60+m;}
function orderAllowed(branch){const now=new Date();return now.getHours()*60+now.getMinutes()<=getMinutes(branch.cutoff);}
function getDrinkSuggestion(branchId, stopList){
  const branchDrinks=items.filter(x=>x.category==="Напитки"&&x.branches.includes(branchId)&&!stopList[branchId]?.includes(x.id)&&!x.comingSoon);
  return branchDrinks.find(x=>x.id==="berry-mors")||branchDrinks[0]||null;
}
function getSuggestions(item, branchId, stopList){
  const available=(id)=>items.find(x=>x.id===id&&x.branches.includes(branchId)&&!stopList[branchId]?.includes(id)&&!x.comingSoon);
  const drink=getDrinkSuggestion(branchId, stopList);
  if(item.category==="Шаурма в лаваше") return [
    {id:"addon-cheese",name:"Сыр",price:50,category:"Добавки"},
    {id:"addon-fries",name:"Картофель фри",price:40,category:"Добавки"},
    {id:"addon-cheese-sauce",name:"Сырный соус",price:40,category:"Добавки"},
  ];
  if(item.category==="Бургеры") return [available("fries"),drink].filter(Boolean);
  if(item.category==="Хот-доги") return [drink].filter(Boolean);
  if(item.category==="Блюда во фритюре") return [available("sauce-cheese")||available("sauce-ketchup")||available("sauce-sweet-mustard"),drink].filter(Boolean);
  if(item.category==="Шашлык") return [available("garlic-sauce")].filter(Boolean);
  return [];
}
function StatusBadge({status}){
  const labelMap={new:"новый",accepted:"принят",preparing:"готовится",ready:"готов",completed:"выдан",canceled:"отменён"};
  return <span style={styles.badge}>{labelMap[status]||status}</span>;
}

export default function Home(){
  const [selectedBranchId,setSelectedBranchId]=useState(branches[0].id);
  const [activeCategory,setActiveCategory]=useState(categories[0]);
  const [query,setQuery]=useState("");
  const [stopList,setStopList]=useState(initialStopList);
  const [cart,setCart]=useState([]);
  const [favorites,setFavorites]=useState([]);
  const [orders,setOrders]=useState([]);
  const [selectedItem,setSelectedItem]=useState(null);
  const [selectedAddons,setSelectedAddons]=useState([]);
  const [adminMode,setAdminMode]=useState(false);

  useEffect(()=>{
    setSelectedBranchId(safeLoad(STORAGE_KEYS.branch, branches[0].id));
    setStopList(safeLoad(STORAGE_KEYS.stopList, initialStopList));
    setOrders(safeLoad(STORAGE_KEYS.orders, []));
    setFavorites(safeLoad(STORAGE_KEYS.favorites, []));
  },[]);

  useEffect(()=>{ if(typeof window!=="undefined") localStorage.setItem(STORAGE_KEYS.branch, JSON.stringify(selectedBranchId)); },[selectedBranchId]);
  useEffect(()=>{ if(typeof window!=="undefined") localStorage.setItem(STORAGE_KEYS.stopList, JSON.stringify(stopList)); },[stopList]);
  useEffect(()=>{ if(typeof window!=="undefined") localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders)); },[orders]);
  useEffect(()=>{ if(typeof window!=="undefined") localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites)); },[favorites]);

  const branch=branches.find(b=>b.id===selectedBranchId);
  const branchOrderAllowed=orderAllowed(branch);

  const branchItems=useMemo(()=>items.filter(item=>item.branches.includes(selectedBranchId)),[selectedBranchId]);
  const filteredItems=useMemo(()=>branchItems.filter(item=>{
    const matchesCategory=item.category===activeCategory;
    const hay=`${item.name} ${item.variant||""}`.toLowerCase();
    return matchesCategory&&hay.includes(query.toLowerCase());
  }),[branchItems,activeCategory,query]);

  const cartTotal=useMemo(()=>cart.reduce((sum,item)=>sum+item.totalPrice*item.qty,0),[cart]);
  const availableAddons=useMemo(()=>!selectedItem?[]:(selectedItem.addonGroup==="shawarma-chicken"?shawarmaAddonsChicken:shawarmaAddonsPork),[selectedItem]);
  const branchOrders=useMemo(()=>orders.filter(o=>o.branchId===selectedBranchId),[orders,selectedBranchId]);

  const toggleFavorite=(id)=>setFavorites(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const openItem=(item)=>{
    if(stopList[selectedBranchId]?.includes(item.id)||item.comingSoon) return;
    if(item.category==="Шаурма в лаваше"){ setSelectedItem(item); setSelectedAddons([]); return; }
    addToCart(item,[]);
  };

  const addToCart=(item,addons)=>{
    const addonTotal=addons.reduce((sum,a)=>sum+a.price,0);
    const entry={cartId:`${item.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,itemId:item.id,name:item.name,variant:item.variant,price:item.price,addons,qty:1,totalPrice:item.price+addonTotal,category:item.category};
    setCart(prev=>[...prev,entry]);
    setSelectedItem(null);
    setSelectedAddons([]);
  };

  const addSuggestionToCart=(suggestion)=>{
    if(suggestion.category==="Добавки"){
      const pseudo={...suggestion,itemId:suggestion.id,qty:1,addons:[],totalPrice:suggestion.price,cartId:`${suggestion.id}-${Date.now()}`};
      setCart(prev=>[...prev,pseudo]);
      return;
    }
    addToCart(suggestion,[]);
  };

  const updateQty=(cartId,delta)=>{
    setCart(prev=>prev.map(item=>item.cartId===cartId?{...item,qty:Math.max(0,item.qty+delta)}:item).filter(item=>item.qty>0));
  };

  const placeOrder=async()=>{
    if(!cart.length||!branchOrderAllowed) return;
    const orderId=`NV-${Date.now().toString().slice(-6)}`;

    const { error: orderError } = await supabase.from("orders").insert([{
      id: orderId,
      branch_id: selectedBranchId,
      branch_name: branch.name,
      status: "new",
      payment_method: "СБП",
      payment_status: "pending",
      total: cartTotal,
    }]);

    if(orderError){
      alert("Ошибка отправки заказа");
      console.error(orderError);
      return;
    }

    const itemsToInsert=cart.map(item=>({
      order_id:orderId,
      item_id:item.itemId,
      name:item.name,
      variant:item.variant||null,
      price:item.price,
      qty:item.qty,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
    if(itemsError){
      alert("Заказ создан, но позиции заказа не сохранились");
      console.error(itemsError);
      return;
    }

    const localOrder={id:orderId,branchId:selectedBranchId,branchName:branch.name,status:"new",paymentMethod:"СБП",paymentStatus:"pending",items:cart,total:cartTotal,createdAt:new Date().toLocaleString("ru-RU")};
    setOrders(prev=>[localOrder,...prev]);
    setCart([]);
    alert("Заказ отправлен");
  };

  const cancelOrder=(orderId)=>setOrders(prev=>prev.map(o=>o.id===orderId&&["new","accepted"].includes(o.status)?{...o,status:"canceled"}:o));
  const repeatOrder=(order)=>{ setSelectedBranchId(order.branchId); setCart(order.items.map(x=>({...x,cartId:`${x.itemId}-${Date.now()}-${Math.random()}`}))); };
  const toggleStop=(itemId)=>setStopList(prev=>{ const current=prev[selectedBranchId]||[]; return {...prev,[selectedBranchId]:current.includes(itemId)?current.filter(x=>x!==itemId):[...current,itemId]}; });
  const setOrderStatus=(orderId,status)=>setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status}:o));
  const currentSuggestions=cart.length?getSuggestions(items.find(i=>i.id===cart[cart.length-1].itemId)||{category:""},selectedBranchId,stopList):[];

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.h1}>На Виражах</h1>
            <p style={styles.subtitle}>MVP для запуска PWA-версии</p>
          </div>
          <button style={{...styles.button,...(adminMode?styles.darkBtn:styles.lightBtn)}} onClick={()=>setAdminMode(v=>!v)}>
            {adminMode ? "Режим клиента" : "Режим администратора"}
          </button>
        </div>

        <div style={styles.grid}>
          <div>
            <div style={styles.card}>
              <div style={styles.row}>
                <div>
                  <h2 style={{margin:"0 0 6px"}}>Выбор точки</h2>
                  <div style={{color:"#64748b"}}>Меню, заказы и стоп-лист учитывают выбранную точку</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,color:"#64748b"}}>Заказы до {branch.cutoff}</div>
                  <span style={branchOrderAllowed?styles.badge:styles.badgeDanger}>
                    {branchOrderAllowed ? "Открыто" : "Прием заказов завершен"}
                  </span>
                </div>
              </div>

              <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit, minmax(240px,1fr))",marginTop:16}}>
                {branches.map(b=>(
                  <button key={b.id} onClick={()=>setSelectedBranchId(b.id)} style={styles.branchBtn(selectedBranchId===b.id)}>
                    <div style={{fontWeight:700}}>{b.name}</div>
                    <div style={{marginTop:6,opacity:.8}}>{b.address}</div>
                    <div style={{marginTop:6,opacity:.8}}>
                      Телефон: <a href={`tel:${b.phone}`} style={{color:"inherit"}}>{b.phone}</a>
                    </div>
                    <div style={{marginTop:8,opacity:.8}}>{b.open}–{b.close} · заказы до {b.cutoff}</div>
                  </button>
                ))}
              </div>

              <div style={{marginTop:16}}>
                <input style={styles.input} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Поиск по меню" />
              </div>

              <div style={{display:"flex",gap:8,overflowX:"auto",marginTop:16,paddingBottom:4}}>
                {categories.map(category=>(
                  <button key={category} onClick={()=>setActiveCategory(category)} style={styles.categoryBtn(activeCategory===category)}>
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div style={{...styles.itemGrid,marginTop:16}}>
              {filteredItems.map(item=>{
                const stopped=stopList[selectedBranchId]?.includes(item.id);
                return (
                  <div key={item.id} style={styles.itemCard}>
                    <div style={styles.row}>
                      <div>
                        <div style={{fontSize:20,fontWeight:700}}>{item.name} {item.spicy?"🌶":""}</div>
                        <div style={{marginTop:6,color:"#64748b"}}>{item.variant?`${item.variant} · `:""}{fmt(item.price)}</div>
                      </div>
                      <button onClick={()=>toggleFavorite(item.id)} style={{border:"none",background:"transparent",fontSize:22,cursor:"pointer"}}>
                        {favorites.includes(item.id) ? "❤️" : "🤍"}
                      </button>
                    </div>

                    {item.description && <div style={{marginTop:12,color:"#475569",fontSize:14}}>{item.description}</div>}
                    {item.comingSoon && <div style={{marginTop:12}}><span style={styles.badge}>Скоро в продаже</span></div>}
                    {stopped && <div style={{marginTop:12}}><span style={styles.badgeDanger}>Стоп</span></div>}

                    <div style={{display:"flex",gap:8,marginTop:16}}>
                      <button style={{...styles.button,...styles.darkBtn,flex:1}} disabled={stopped||item.comingSoon||!branchOrderAllowed} onClick={()=>openItem(item)}>
                        {item.category==="Шаурма в лаваше" ? "Выбрать" : "В корзину"}
                      </button>
                      {adminMode && (
                        <button style={{...styles.button,...styles.lightBtn}} onClick={()=>toggleStop(item.id)}>
                          {stopped ? "Снять стоп" : "Стоп"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={styles.card}>
              <div style={{...styles.row,marginBottom:12}}>
                <h3 style={{margin:0}}>Корзина</h3>
                {cart.length>0 && <span style={styles.badge}>{cart.length} поз.</span>}
              </div>

              {cart.length===0 ? (
                <div style={{color:"#64748b"}}>Корзина пока пустая.</div>
              ) : (
                <>
                  <div style={{display:"grid",gap:12}}>
                    {cart.map(item=>(
                      <div key={item.cartId} style={styles.cartItem}>
                        <div style={styles.row}>
                          <div>
                            <div style={{fontWeight:700}}>{item.name}{item.variant?` · ${item.variant}`:""}</div>
                            {item.addons.length>0 && <div style={{marginTop:6,color:"#64748b",fontSize:14}}>{item.addons.map(a=>`${a.name} (+${fmt(a.price)})`).join(", ")}</div>}
                          </div>
                          <button onClick={()=>updateQty(item.cartId,-item.qty)} style={{...styles.button,...styles.lightBtn,padding:"6px 10px"}}>×</button>
                        </div>

                        <div style={{...styles.row,marginTop:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <button style={{...styles.button,...styles.lightBtn,padding:"6px 10px"}} onClick={()=>updateQty(item.cartId,-1)}>-</button>
                            <span>{item.qty}</span>
                            <button style={{...styles.button,...styles.lightBtn,padding:"6px 10px"}} onClick={()=>updateQty(item.cartId,1)}>+</button>
                          </div>
                          <div style={{fontWeight:700}}>{fmt(item.totalPrice*item.qty)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {currentSuggestions.length>0 && (
                    <div style={{marginTop:16}}>
                      <div style={{fontWeight:700,marginBottom:8}}>Рекомендуем добавить</div>
                      <div style={{display:"grid",gap:8}}>
                        {currentSuggestions.slice(0,3).map(s=>(
                          <div key={s.id} style={{...styles.row,border:"1px solid #e2e8f0",borderRadius:16,padding:10}}>
                            <div style={{fontSize:14}}>{s.name}{s.variant?` · ${s.variant}`:""}</div>
                            <button style={{...styles.button,...styles.darkBtn,padding:"8px 12px"}} onClick={()=>addSuggestionToCart(s)}>
                              + {fmt(s.price)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{...styles.row,marginTop:16,paddingTop:16,borderTop:"1px solid #e2e8f0",fontSize:20,fontWeight:700}}>
                    <span>Итого</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>

                  <button style={{...styles.button,...styles.darkBtn,width:"100%",marginTop:12}} onClick={placeOrder} disabled={!branchOrderAllowed}>
                    Оформить заказ
                  </button>
                </>
              )}
            </div>

            <div style={{...styles.card,marginTop:16}}>
              <h3 style={{marginTop:0}}>{adminMode ? "Заказы точки" : "Мои заказы"}</h3>

              {branchOrders.length===0 ? (
                <div style={{color:"#64748b"}}>Заказов пока нет.</div>
              ) : (
                <div style={{display:"grid",gap:12}}>
                  {branchOrders.map(order=>(
                    <div key={order.id} style={styles.cartItem}>
                      <div style={styles.row}>
                        <div>
                          <div style={{fontWeight:700}}>{order.id}</div>
                          <div style={{color:"#64748b",fontSize:14}}>{order.branchName}</div>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      <div style={{marginTop:8,color:"#64748b",fontSize:14}}>{order.createdAt}</div>
                      <div style={{marginTop:8,fontWeight:700}}>{fmt(order.total)}</div>

                      <div style={{marginTop:8,display:"grid",gap:4,fontSize:14,color:"#475569"}}>
                        {order.items.map((it,idx)=>(
                          <div key={idx}>• {it.name}{it.variant?` · ${it.variant}`:""} × {it.qty}</div>
                        ))}
                      </div>

                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                        {!adminMode && <button style={{...styles.button,...styles.lightBtn}} onClick={()=>repeatOrder(order)}>Повторить</button>}
                        {!adminMode && ["new","accepted"].includes(order.status) && <button style={{...styles.button,...styles.dangerBtn}} onClick={()=>cancelOrder(order.id)}>Отменить</button>}
                        {adminMode && (
                          <>
                            <button style={{...styles.button,...styles.lightBtn}} onClick={()=>setOrderStatus(order.id,"accepted")}>Принят</button>
                            <button style={{...styles.button,...styles.lightBtn}} onClick={()=>setOrderStatus(order.id,"preparing")}>Готовится</button>
                            <button style={{...styles.button,...styles.lightBtn}} onClick={()=>setOrderStatus(order.id,"ready")}>Готов</button>
                            <button style={{...styles.button,...styles.lightBtn}} onClick={()=>setOrderStatus(order.id,"completed")}>Выдан</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedItem && (
          <div style={styles.modalBg} onClick={()=>setSelectedItem(null)}>
            <div style={styles.modal} onClick={(e)=>e.stopPropagation()}>
              <div style={{...styles.row}}>
                <h3 style={{margin:0}}>{selectedItem.name}{selectedItem.variant?` · ${selectedItem.variant}`:""}</h3>
                <button style={{...styles.button,...styles.lightBtn}} onClick={()=>setSelectedItem(null)}>Закрыть</button>
              </div>

              <p style={{color:"#64748b",marginTop:8}}>Выберите добавки. Общая цена пересчитывается автоматически.</p>

              <div style={{display:"grid",gap:8,marginTop:12}}>
                {availableAddons.map(addon=>{
                  const checked=selectedAddons.some(a=>a.id===addon.id);
                  return (
                    <label key={addon.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #e2e8f0",borderRadius:16,padding:12,cursor:"pointer"}}>
                      <div>
                        <div style={{fontWeight:700}}>{addon.name}</div>
                        <div style={{fontSize:14,color:"#64748b"}}>+{fmt(addon.price)}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={()=>{
                          setSelectedAddons(prev=>checked?prev.filter(a=>a.id!==addon.id):[...prev,addon]);
                        }}
                      />
                    </label>
                  );
                })}
              </div>

              <div style={{...styles.row,marginTop:16,fontSize:20,fontWeight:700}}>
                <span>Итого</span>
                <span>{fmt((selectedItem?.price||0)+selectedAddons.reduce((sum,addon)=>sum+addon.price,0))}</span>
              </div>

              <button style={{...styles.button,...styles.darkBtn,width:"100%",marginTop:16}} onClick={()=>selectedItem&&addToCart(selectedItem,selectedAddons)}>
                Добавить в корзину
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
