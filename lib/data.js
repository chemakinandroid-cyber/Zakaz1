export const MAX_ACTIVE_ORDERS = 10;
export const LOCAL_TIMEZONE = "Asia/Irkutsk";
export const AUDIO_ENABLED_DEFAULT = true;

export const STORAGE_KEYS = {
  branch: "na-virazhah.branch",
  favorites: "na-virazhah.favorites",
  client_orders: "na-virazhah.client-orders",
  audio_enabled: "na-virazhah.audio-enabled",
};

export const branches = [
  {
    id: "konechnaya",
    name: "На Виражах — Конечная",
    shortName: "Конечная",
    address: "ул. Конечная, 10/4",
    phone: "+79085932688",
    open: "10:00",
    close: "22:00",
    cutoff: "21:30",
  },
  {
    id: "airport",
    name: "На Виражах — Аэропорт",
    shortName: "Аэропорт",
    address: "п. Аэропорт, 7",
    phone: "+79024524222",
    open: "10:00",
    close: "21:00",
    cutoff: "20:30",
  },
];

export const categories = [
  "Шаурма в лаваше",
  "Бургеры",
  "Хот-доги",
  "Шашлык",
  "Кесадилья",
  "Блюда во фритюре",
  "Соусы",
  "Напитки",
];

export const shawarmaAddonsChicken = [
  { id: "extra-chicken", name: "Курица 70 г", price: 60 },
  { id: "fries-addon", name: "Картофель фри", price: 40 },
  { id: "jalapeno", name: "Перец острый халапеньо", price: 40 },
  { id: "pickles", name: "Огурцы маринованные", price: 40 },
  { id: "mustard", name: "Сладкая горчица", price: 40 },
  { id: "cheese", name: "Сыр", price: 50 },
  { id: "cheese-sauce", name: "Сырный соус", price: 40 },
  { id: "crispy-onion", name: "Лук фри", price: 40 },
];

export const shawarmaAddonsPork = [
  { id: "extra-pork", name: "Свинина 70 г", price: 60 },
  { id: "fries-addon", name: "Картофель фри", price: 40 },
  { id: "jalapeno", name: "Перец острый халапеньо", price: 40 },
  { id: "pickles", name: "Огурцы маринованные", price: 40 },
  { id: "mustard", name: "Сладкая горчица", price: 40 },
  { id: "cheese", name: "Сыр", price: 50 },
  { id: "cheese-sauce", name: "Сырный соус", price: 40 },
  { id: "crispy-onion", name: "Лук фри", price: 40 },
];

