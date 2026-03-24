import type { CartItem } from './types';

export const STORAGE_KEYS = {
  branch: 'na-virazhah.branch',
  cart: 'na-virazhah.cart',
  orders: 'na-virazhah.orders',
  stopList: 'na-virazhah.stop-list',
  soundEnabled: 'na-virazhah.sound-enabled'
} as const;

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return safeJsonParse<T>(window.localStorage.getItem(key), fallback);
}

export function writeLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateCartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}
