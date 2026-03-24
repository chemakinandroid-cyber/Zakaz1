import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearCart, getCart, removeCartItem, updateCartQty, validateCartAgainstStopList } from "@/lib/cart";
import { createOrder } from "@/lib/orders";
import type { BranchId, CartItem } from "@/lib/types";

type Props = {
  branch: BranchId;
};

export function CartPanel({ branch }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");

  const reload = () => setCart(getCart().filter((x) => x.branch === branch));

  useEffect(() => {
    reload();
    const t = setInterval(reload, 500);
    return () => clearInterval(t);
  }, [branch]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);

  const submitOrder = () => {
    if (!customerName.trim()) {
      alert("Введите имя");
      return;
    }

    const check = validateCartAgainstStopList(branch, cart);
    if (!check.ok) {
      alert(
        `Некоторые позиции уже недоступны: ${check.unavailable
          .map((x) => x.name)
          .join(", ")}`
      );
      reload();
      return;
    }

    createOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      branch,
      items: cart,
    });

    clearCart();
    reload();
    setCustomerName("");
    setPhone("");
    alert("Заказ отправлен");
  };

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-4 text-lg font-semibold">Корзина</div>

      <div className="space-y-3">
        {cart.length === 0 ? (
          <div className="text-sm text-neutral-500">Корзина пока пустая</div>
        ) : (
          cart.map((item) => (
            <div key={item.uid} className="rounded-2xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  {item.optionName ? <div className="text-sm text-neutral-500">{item.optionName}</div> : null}
                  <div className="text-sm text-neutral-500">{item.price} ₽</div>
                </div>

                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => {
                    removeCartItem(item.uid);
                    reload();
                  }}
                >
                  Удалить
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateCartQty(item.uid, item.qty - 1);
                    reload();
                  }}
                >
                  −
                </Button>
                <div className="min-w-8 text-center">{item.qty}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateCartQty(item.uid, item.qty + 1);
                    reload();
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 space-y-3">
        <Input placeholder="Ваше имя" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <Input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Итого</span>
          <span>{total} ₽</span>
        </div>

        <Button className="w-full" onClick={submitOrder} disabled={cart.length === 0}>
          Оформить заказ
        </Button>
      </div>
    </div>
  );
}
