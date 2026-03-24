import { STORAGE_KEYS, readLocal, writeLocal, generateId } from "./storage";
import { getStopList } from "./stoplist";
import type { BranchId, CartItem, Product } from "./types";

export function getCart(): CartItem[] {
  return readLocal<CartItem[]>(STORAGE_KEYS.CART, []);
}

export function saveCart(cart: CartItem[]) {
  writeLocal(STORAGE_KEYS.CART, cart);
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
      item.branch === params.branch &&
      item.productId === params.product.id &&
      item.optionId === params.optionId
  );

  if (existing) {
    const next = cart.map((item) =>
      item.uid === existing.uid ? { ...item, qty: item.qty + 1 } : item
    );
    saveCart(next);
    return next;
  }

  const next: CartItem[] = [
    ...cart,
    {
      uid: generateId("cart"),
      productId: params.product.id,
      name: params.product.name,
      price,
      qty: 1,
      branch: params.branch,
      optionId: params.optionId,
      optionName: params.optionName,
    },
  ];

  saveCart(next);
  return next;
}

export function updateCartQty(uid: string, qty: number) {
  const cart = getCart();
  const next = cart
    .map((item) => (item.uid === uid ? { ...item, qty } : item))
    .filter((item) => item.qty > 0);
  saveCart(next);
  return next;
}

export function removeCartItem(uid: string) {
  const cart = getCart();
  const next = cart.filter((item) => item.uid !== uid);
  saveCart(next);
  return next;
}

export function clearCart() {
  saveCart([]);
}

export function validateCartAgainstStopList(branch: BranchId, cart: CartItem[]) {
  const stopList = getStopList();
  const stoppedIds = new Set(stopList[branch] ?? []);
  const unavailable = cart.filter((item) => stoppedIds.has(item.productId));

  return {
    ok: unavailable.length === 0,
    unavailable,
  };
}
