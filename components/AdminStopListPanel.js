import { useMemo, useState } from 'react';

export default function AdminStopListPanel({ items, stoppedIds, onToggle, busyId }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name} ${item.description || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Стоп-лист</h2>
        <span className="badge">{stoppedIds.length} на стопе</span>
      </div>
      <input
        className="input"
        placeholder="Поиск блюда"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="admin-list">
        {filtered.map((item) => {
          const stopped = stoppedIds.includes(item.id);
          return (
            <div key={item.id} className="admin-list-item">
              <div>
                <strong>{item.name}</strong>
                <p className="muted">{item.description || 'Без описания'}</p>
              </div>
              <button
                className={`btn ${stopped ? 'btn-danger' : 'btn-light'}`}
                disabled={busyId === item.id}
                onClick={() => onToggle(item)}
              >
                {stopped ? 'Снять стоп' : 'Поставить стоп'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
