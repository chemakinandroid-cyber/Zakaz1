'use client';

import { useState } from 'react';
import { AdminOrdersPanel } from '../../components/AdminOrdersPanel';
import { AdminStopListPanel } from '../../components/AdminStopListPanel';
import type { BranchId } from '../../lib/types';

export default function AdminPage() {
  const [branch, setBranch] = useState<BranchId>('airport');

  return (
    <main className="page-shell">
      <div className="container stack-16">
        <section className="hero card">
          <div>
            <h1 className="page-title">Админка — На Виражах</h1>
            <p className="muted">Статусы заказов, стоп-лист и тест звука.</p>
          </div>
          <div className="row gap-8 wrap mt-16">
            <button className={`btn ${branch === 'airport' ? '' : 'btn-secondary'}`} onClick={() => setBranch('airport')} type="button">
              Аэропорт
            </button>
            <button className={`btn ${branch === 'konechnaya' ? '' : 'btn-secondary'}`} onClick={() => setBranch('konechnaya')} type="button">
              Конечная
            </button>
          </div>
        </section>

        <div className="admin-grid">
          <AdminStopListPanel branch={branch} />
          <AdminOrdersPanel />
        </div>
      </div>
    </main>
  );
}
