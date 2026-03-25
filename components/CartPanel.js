export default function CartPanel({
  items,
  total,
  checkout,
  setCheckout,
  onMinus,
  onPlus,
  onRemove,
  onSubmit,
  submitting,
}) {
  return (
    <div className="panel sticky-panel">
      <h2>Корзина</h2>
      <div className="cart-list">
        {items.length === 0 ? <p className="muted">Корзина пока пустая</p> : null}
        {items.map((item) => (
          <div key={item.uid} className="cart-item">
            <div>
              <strong>{item.name}</strong>
              <div className="muted">{item.price} ₽</div>
            </div>
            <div className="cart-actions">
              <button className="qty-btn" onClick={() => onMinus(item.uid)}>−</button>
              <span>{item.qty}</span>
              <button className="qty-btn" onClick={() => onPlus(item.uid)}>+</button>
              <button className="link-btn" onClick={() => onRemove(item.uid)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>

      <div className="form-stack">
        <input
          className="input"
          placeholder="Ваше имя"
          value={checkout.customerName}
          onChange={(e) => setCheckout({ ...checkout, customerName: e.target.value })}
        />
        <input
          className="input"
          placeholder="Телефон"
          value={checkout.customerPhone}
          onChange={(e) => setCheckout({ ...checkout, customerPhone: e.target.value })}
        />
        <textarea
          className="input textarea"
          placeholder="Комментарий к заказу"
          value={checkout.comment}
          onChange={(e) => setCheckout({ ...checkout, comment: e.target.value })}
        />
        <select
          className="input"
          value={checkout.paymentMethod}
          onChange={(e) => setCheckout({ ...checkout, paymentMethod: e.target.value })}
        >
          <option value="pay_on_pickup">Оплата при получении</option>
          <option value="sbp">СБП</option>
        </select>
      </div>

      <div className="checkout-row">
        <strong>Итого</strong>
        <strong>{total} ₽</strong>
      </div>
      <button className="btn wide" disabled={submitting || items.length === 0} onClick={onSubmit}>
        {submitting ? 'Отправка...' : 'Оформить заказ'}
      </button>
    </div>
  );
}
