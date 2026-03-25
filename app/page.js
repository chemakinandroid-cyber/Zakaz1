'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  loadBranches,
  loadMenuItems,
  loadStopList,
  createOrderWithItems,
  subscribeToStopList,
} from '../lib/data';
import { getStoredCart, saveStoredCart, calcCartTotal } from '../lib/cart';
import Header from '../components/Header';
import BranchTabs from '../components/BranchTabs';
import MenuGrid from '../components/MenuGrid';
import ProductModal from '../components/ProductModal';
import CartPanel from '../components/CartPanel';

export default function HomePage() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('airport');
  const [menuItems, setMenuItems] = useState([]);
  const [stopMap, setStopMap] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState({
    customerName: '',
    customerPhone: '',
    comment: '',
    paymentMethod: 'pay_on_pickup',
  });

  useEffect(() => {
    const stored = getStoredCart();
    setCart(stored);
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      setLoading(true);
      const [branchRows, menuRows, stopRows] = await Promise.all([
        loadBranches(),
        loadMenuItems(),
        loadStopList(),
      ]);

      if (!active) return;

      setBranches(branchRows);
      if (branchRows.length > 0) {
        const hasStored = branchRows.some((b) => b.id === selectedBranch);
        if (!hasStored) setSelectedBranch(branchRows[0].id);
      }
      setMenuItems(menuRows);
      setStopMap(stopRows);
      setLoading(false);
    }

    boot();

    const sub = subscribeToStopList(async () => {
      const stopRows = await loadStopList();
      if (active) setStopMap(stopRows);
    });

    return () => {
      active = false;
      sub?.unsubscribe?.();
    };
  }, []);

  const branchInfo = useMemo(() => {
    return branches.find((b) => b.id === selectedBranch) || null;
  }, [branches, selectedBranch]);

  const filteredItems = useMemo(() => {
    const items = menuItems.filter((item) => {
      if (!item.active) return false;
      if (!item.branchIds || item.branchIds.length === 0) return true;
      return item.branchIds.includes(selectedBranch);
    });

    return items.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category, 'ru');
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [menuItems, selectedBranch]);

  const stoppedIds = useMemo(() => stopMap[selectedBranch] || [], [stopMap, selectedBranch]);
  const cartForBranch = useMemo(() => cart.filter((item) => item.branchId === selectedBranch), [cart, selectedBranch]);
  const total = useMemo(() => calcCartTotal(cartForBranch), [cartForBranch]);

  function updateCart(next) {
    setCart(next);
    saveStoredCart(next);
  }

  function addToCart(menuItem, quantity = 1) {
    const existing = [...cart];
    const idx = existing.findIndex((x) => x.branchId === selectedBranch && x.itemId === menuItem.id);

    if (idx >= 0) {
      existing[idx] = { ...existing[idx], qty: existing[idx].qty + quantity };
      updateCart(existing);
      return;
    }

    updateCart([
      ...existing,
      {
        uid: `${menuItem.id}_${Date.now()}`,
        branchId: selectedBranch,
        itemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        qty: quantity,
      },
    ]);
  }

  function changeQty(uid, delta) {
    const next = cart
      .map((item) => (item.uid === uid ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0);
    updateCart(next);
  }

  function removeItem(uid) {
    updateCart(cart.filter((item) => item.uid !== uid));
  }

  async function submitOrder() {
    if (!checkout.customerName.trim()) {
      alert('Введите имя');
      return;
    }

    if (cartForBranch.length === 0) {
      alert('Корзина пустая');
      return;
    }

    const unavailable = cartForBranch.filter((item) => stoppedIds.includes(item.itemId));
    if (unavailable.length > 0) {
      alert(`Некоторые позиции недоступны: ${unavailable.map((x) => x.name).join(', ')}`);
      return;
    }

    setSubmitting(true);
    const result = await createOrderWithItems({
      branch: branchInfo || { id: selectedBranch, name: selectedBranch },
      checkout,
      items: cartForBranch,
    });
    setSubmitting(false);

    if (!result.ok) {
      alert(`Не удалось создать заказ: ${result.error}`);
      return;
    }

    updateCart(cart.filter((item) => item.branchId !== selectedBranch));
    setCheckout({
      customerName: '',
      customerPhone: '',
      comment: '',
      paymentMethod: 'pay_on_pickup',
    });
    alert(`Заказ принят: ${result.orderId}`);
  }

  return (
    <main className="page-shell">
      <Header adminHref="/admin/login" />

      <div className="container two-col">
        <section>
          <BranchTabs
            branches={branches}
            value={selectedBranch}
            onChange={setSelectedBranch}
          />

          <div className="panel panel-soft branch-banner">
            <div>
              <h1>На Виражах</h1>
              <p>
                {branchInfo?.name || 'Филиал'} · актуальное меню, стоп-лист и статусы из Supabase
              </p>
            </div>
            <div className="badge">{loading ? 'Загрузка…' : `${filteredItems.length} позиций`}</div>
          </div>

          <MenuGrid
            items={filteredItems}
            stoppedIds={stoppedIds}
            onOpen={setSelectedItem}
            onAdd={addToCart}
          />
        </section>

        <aside>
          <CartPanel
            items={cartForBranch}
            total={total}
            checkout={checkout}
            setCheckout={setCheckout}
            onMinus={(uid) => changeQty(uid, -1)}
            onPlus={(uid) => changeQty(uid, 1)}
            onRemove={removeItem}
            onSubmit={submitOrder}
            submitting={submitting}
          />
        </aside>
      </div>

      <ProductModal
        item={selectedItem}
        stopped={selectedItem ? stoppedIds.includes(selectedItem.id) : false}
        onClose={() => setSelectedItem(null)}
        onAdd={(item) => {
          addToCart(item);
          setSelectedItem(null);
        }}
      />
    </main>
  );
}
