'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import BranchTabs from '../../components/BranchTabs';
import AdminOrdersPanel from '../../components/AdminOrdersPanel';
import AdminStopListPanel from '../../components/AdminStopListPanel';
import {
  loadBranches,
  loadMenuItems,
  loadOrders,
  loadStopList,
  setOrderStatus,
  toggleStopListItem,
  subscribeToOrders,
  subscribeToStopList,
} from '../../lib/data';

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('airport');
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stopMap, setStopMap] = useState({});
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('nv_admin_ok') !== '1') {
      router.replace('/admin/login');
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let active = true;

    async function boot() {
      const [branchRows, menuRows, orderRows, stopRows] = await Promise.all([
        loadBranches(),
        loadMenuItems(),
        loadOrders(),
        loadStopList(),
      ]);

      if (!active) return;
      setBranches(branchRows);
      setMenuItems(menuRows);
      setOrders(orderRows);
      setStopMap(stopRows);
      if (branchRows.length > 0 && !branchRows.find((b) => b.id === selectedBranch)) {
        setSelectedBranch(branchRows[0].id);
      }
    }

    boot();

    const ordersSub = subscribeToOrders(async () => {
      const next = await loadOrders();
      if (active) setOrders(next);
    });

    const stopSub = subscribeToStopList(async () => {
      const next = await loadStopList();
      if (active) setStopMap(next);
    });

    return () => {
      active = false;
      ordersSub?.unsubscribe?.();
      stopSub?.unsubscribe?.();
    };
  }, [ready, selectedBranch]);

  const branchItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.branchIds || item.branchIds.length === 0) return true;
      return item.branchIds.includes(selectedBranch);
    });
  }, [menuItems, selectedBranch]);

  const branchOrders = useMemo(() => {
    return orders.filter((order) => order.branchId === selectedBranch);
  }, [orders, selectedBranch]);

  async function handleStatus(orderId, status) {
    setBusyId(orderId + status);
    await setOrderStatus(orderId, status);
    const next = await loadOrders();
    setOrders(next);
    setBusyId('');
  }

  async function handleToggleStop(item) {
    setBusyId(item.id);
    await toggleStopListItem(selectedBranch, item);
    const next = await loadStopList();
    setStopMap(next);
    setBusyId('');
  }

  function logout() {
    localStorage.removeItem('nv_admin_ok');
    router.replace('/admin/login');
  }

  if (!ready) return null;

  return (
    <main className="page-shell">
      <Header adminHref="/" rightAction={<button className="btn btn-light" onClick={logout}>Выйти</button>} />

      <div className="container">
        <BranchTabs branches={branches} value={selectedBranch} onChange={setSelectedBranch} />

        <div className="admin-grid">
          <AdminStopListPanel
            items={branchItems}
            stoppedIds={stopMap[selectedBranch] || []}
            onToggle={handleToggleStop}
            busyId={busyId}
          />
          <AdminOrdersPanel
            orders={branchOrders}
            onStatus={handleStatus}
            busyId={busyId}
          />
        </div>
      </div>
    </main>
  );
}
