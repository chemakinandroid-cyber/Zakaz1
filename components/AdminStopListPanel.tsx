'use client';

import { useMemo, useState } from 'react';
import { products } from '../lib/menu';
import type { BranchId } from '../lib/types';
import { useStopList } from '../hooks/useStopList';

export function AdminStopListPanel({ branch }: { branch: BranchId }) {
  const [query, setQuery] = useState('');
  const { isStopped, toggleItem } = useStopList();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const branchAllowed = !product.branchAvailability || product.branchAvailability.includes(branch);
      if (!branchAllowed) return false;
      if (!normalized) return true;
      return (
        product.name.toLowerCase().includes(normalized) || product.description.toLowerCase().includes(normalized)
      );
    });
  }, [branch, query]);

  return (
    <section className="card admin-side-card">
      <div className="row between center gap-8">
        <div>
          <div className="panel-title">Стоп-лист</div>
          <div className="muted small">Управление доступностью блюд</div>
        </div>
        <span className="mini-tag">{branch === 'airport' ? 'Аэропорт' : 'Конечная'}</span>
      </div>

      <input
        className="input mt-16"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск блюда..."
        value={query}
      />

      <div className="stack-12 scroll-box mt-16">
        {filtered.map((item) => {
          const stopped = isStopped(branch, item.id);
          return (
            <div className="admin-stop-item" key={item.id}>
              <div>
                <div className="item-title">{item.name}</div>
                <div className="muted small">{item.description}</div>
              </div>
              <button
                className={`btn btn-sm ${stopped ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => toggleItem(branch, item.id)}
                type="button"
              >
                {stopped ? 'На стопе' : 'Доступно'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
