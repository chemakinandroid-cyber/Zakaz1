'use client';

import { useEffect, useState } from 'react';
import { CartPanel } from '../components/CartPanel';
import { CustomerCatalog } from '../components/CustomerCatalog';
import { STORAGE_KEYS } from '../lib/storage';
import type { BranchId } from '../lib/types';

export default function HomePage() {
  const [branch, setBranch] = useState<BranchId>('airport');
  const [cartTick, setCartTick] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEYS.branch);
    if (saved === 'airport' || saved === 'konechnaya') {
      setBranch(saved);
    }
  }, []);

  const switchBranch = (next: BranchId) => {
    setBranch(next);
    window.localStorage.setItem(STORAGE_KEYS.branch, next);
  };

  return (
    <main className="page-shell">
      <div className="container two-col">
        <section>
          <div className="hero card">
            <div>
              <h1 className="page-title">На Виражах</h1>
              <p className="muted">Онлайн-заказ с карточками товаров, корзиной и стоп-листом.</p>
            </div>
            <div className="row gap-8 wrap mt-16">
              <button className={`btn ${branch === 'airport' ? '' : 'btn-secondary'}`} onClick={() => switchBranch('airport')} type="button">
                Аэропорт
              </button>
              <button className={`btn ${branch === 'konechnaya' ? '' : 'btn-secondary'}`} onClick={() => switchBranch('konechnaya')} type="button">
                Конечная
              </button>
            </div>
          </div>

          <CustomerCatalog branch={branch} onCartChanged={() => setCartTick((value) => value + 1)} />
        </section>

        <aside key={cartTick}>
          <CartPanel branch={branch} />
        </aside>
      </div>
    </main>
  );
}