export const items = [
  { id: "shawarma-na-virazhah-chicken", name: "Шаурма «На Виражах»", category: "Шаурма в лаваше", variant: "курица", price: 260, spicy: false, branches: ["konechnaya", "airport"], description: "Курица, помидоры, огурцы, пекинская капуста, фирменный соус", addonGroup: "shawarma-chicken" },
  { id: "shawarma-na-virazhah-pork", name: "Шаурма «На Виражах»", category: "Шаурма в лаваше", variant: "свинина", price: 270, spicy: false, branches: ["konechnaya", "airport"], description: "Свинина, помидоры, огурцы, пекинская капуста, фирменный соус", addonGroup: "shawarma-pork" },
  { id: "shawarma-caesario", name: "Шаурма «Цезарио»", category: "Шаурма в лаваше", variant: "курица", price: 290, spicy: false, branches: ["konechnaya", "airport"], description: "Курица, помидоры, пекинская капуста, твёрдый сыр, фирменный соус, сухарики", addonGroup: "shawarma-chicken" },
  { id: "shawarma-redjet-chicken", name: "Шаурма «Ред.Джет»", category: "Шаурма в лаваше", variant: "курица", price: 290, spicy: true, branches: ["konechnaya", "airport"], description: "Курица, огурцы, помидоры, пекинская капуста, фирменный и острый соусы, халапеньо", addonGroup: "shawarma-chicken" },
  { id: "shawarma-redjet-pork", name: "Шаурма «Ред.Джет»", category: "Шаурма в лаваше", variant: "свинина", price: 320, spicy: true, branches: ["konechnaya", "airport"], description: "Свинина, огурцы, помидоры, пекинская капуста, фирменный и острый соусы, халапеньо", addonGroup: "shawarma-pork" },

  { id: "burger-chicken-cargo", name: "Чикен Карго", category: "Бургеры", price: 300, branches: ["konechnaya", "airport"] },
  { id: "burger-cheeseburger", name: "Чизбургер", category: "Бургеры", price: 299, branches: ["konechnaya", "airport"] },
  { id: "burger-double-cheese", name: "Двойной чизбургер", category: "Бургеры", price: 429, branches: ["konechnaya", "airport"] },
  { id: "burger-forsage", name: "Форсаж", category: "Бургеры", price: 319, branches: ["konechnaya", "airport"] },
  { id: "burger-cool-forsage", name: "Крутой Форсаж", category: "Бургеры", price: 399, branches: ["konechnaya", "airport"] },
  { id: "burger-cheesy", name: "Сырный", category: "Бургеры", price: 349, branches: ["konechnaya", "airport"] },

  { id: "hotdog-danish", name: "Датский классический", category: "Хот-доги", price: 230, branches: ["konechnaya", "airport"] },
  { id: "hotdog-austrian", name: "Австрийский", category: "Хот-доги", price: 230, branches: ["konechnaya", "airport"] },
  { id: "hotdog-chili", name: "Чили", category: "Хот-доги", price: 260, branches: ["konechnaya", "airport"] },
  { id: "hotdog-three-peppers", name: "Три перца и сыр", category: "Хот-доги", price: 270, branches: ["konechnaya", "airport"] },

  { id: "shashlik-neck", name: "Шашлык из свиной шеи", category: "Шашлык", price: 400, branches: ["konechnaya", "airport"] },
  { id: "quesadilla", name: "Кесадилья сырная / острая", category: "Кесадилья", price: 260, branches: ["konechnaya", "airport"] },

  { id: "fried-wings", name: "Куриные крылышки", category: "Блюда во фритюре", price: 399, branches: ["konechnaya", "airport"] },
  { id: "fried-shrimp", name: "Креветки", category: "Блюда во фритюре", price: 300, branches: ["konechnaya", "airport"] },
  { id: "strips-3", name: "Стрипсы куриные", category: "Блюда во фритюре", variant: "3 шт", price: 190, branches: ["konechnaya", "airport"] },
  { id: "strips-6", name: "Стрипсы куриные", category: "Блюда во фритюре", variant: "6 шт", price: 370, branches: ["konechnaya", "airport"] },
  { id: "fries", name: "Картофель фри", category: "Блюда во фритюре", variant: "100 г", price: 150, branches: ["konechnaya", "airport"] },
  { id: "village-potato", name: "Картофель по-деревенски", category: "Блюда во фритюре", variant: "100 г", price: 150, branches: ["konechnaya", "airport"] },
  { id: "cheese-sticks", name: "Сырные палочки", category: "Блюда во фритюре", price: 250, branches: ["konechnaya", "airport"] },
  { id: "nuggets", name: "Наггетсы", category: "Блюда во фритюре", price: 170, branches: ["konechnaya", "airport"] },

  { id: "garlic-sauce", name: "Чесночный", category: "Соусы", variant: "100 мл", price: 60, branches: ["konechnaya", "airport"] },
  { id: "sauce-ketchup", name: "Кетчуп", category: "Соусы", variant: "30 мл", price: 45, branches: ["konechnaya", "airport"] },
  { id: "sauce-cheese", name: "Сырный", category: "Соусы", variant: "30 мл", price: 45, branches: ["konechnaya", "airport"] },
  { id: "sauce-sweet-mustard", name: "Сладкий горчичный", category: "Соусы", variant: "30 мл", price: 45, branches: ["konechnaya", "airport"] },

  { id: "coffee-espresso", name: "Эспрессо", category: "Напитки", variant: "60 мл", price: 100, branches: ["konechnaya"] },
  { id: "coffee-double-espresso", name: "Двойной эспрессо", category: "Напитки", price: 120, branches: ["konechnaya"] },
  { id: "coffee-cappuccino", name: "Капучино", category: "Напитки", variant: "300 мл", price: 210, branches: ["konechnaya"] },
  { id: "coffee-latte", name: "Латте", category: "Напитки", variant: "300 мл", price: 200, branches: ["konechnaya"] },
  { id: "coffee-americano", name: "Американо", category: "Напитки", variant: "300 мл", price: 190, branches: ["konechnaya"] },

  { id: "lemonade-cherry-yuzu", name: "Лимонад Вишня–Юзу", category: "Напитки", variant: "0,34", price: 130, branches: ["konechnaya", "airport"], comingSoon: true },
  { id: "lemonade-mango-maracuya", name: "Лимонад Манго–Маракуйя", category: "Напитки", variant: "0,34", price: 130, branches: ["konechnaya", "airport"], comingSoon: true },
  { id: "lemonade-watermelon-basil", name: "Лимонад Арбуз–Базилик", category: "Напитки", variant: "0,34", price: 130, branches: ["konechnaya", "airport"], comingSoon: true },
  { id: "berry-mors", name: "Морс ягодный", category: "Напитки", variant: "0,35", price: 100, branches: ["konechnaya", "airport"] },
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
    timeZone: LOCAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function orderAllowed(branch) {
  const [h, m] = branch.cutoff.split(":").map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() <= h * 60 + m;
}

export function getSuggestions(item) {
  if (item.category === "Шаурма в лаваше") {
    return [
      { id: "addon-cheese", name: "Сыр", price: 50, category: "Добавки" },
      { id: "addon-fries", name: "Картофель фри", price: 40, category: "Добавки" },
      { id: "addon-cheese-sauce", name: "Сырный соус", price: 40, category: "Добавки" },
    ];
  }
  if (item.category === "Бургеры") {
    return [
      { id: "addon-fries-burger", name: "Картофель фри", price: 150, category: "Добавки" },
      { id: "addon-mors-burger", name: "Морс ягодный", price: 100, category: "Добавки" },
    ];
  }
  if (item.category === "Шашлык") {
    return [
      { id: "addon-garlic-shashlik", name: "Чесночный соус 100 мл", price: 60, category: "Добавки" },
    ];
  }
  return [];
}

export const styles = {
  page: { minHeight: "100vh", padding: 16, background: "linear-gradient(180deg, #08111f 0%, #111827 100%)", color: "#eef2ff", boxSizing: "border-box" },
  wrap: { maxWidth: 1360, margin: "0 auto" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: 34, letterSpacing: "-0.04em" },
  subtitle: { margin: "4px 0 0", color: "#94a3b8" },
  card: { background: "rgba(15, 23, 42, 0.92)", border: "1px solid #1f2937", borderRadius: 24, padding: 16, boxShadow: "0 18px 40px rgba(0,0,0,.28)" },
  button: { border: "none", borderRadius: 14, padding: "10px 14px", cursor: "pointer", fontWeight: 700 },
  darkBtn: { background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#111827" },
  lightBtn: { background: "#0f172a", color: "#eef2ff", border: "1px solid #334155" },
  dangerBtn: { background: "#dc2626", color: "#fff" },
  successBtn: { background: "#16a34a", color: "#fff" },
  badge: { display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#1f2937", color: "#eef2ff", fontSize: 12 },
  badgeDanger: { display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#450a0a", color: "#fecaca", fontSize: 12 },
  badgeWarn: { display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#78350f", color: "#fde68a", fontSize: 12 },
  badgeSuccess: { display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#052e16", color: "#86efac", fontSize: 12 },
  branchBtn: (active) => ({
    borderRadius: 20,
    border: active ? "1px solid #f59e0b" : "1px solid #334155",
    background: active ? "linear-gradient(180deg,#1f2937,#111827)" : "#0f172a",
    color: "#eef2ff",
    padding: 16,
    textAlign: "left",
    cursor: "pointer",
  }),
  categoryBtn: (active) => ({
    borderRadius: 999,
    border: active ? "1px solid #f59e0b" : "1px solid #334155",
    background: active ? "#f59e0b" : "#0f172a",
    color: active ? "#111827" : "#eef2ff",
    padding: "8px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 700,
  }),
  itemCard: { background: "linear-gradient(180deg,#111827,#0f172a)", border: "1px solid #1f2937", borderRadius: 24, padding: 16 },
  input: { width: "100%", boxSizing: "border-box", borderRadius: 14, border: "1px solid #334155", padding: 12, fontSize: 16, background: "#0b1220", color: "#eef2ff" },
  row: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  cartItem: { border: "1px solid #1f2937", borderRadius: 18, padding: 12, background: "#0b1220" },
  modalBg: { position: "fixed", inset: 0, background: "rgba(2,6,23,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 },
  modal: { width: "100%", maxWidth: 560, background: "#111827", border: "1px solid #1f2937", borderRadius: 24, padding: 16, maxHeight: "85vh", overflow: "auto", color: "#eef2ff" },
};
