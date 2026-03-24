'use client';

import { useEffect, useMemo, useState } from 'react';
import { CART_CHANNEL, clearCart, getCart, removeCartItem, updateCartItemQty, validateCartAgainstStopList } from '../lib/cart';
import { createOrder } from '../lib/orders';
import type { BranchId, CartItem } from '../lib/types';

export function CartPanel({ branch }: { branch: BranchId }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');

  const reload = () => setCart(getCart().filter((item) => item.branch === branch));

  useEffect(() => {
    reload();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'na-virazhah.cart') reload();
    };
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(CART_CHANNEL);
      channel.onmessage = reload;
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      if (channel) channel.close();
    };
  }, [branch]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const submitOrder = () => {
    if (!customerName.trim()) {
      alert('Введите имя клиента');
      return;
    }

    const check = validateCartAgainstStopList(branch, cart);
    if (!check.ok) {
      alert(`Эти позиции уже недоступны: ${check.unavailable.map((item) => item.name).join(', ')}`);
      reload();
      return;
    }

    createOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      branch,
      items: cart
    });

    clearCart(branch);
    setCustomerName('');
    setPhone('');
    reload();
    alert('Заказ отправлен');
  };

  return (
    <aside className="card cart-panel">
      <div className="panel-title">Корзина</div>

      <div className="stack-12">
        {cart.length === 0 ? (
          <div className="empty-box">Корзина пока пустая</div>
        ) : (
          cart.map((item) => (
            <div className="cart-item" key={item.uid}>
              <div className="row between start gap-8">
                <div>
                  <div className="item-title">{item.name}</div>
                  {item.optionName ? <div className="muted small">{item.optionName}</div> : null}
                  <div className="muted small">{item.price} ₽</div>
                </div>
                <button className="link-danger" onClick={() => removeCartItem(item.uid)} type="button">
                  Удалить
                </button>
              </div>

              <div className="row gap-8 mt-12">
                <button className="btn btn-secondary btn-sm" onClick={() => updateCartItemQty(item.uid, item.qty - 1)} type="button">
                  −
                </button>
                <div className="qty-box">{item.qty}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => updateCartItemQty(item.uid, item.qty + 1)} type="button">
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="stack-12 mt-16">
        <input className="input" onChange={(e) => setCustomerName(e.target.value)} placeholder="Ваше имя" value={customerName} />
        <input className="input" onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" value={phone} />

        <div className="row between center">
          <strong>Итого</strong>
          <strong>{total} ₽</strong>
        </div>

        <button className="btn btn-block" disabled={cart.length === 0} onClick={submitOrder} type="button">
          Оформить заказ
        </button>
      </div>
    </aside>
  );
}
