export default function BranchTabs({ branches, value, onChange }) {
  const fallback = [
    { id: 'airport', name: 'На Виражах — Аэропорт' },
    { id: 'konechnaya', name: 'На Виражах — Конечная' },
  ];

  const items = branches.length > 0 ? branches : fallback;

  return (
    <div className="tabs-row">
      {items.map((branch) => (
        <button
          key={branch.id}
          className={`tab-btn ${value === branch.id ? 'active' : ''}`}
          onClick={() => onChange(branch.id)}
        >
          {branch.name}
        </button>
      ))}
    </div>
  );
}
