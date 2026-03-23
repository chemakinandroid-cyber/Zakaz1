export const STORAGE_KEYS = {
  branch: "na-virazhah.branch",
  favorites: "na-virazhah.favorites",
  client_orders: "na-virazhah.client-orders",
};

export const branches = [
  { id: "konechnaya", name: "На Виражах — Конечная", address: "ул. Конечная, 10/4", phone: "+79085932688", open: "10:00", close: "22:00", cutoff: "21:30" },
  { id: "airport", name: "На Виражах — Аэропорт", address: "п. Аэропорт, 7", phone: "+79024524222", open: "10:00", close: "21:00", cutoff: "20:30" },
];

export const categories = ["Шаурма в лаваше","Бургеры","Хот-доги","Шашлык","Кесадилья","Блюда во фритюре","Соусы","Напитки"];

export const shawarmaAddonsChicken = [
  { id: "extra-chicken", name: "Курица 70 г", price: 60 },
  { id: "fries-addon", name: "Картофель фри", price: 40 },
  { id: "jalapeno", name: "Перец острый халапеньо", price: 40 },
  { id: "pickles", name: "Огурцы маринованные", price: 40 },
  { id: "mustard", name: "Сладкая горчица", price: 40 },
  { id: "cheese", name: "Сыр", price: 50 },
  { id: "cheese-sauce", name: "Сырный соус", price: 40 },
  { id: "crispy-onion", name: "Лук фри", price: 40 }
];

export const shawarmaAddonsPork = [
  { id: "extra-pork", name: "Свинина 70 г", price: 60 },
  { id: "fries-addon", name: "Картофель фри", price: 40 },
  { id: "jalapeno", name: "Перец острый халапеньо", price: 40 },
  { id: "pickles", name: "Огурцы маринованные", price: 40 },
  { id: "mustard", name: "Сладкая горчица", price: 40 },
  { id: "cheese", name: "Сыр", price: 50 },
  { id: "cheese-sauce", name: "Сырный соус", price: 40 },
  { id: "crispy-onion", name: "Лук фри", price: 40 }
];

export const items = [
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
  { id:"berry-mors",name:"Морс ягодный",category:"Напитки",variant:"0,35",price:100,branches:["konechnaya","airport"] }
];

export const initialStopList = {
  konechnaya: ["lemonade-cherry-yuzu", "lemonade-mango-maracuya", "lemonade-watermelon-basil"],
  airport: ["lemonade-cherry-yuzu", "lemonade-mango-maracuya", "lemonade-watermelon-basil"],
};

export const fmt = (n) => `${n} ₽`;
export function safeLoad(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function getMinutes(time) { const [h,m] = time.split(":").map(Number); return h*60+m; }
export function orderAllowed(branch) { const now=new Date(); return now.getHours()*60+now.getMinutes()<=getMinutes(branch.cutoff); }
export function getDrinkSuggestion(branchId, stopList) {
  const branchDrinks = items.filter((x) => x.category === "Напитки" && x.branches.includes(branchId) && !stopList[branchId]?.includes(x.id) && !x.comingSoon);
  return branchDrinks.find((x) => x.id === "berry-mors") || branchDrinks[0] || null;
}
export function getSuggestions(item, branchId, stopList) {
  const available = (id) => items.find((x) => x.id === id && x.branches.includes(branchId) && !stopList[branchId]?.includes(id) && !x.comingSoon);
  const drink = getDrinkSuggestion(branchId, stopList);
  if (item.category === "Шаурма в лаваше") return [{ id:"addon-cheese",name:"Сыр",price:50,category:"Добавки" },{ id:"addon-fries",name:"Картофель фри",price:40,category:"Добавки" },{ id:"addon-cheese-sauce",name:"Сырный соус",price:40,category:"Добавки" }];
  if (item.category === "Бургеры") return [available("fries"), drink].filter(Boolean);
  if (item.category === "Хот-доги") return [drink].filter(Boolean);
  if (item.category === "Блюда во фритюре") return [available("sauce-cheese") || available("sauce-ketchup") || available("sauce-sweet-mustard"), drink].filter(Boolean);
  if (item.category === "Шашлык") return [available("garlic-sauce")].filter(Boolean);
  return [];
}

export const styles = {
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
