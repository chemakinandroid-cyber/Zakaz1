import { STORAGE_KEYS, calculateCartTotal, generateId, readLocal, writeLocal } from './storage';
import type { CartItem, CustomerOrder, OrderStatus } from './types';

export const ORDERS_CHANNEL = 'na-virazhah-orders';

export function getOrders(): CustomerOrder[] {
  return readLocal<CustomerOrder[]>(STORAGE_KEYS.orders, []);
}

export function saveOrders(orders: CustomerOrder[]) {
  writeLocal(STORAGE_KEYS.orders, orders);
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel(ORDERS_CHANNEL);
    channel.postMessage({ type: 'orders-updated' });
    channel.close();
  }
}

export function createOrder(params: {
  customerName: string;
  phone?: string;
  branch: CustomerOrder['branch'];
  items: CartItem[];
}) {
  const orders = getOrders();
  const order: CustomerOrder = {
    id: generateId('order'),
    createdAt: new Date().toISOString(),
    customerName: params.customerName,
    phone: params.phone,
    branch: params.branch,
    items: params.items,
    total: calculateCartTotal(params.items),
    status: 'new'
  };
  saveOrders([order, ...orders]);
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = getOrders().map((order) => (order.id === orderId ? { ...order, status } : order));
  saveOrders(orders);
}
