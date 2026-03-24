'use client';

import { useEffect, useRef, useState } from 'react';
import { useSound } from '../hooks/useSound';
import { getOrders, ORDERS_CHANNEL, updateOrderStatus } from '../lib/orders';
import type { CustomerOrder, OrderStatus } from '../lib/types';
import { OrderStatusBadge } from './OrderStatusBadge';

const statusFlow: OrderStatus[] = ['new', 'accepted', 'cooking', 'ready', 'completed'];

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const previousOrders = useRef<CustomerOrder[]>([]);
  const { soundEnabled, unlock, playReadySound } = useSound();

  useEffect(() => {
    const reload = () => {
      const next = getOrders();
      const prev = previousOrders.current;
      next.forEach((order) => {
        const oldOrder = prev.find((item) => item.id === order.id);
        if (oldOrder && oldOrder.status !== 'ready' && order.status === 'ready') {
          void playReadySound();
        }
      });
      previousOrders.current = next;
      setOrders(next);
    };

    reload();

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'na-virazhah.orders') reload();
    };
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(ORDERS_CHANNEL);
      channel.onmessage = reload;
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      if (channel) channel.close();
    };
  }, [playReadySound]);

  const goNext = (order: CustomerOrder) => {
    const index = statusFlow.indexOf(order.status);
    const nextStatus = statusFlow[Math.min(index + 1, statusFlow.length - 1)];
    updateOrderStatus(order.id, nextStatus);
    setOrders(getOrders());
  };

  return (
    <section className="card admin-main-card">
      <div className="row between center gap-8">
        <div>
          <div className="panel-title">Заказы</div>
          <div className="muted small">Управление статусами</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => void unlock()} type="button">
          {soundEnabled ? 'Звук активен' : 'Включить звук'}
        </button>
      </div>

      <div className="stack-12 mt-16">
        {orders.length === 0 ? (
          <div className="empty-box">Заказов пока нет</div>
        ) : (
          orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="row between start gap-8">
                <div>
                  <div className="item-title">{order.customerName}</div>
                  <div className="muted small">
                    {order.branch === 'airport' ? 'Аэропорт' : 'Конечная'} · {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="stack-8 mt-12">
                {order.items.map((item) => (
                  <div className="row between center gap-8 small" key={item.uid}>
                    <span>
                      {item.name}
                      {item.optionName ? ` · ${item.optionName}` : ''} × {item.qty}
                    </span>
                    <strong>{item.price * item.qty} ₽</strong>
                  </div>
                ))}
              </div>

              <div className="row between center gap-8 mt-16 wrap">
                <strong>Итого: {order.total} ₽</strong>
                <div className="row gap-8 wrap">
                  <button className="btn btn-danger btn-sm" onClick={() => updateOrderStatus(order.id, 'cancelled')} type="button">
                    Отменить
                  </button>
                  {order.status !== 'completed' && order.status !== 'cancelled' ? (
                    <button className="btn btn-sm" onClick={() => goNext(order)} type="button">
                      Следующий статус
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
