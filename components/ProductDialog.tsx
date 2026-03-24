'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../lib/types';

export function ProductDialog({
  open,
  product,
  stopped,
  onClose,
  onAdd
}: {
  open: boolean;
  product: Product | null;
  stopped: boolean;
  onClose: () => void;
  onAdd: (payload?: { optionId?: string; optionName?: string; optionPrice?: number }) => void;
}) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedOptionId(product?.options?.[0]?.id);
  }, [product]);

  const selectedOption = useMemo(() => {
    if (!product?.options?.length) return undefined;
    return product.options.find((option) => option.id === selectedOptionId) ?? product.options[0];
  }, [product, selectedOptionId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open || !product) return null;

  const price = selectedOption?.price ?? product.price;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="row between center gap-8">
          <h2 className="modal-title">{product.name}</h2>
          <button className="icon-btn" onClick={onClose} type="button" aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="modal-image">Фото скоро добавим</div>

        <div className="tag-wrap">
          {stopped ? <span className="mini-tag danger">В стоп-листе</span> : null}
          {product.comingSoon ? <span className="mini-tag">Скоро в меню</span> : null}
          {product.tags?.map((tag) => (
            <span className="mini-tag outline" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        <p className="modal-description">{product.description}</p>

        {product.options?.length ? (
          <div className="options-list">
            <div className="section-title">Вариант</div>
            {product.options.map((option) => {
              const isActive = option.id === selectedOption?.id;
              return (
                <button
                  className={`option-btn ${isActive ? 'active' : ''}`}
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  type="button"
                >
                  <span>{option.name}</span>
                  <strong>{option.price} ₽</strong>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="row between center gap-8 mt-16">
          <div className="price big">{price} ₽</div>
          <button
            className="btn"
            disabled={stopped || product.comingSoon}
            onClick={() =>
              onAdd(
                selectedOption
                  ? {
                      optionId: selectedOption.id,
                      optionName: selectedOption.name,
                      optionPrice: selectedOption.price
                    }
                  : undefined
              )
            }
            type="button"
          >
            {stopped ? 'Недоступно' : product.comingSoon ? 'Скоро' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
