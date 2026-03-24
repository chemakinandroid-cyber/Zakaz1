export const MAX_ACTIVE_ORDERS = 10;
export const STORAGE_KEYS = {
  branch: "na-virazhah.branch",
  favorites: "na-virazhah.favorites",
  client_orders: "na-virazhah.client-orders",
  audio_enabled: "na-virazhah.audio-enabled"
};
export const branches = [
  { id:"konechnaya", name:"На Виражах — Конечная", address:"ул. Конечная, 10/4", phone:"+79085932688", open:"10:00", close:"22:00", cutoff:"21:30" },
  { id:"airport", name:"На Виражах — Аэропорт", address:"п. Аэропорт, 7", phone:"+79024524222", open:"10:00", close:"21:00", cutoff:"20:30" }
];
export const categories = [
  { key:"Шаурма в лаваше", emoji:"🌯" }, { key:"Бургеры", emoji:"🍔" }, { key:"Хот-доги", emoji:"🌭" }, { key:"Шашлык", emoji:"🍢" },
  { key:"Кесадилья", emoji:"🫓" }, { key:"Блюда во фритюре", emoji:"🍟" }, { key:"Соусы", emoji:"🥫" }, { key:"Напитки", emoji:"🥤" }
];
export const shawarmaAddonsChicken = [
  { id:"extra-chicken", name:"Курица 70 г", price:60 }, { id:"fries-addon", name:"Картофель фри", price:40 }, { id:"jalapeno", name:"Перец острый халапеньо", price:40 },
  { id:"pickles", name:"Огурцы маринованные", price:40 }, { id:"mustard", name:"Сладкая горчица", price:40 }, { id:"cheese", name:"Сыр", price:50 },
  { id:"cheese-sauce", name:"Сырный соус", price:40 }, { id:"crispy-onion", name:"Лук фри", price:40 }
];
export const shawarmaAddonsPork = [
  { id:"extra-pork", name:"Свинина 70 г", price:60 }, { id:"fries-addon", name:"Картофель фри", price:40 }, { id:"jalapeno", name:"Перец острый халапеньо", price:40 },
  { id:"pickles", name:"Огурцы маринованные", price:40 }, { id:"mustard", name:"Сладкая горчица", price:40 }, { id:"cheese", name:"Сыр", price:50 },
  { id:"cheese-sauce", name:"Сырный соус", price:40 }, { id:"crispy-onion", name:"Лук фри", price:40 }
];
export const items = [
  { id:"shawarma-na-virazhah-chicken", name:"Шаурма «На Виражах»", category:"Шаурма в лаваше", variant:"курица", price:260, branches:["konechnaya","airport"], description:"Курица, помидоры, огурцы, пекинская капуста, фирменный соус", addonGroup:"shawarma-chicken", badge:"Хит", popular:true },
  { id:"shawarma-na-virazhah-pork", name:"Шаурма «На Виражах»", category:"Шаурма в лаваше", variant:"свинина", price:270, branches:["konechnaya","airport"], description:"Свинина, помидоры, огурцы, пекинская капуста, фирменный соус", addonGroup:"shawarma-pork", popular:true },
  { id:"shawarma-caesario", name:"Шаурма «Цезарио»", category:"Шаурма в лаваше", variant:"курица", price:290, branches:["konechnaya","airport"], description:"Курица, твердый сыр, сухарики", addonGroup:"shawarma-chicken" },
  { id:"shawarma-redjet-chicken", name:"Шаурма «Ред.Джет»", category:"Шаурма в лаваше", variant:"курица", price:290, branches:["konechnaya","airport"], description:"Курица, острый соус, халапеньо", addonGroup:"shawarma-chicken", badge:"Острое" },
  { id:"shawarma-redjet-pork", name:"Шаурма «Ред.Джет»", category:"Шаурма в лаваше", variant:"свинина", price:320, branches:["konechnaya","airport"], description:"Свинина, острый соус, халапеньо", addonGroup:"shawarma-pork", badge:"Острое" },
  { id:"burger-chicken-cargo", name:"Чикен Карго", category:"Бургеры", price:300, branches:["konechnaya","airport"], badge:"Топ", popular:true },
  { id:"burger-cheeseburger", name:"Чизбургер", category:"Бургеры", price:299, branches:["konechnaya","airport"] },
  { id:"burger-double-cheese", name:"Двойной чизбургер", category:"Бургеры", price:429, branches:["konechnaya","airport"], badge:"Сытный" },
  { id:"burger-forsage", name:"Форсаж", category:"Бургеры", price:319, branches:["konechnaya","airport"] },
  { id:"burger-cool-forsage", name:"Крутой Форсаж", category:"Бургеры", price:399, branches:["konechnaya","airport"] },
  { id:"burger-cheesy", name:"Сырный", category:"Бургеры", price:349, branches:["konechnaya","airport"] },
  { id:"hotdog-danish", name:"Датский классический", category:"Хот-доги", price:230, branches:["konechnaya","airport"] },
  { id:"hotdog-austrian", name:"Австрийский", category:"Хот-доги", price:230, branches:["konechnaya","airport"] },
  { id:"hotdog-chili", name:"Чили", category:"Хот-доги", price:260, branches:["konechnaya","airport"], badge:"Острый" },
  { id:"hotdog-three-peppers", name:"Три перца и сыр", category:"Хот-доги", price:270, branches:["konechnaya","airport"] },
  { id:"shashlik-neck", name:"Шашлык из свиной шеи", category:"Шашлык", price:400, branches:["konechnaya","airport"], popular:true },
  { id:"quesadilla", name:"Кесадилья сырная / острая", category:"Кесадилья", price:260, branches:["konechnaya","airport"] },
  { id:"fried-wings", name:"Куриные крылышки", category:"Блюда во фритюре", price:399, branches:["konechnaya","airport"] },
  { id:"fried-shrimp", name:"Креветки", category:"Блюда во фритюре", price:300, branches:["konechnaya","airport"] },
  { id:"strips-3", name:"Стрипсы куриные", category:"Блюда во фритюре", variant:"3 шт", price:190, branches:["konechnaya","airport"] },
  { id:"strips-6", name:"Стрипсы куриные", category:"Блюда во фритюре", variant:"6 шт", price:370, branches:["konechnaya","airport"] },
  { id:"fries", name:"Картофель фри", category:"Блюда во фритюре", variant:"100 г", price:150, branches:["konechnaya","airport"], popular:true },
  { id:"village-potato", name:"Картофель по-деревенски", category:"Блюда во фритюре", variant:"100 г", price:150, branches:["konechnaya","airport"] },
  { id:"cheese-sticks", name:"Сырные палочки", category:"Блюда во фритюре", price:250, branches:["konechnaya","airport"] },
  { id:"nuggets", name:"Наггетсы", category:"Блюда во фритюре", price:170, branches:["konechnaya","airport"] },
  { id:"garlic-sauce", name:"Чесночный", category:"Соусы", variant:"100 мл", price:60, branches:["konechnaya","airport"] },
  { id:"sauce-ketchup", name:"Кетчуп", category:"Соусы", variant:"30 мл", price:45, branches:["konechnaya","airport"] },
  { id:"sauce-cheese", name:"Сырный", category:"Соусы", variant:"30 мл", price:45, branches:["konechnaya","airport"] },
  { id:"sauce-sweet-mustard", name:"Сладкий горчичный", category:"Соусы", variant:"30 мл", price:45, branches:["konechnaya","airport"] },
  { id:"coffee-espresso", name:"Эспрессо", category:"Напитки", variant:"60 мл", price:100, branches:["konechnaya"] },
  { id:"coffee-double-espresso", name:"Двойной эспрессо", category:"Напитки", price:120, branches:["konechnaya"] },
  { id:"coffee-cappuccino", name:"Капучино", category:"Напитки", variant:"300 мл", price:210, branches:["konechnaya"] },
  { id:"coffee-latte", name:"Латте", category:"Напитки", variant:"300 мл", price:200, branches:["konechnaya"] },
  { id:"coffee-americano", name:"Американо", category:"Напитки", variant:"300 мл", price:190, branches:["konechnaya"] },
  { id:"berry-mors", name:"Морс ягодный", category:"Напитки", variant:"0,35", price:100, branches:["konechnaya","airport"], popular:true }
];
export const fmt=(n)=>`${n} ₽`;
export function safeLoad(key,fallback){ if(typeof window==="undefined") return fallback; try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch{return fallback;} }
export function formatDateTime(value){ if(!value) return ""; return new Date(value).toLocaleString("ru-RU",{year:"2-digit",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}); }
export function orderAllowed(branch){ const [h,m]=branch.cutoff.split(":").map(Number); const now=new Date(); return now.getHours()*60+now.getMinutes()<=h*60+m; }
export function getTimerMinutes(order){ const base=order.confirmed_at&&["accepted","preparing","ready"].includes(order.status)?order.confirmed_at:order.created_at; if(!base) return 0; return Math.max(0,Math.floor((Date.now()-new Date(base).getTime())/60000)); }
export function getSuggestions(item){ if(!item) return []; if(item.category==="Шаурма в лаваше") return [{id:"addon-cheese",name:"Сыр",price:50},{id:"addon-cheese-sauce",name:"Сырный соус",price:40}]; if(item.category==="Бургеры") return [{id:"addon-fries",name:"Картофель фри",price:150},{id:"addon-mors",name:"Морс ягодный",price:100}]; if(item.category==="Шашлык") return [{id:"addon-garlic",name:"Чесночный соус 100 мл",price:60}]; return []; }
