export const MAX_ACTIVE_ORDERS = 10;

export const STORAGE_KEYS = {
  branch: "na-virazhah.branch",
  favorites: "na-virazhah.favorites",
  client_orders: "na-virazhah.client-orders",
  audio_enabled: "na-virazhah.audio-enabled"
};

export const branches = [
  { id: "konechnaya", name: "На Виражах — Конечная", address: "ул. Конечная, 10/4", phone: "+79085932688", open: "10:00", close: "22:00", cutoff: "21:30" },
  { id: "airport", name: "На Виражах — Аэропорт", address: "п. Аэропорт, 7", phone: "+79024524222", open: "10:00", close: "21:00", cutoff: "20:30" }
];

export const categories = [
  { key: "Шаурма в лаваше", emoji: "🌯" },
  { key: "Бургеры", emoji: "🍔" },
  { key: "Хот-доги", emoji: "🌭" },
  { key: "Шашлык", emoji: "🍢" },
  { key: "Блюда во фритюре", emoji: "🍟" },
  { key: "Напитки", emoji: "🥤" }
];

export const items = [
  { id: "shawarma1", name: "Шаурма «На Виражах»", category: "Шаурма в лаваше", variant: "курица", price: 260, branches: ["konechnaya","airport"], description: "Курица, овощи, фирменный соус", badge: "Хит", popular: true },
  { id: "shawarma2", name: "Шаурма «Ред.Джет»", category: "Шаурма в лаваше", variant: "свинина", price: 320, branches: ["konechnaya","airport"], description: "Свинина, овощи, острый соус", badge: "Острое" },
  { id: "burger1", name: "Чикен Карго", category: "Бургеры", price: 300, branches: ["konechnaya","airport"], description: "Куриная котлета, соус, сыр", badge: "Топ", popular: true },
  { id: "burger2", name: "Двойной чизбургер", category: "Бургеры", price: 429, branches: ["konechnaya","airport"], description: "Две котлеты, сыр, соус" },
  { id: "hotdog1", name: "Датский классический", category: "Хот-доги", price: 230, branches: ["konechnaya","airport"], description: "Сосиска гриль, соус" },
  { id: "fries", name: "Картофель фри", category: "Блюда во фритюре", price: 150, branches: ["konechnaya","airport"], description: "100 г", popular: true },
  { id: "shashlik", name: "Шашлык из свиной шеи", category: "Шашлык", price: 400, branches: ["konechnaya","airport"], description: "Сочный шашлык", popular: true },
  { id: "mors", name: "Морс ягодный", category: "Напитки", price: 100, branches: ["konechnaya","airport"], description: "0,35 л", popular: true }
];

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

export function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ru-RU", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function orderAllowed(branch) {
  const [h, m] = branch.cutoff.split(":").map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() <= h * 60 + m;
}

export function getTimerMinutes(order) {
  const base = order.confirmed_at && ["accepted","preparing","ready"].includes(order.status)
    ? order.confirmed_at
    : order.created_at;
  if (!base) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(base).getTime()) / 60000));
}

export function getSuggestions(item) {
  if (!item) return [];
  if (item.category === "Шаурма в лаваше") return [{ id:"s1", name:"Сыр", price:50 }, { id:"s2", name:"Сырный соус", price:40 }];
  if (item.category === "Бургеры") return [{ id:"s3", name:"Картофель фри", price:150 }, { id:"s4", name:"Морс ягодный", price:100 }];
  return [];
}
