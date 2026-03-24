import { STORAGE_KEYS, readLocal, writeLocal, generateId, calculateOrderTotal } from "./storage";
import type { CartItem, CustomerOrder, OrderStatus } from "./types";

const ORDER_CHANNEL = "na-virazhah-orders";

export function getOrders(): CustomerOrder[] {
  return readLocal<CustomerOrder[]>(STORAGE_KEYS.ORDERS, []);
}

export function saveOrders(orders: CustomerOrder[]) {
  writeLocal(STORAGE_KEYS.ORDERS, orders);

  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const channel = new BroadcastChannel(ORDER_CHANNEL);
    channel.postMessage({ type: "ORDERS_UPDATED" });
    channel.close();
  }
}

export function createOrder(params: {
  customerName: string;
  phone?: string;
  branch: CustomerOrder["branch"];
  items: CartItem[];
}) {
  const orders = getOrders();

  const order: CustomerOrder = {
    id: generateId("order"),
    createdAt: new Date().toISOString(),
    customerName: params.customerName,
    phone: params.phone,
    branch: params.branch,
    items: params.items,
    total: calculateOrderTotal(params.items),
    status: "new",
  };

  const next = [order, ...orders];
  saveOrders(next);
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = getOrders();
  const next = orders.map((order) =>
    order.id === orderId ? { ...order, status } : order
  );
  saveOrders(next);
  return next;
}

export function getOrdersChannel() {
  return ORDER_CHANNEL;
}
