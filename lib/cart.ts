import { STORAGE_KEYS, calculateCartTotal, generateId, readLocal, writeLocal } from './storage';
import { getStopList } from './stoplist';
import type { BranchId, CartItem, Product } from './types';

export const CART_CHANNEL = 'na-virazhah-cart';

export function getCart(): CartItem[] {
  return readLocal<CartItem[]>(STORAGE_KEYS.cart, []);
}

export function saveCart(cart: CartItem[]) {
  writeLocal(STORAGE_KEYS.cart, cart);
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CART_CHANNEL);
    channel.postMessage({ type: 'cart-updated' });
    channel.close();
  }
}

export function addToCart(params: {
  branch: BranchId;
  product: Product;
  optionId?: string;
  optionName?: string;
  optionPrice?: number;
}) {
  const cart = getCart();
  const price = params.optionPrice ?? params.product.price;
  const existing = cart.find(
    (item) =>
      item.branch === params.branch && item.productId === params.product.id && item.optionId === params.optionId
  );

  if (existing) {
    saveCart(cart.map((item) => (item.uid === existing.uid ? { ...item, qty: item.qty + 1 } : item)));
    return;
  }

  cart.push({
    uid: generateId('cart'),
    productId: params.product.id,
    name: params.product.name,
    price,
    qty: 1,
    branch: params.branch,
    optionId: params.optionId,
    optionName: params.optionName
  });
  saveCart(cart);
}

export function updateCartItemQty(uid: string, qty: number) {
  const next = getCart()
    .map((item) => (item.uid === uid ? { ...item, qty } : item))
    .filter((item) => item.qty > 0);
  saveCart(next);
}

export function removeCartItem(uid: string) {
  saveCart(getCart().filter((item) => item.uid !== uid));
}

export function clearCart(branch?: BranchId) {
  if (!branch) {
    saveCart([]);
    return;
  }
  saveCart(getCart().filter((item) => item.branch !== branch));
}

export function getCartTotal(branch: BranchId) {
  return calculateCartTotal(getCart().filter((item) => item.branch === branch));
}

export function validateCartAgainstStopList(branch: BranchId, cart: CartItem[]) {
  const stopList = getStopList();
  const blockedIds = new Set(stopList[branch] ?? []);
  const unavailable = cart.filter((item) => blockedIds.has(item.productId));
  return {
    ok: unavailable.length === 0,
    unavailable
  };
}
