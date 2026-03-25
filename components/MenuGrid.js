function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const key = item.category || 'Прочее';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export default function MenuGrid({ items, stoppedIds, onOpen, onAdd }) {
  const grouped = groupByCategory(items);
  const categories = Object.keys(grouped);

  return (
    <div className="menu-stack">
      {categories.map((category) => (
        <section key={category} className="menu-section">
          <h2>{category}</h2>
          <div className="menu-grid">
            {grouped[category].map((item) => {
              const stopped = stoppedIds.includes(item.id);
              return (
                <article key={item.id} className={`card ${stopped ? 'card-stopped' : ''}`}>
                  <button className="card-cover" onClick={() => onOpen(item)}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="card-image" />
                    ) : (
                      <div className="card-placeholder">Фото скоро добавим</div>
                    )}
                  </button>
                  <div className="card-body">
                    <div className="card-head">
                      <h3>{item.name}</h3>
                      {stopped ? <span className="mini-badge bad">Стоп</span> : null}
                    </div>
                    <p>{item.description || 'Описание скоро добавим'}</p>
                    <div className="card-footer">
                      <strong>{item.price} ₽</strong>
                      <div className="row-gap">
                        <button className="btn btn-light" onClick={() => onOpen(item)}>Подробнее</button>
                        <button className="btn" disabled={stopped} onClick={() => onAdd(item)}>
                          {stopped ? 'Недоступно' : 'В корзину'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
