"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getOrders, getOrdersChannel, updateOrderStatus } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useSound } from "@/hooks/useSound";
import type { CustomerOrder, OrderStatus } from "@/lib/types";

const statusFlow: OrderStatus[] = ["new", "accepted", "cooking", "ready", "completed"];

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<CustomerOrder[]>(getOrders());
  const previousOrdersRef = useRef<CustomerOrder[]>(getOrders());
  const { soundEnabled, unlock, playReadySound } = useSound();

  useEffect(() => {
    const reload = () => {
      const next = getOrders();

      const prev = previousOrdersRef.current;
      next.forEach((order) => {
        const prevOrder = prev.find((x) => x.id === order.id);
        if (prevOrder && prevOrder.status !== "ready" && order.status === "ready") {
          playReadySound();
        }
      });

      previousOrdersRef.current = next;
      setOrders(next);
    };

    reload();

    const interval = setInterval(reload, 1000);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(getOrdersChannel());
      channel.onmessage = reload;
    }

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, [playReadySound]);

  const setNextStatus = (order: CustomerOrder) => {
    const idx = statusFlow.indexOf(order.status);
    const nextStatus = statusFlow[Math.min(idx + 1, statusFlow.length - 1)];
    updateOrderStatus(order.id, nextStatus);
    setOrders(getOrders());
  };

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Заказы</div>
          <div className="text-sm text-neutral-500">Управление статусами</div>
        </div>

        <Button variant="outline" onClick={unlock}>
          {soundEnabled ? "Звук активен" : "Включить звук"}
        </Button>
      </div>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="text-sm text-neutral-500">Заказов пока нет</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-2xl border p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{order.customerName}</div>
                  <div className="text-sm text-neutral-500">
                    {order.branch === "airport" ? "Аэропорт" : "Конечная"} ·{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>

                <OrderStatusBadge status={order.status} />
              </div>

              <div className="space-y-2 text-sm">
                {order.items.map((item) => (
                  <div key={item.uid} className="flex justify-between gap-3">
                    <span>
                      {item.name}
                      {item.optionName ? ` · ${item.optionName}` : ""} × {item.qty}
                    </span>
                    <span>{item.price * item.qty} ₽</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="font-semibold">Итого: {order.total} ₽</div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateOrderStatus(order.id, "cancelled");
                      setOrders(getOrders());
                    }}
                  >
                    Отменить
                  </Button>

                  {order.status !== "completed" && order.status !== "cancelled" ? (
                    <Button onClick={() => setNextStatus(order)}>
                      Следующий статус
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
