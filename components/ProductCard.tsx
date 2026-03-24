import type { Product } from '../lib/types';

export function ProductCard({
  product,
  stopped,
  onOpen,
  onAdd
}: {
  product: Product;
  stopped: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <article className={`card product-card ${stopped ? 'is-disabled' : ''}`}>
      <button className="product-image" onClick={onOpen} type="button" aria-label={product.name}>
        <span>Фото скоро добавим</span>
      </button>

      <div className="product-main">
        <div className="row between start gap-8">
          <h3 className="product-title">{product.name}</h3>
          {stopped ? <span className="mini-tag danger">Стоп</span> : null}
        </div>

        <p className="muted product-description">{product.description}</p>

        <div className="tag-wrap">
          {product.comingSoon ? <span className="mini-tag">Скоро</span> : null}
          {product.tags?.map((tag) => (
            <span className="mini-tag outline" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="row between center gap-8 mt-16">
        <div className="price">{product.price} ₽</div>
        <div className="row gap-8">
          <button className="btn btn-secondary" onClick={onOpen} type="button">
            Подробнее
          </button>
          <button className="btn" disabled={stopped || product.comingSoon} onClick={onAdd} type="button">
            {stopped ? 'Недоступно' : product.comingSoon ? 'Скоро' : 'В корзину'}
          </button>
        </div>
      </div>
    </article>
  );
}
