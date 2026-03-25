const NEXT_STATUS = {
  new: 'accepted',
  accepted: 'cooking',
  cooking: 'ready',
  ready: 'completed',
};

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ru-RU');
}

export default function AdminOrdersPanel({ orders, onStatus, busyId }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Заказы</h2>
        <span className="badge">{orders.length}</span>
      </div>

      <div className="admin-list">
        {orders.length === 0 ? <p className="muted">Заказов пока нет</p> : null}
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-card-head">
              <div>
                <strong>{order.id}</strong>
                <div className="muted">{order.customerName || 'Без имени'} · {formatTime(order.createdAt)}</div>
              </div>
              <span className={`status-pill status-${order.status}`}>{order.status}</span>
            </div>

            <div className="muted small-gap">
              <div>{order.branchName || order.branchId}</div>
              <div>{order.paymentMethod || 'pay_on_pickup'} / {order.paymentStatus || 'unpaid'}</div>
              {order.phone ? <div>{order.phone}</div> : null}
              {order.comment ? <div>{order.comment}</div> : null}
            </div>

            <div className="order-total">Итого: {order.total || 0} ₽</div>

            <div className="row-gap wrap">
              {NEXT_STATUS[order.status] ? (
                <button
                  className="btn"
                  disabled={busyId === order.id + NEXT_STATUS[order.status]}
                  onClick={() => onStatus(order.id, NEXT_STATUS[order.status])}
                >
                  Следующий статус
                </button>
              ) : null}
              {order.status !== 'canceled' ? (
                <button
                  className="btn btn-light"
                  disabled={busyId === order.id + 'canceled'}
                  onClick={() => onStatus(order.id, 'canceled')}
                >
                  Отменить
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
