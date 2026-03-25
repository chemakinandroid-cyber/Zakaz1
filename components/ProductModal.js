export default function ProductModal({ item, stopped, onClose, onAdd }) {
  if (!item) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{item.name}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-media">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="modal-image" />
          ) : (
            <div className="card-placeholder">Фото скоро добавим</div>
          )}
        </div>
        <p className="modal-desc">{item.description || 'Описание скоро добавим'}</p>
        <div className="modal-actions">
          <strong>{item.price} ₽</strong>
          <button className="btn" disabled={stopped} onClick={() => onAdd(item)}>
            {stopped ? 'Недоступно' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
