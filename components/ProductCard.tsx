"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  stopped?: boolean;
  onOpen: () => void;
  onAdd: () => void;
};

export function ProductCard({ product, stopped, onOpen, onAdd }: Props) {
  return (
    <div
      className={`group rounded-3xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        stopped ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left"
      >
        <div className="mb-3 aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
              Фото скоро добавим
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{product.name}</div>
            <div className="mt-1 line-clamp-2 text-sm text-neutral-500">
              {product.description}
            </div>
          </div>

          {stopped ? <Badge variant="destructive">Стоп</Badge> : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {product.comingSoon ? <Badge variant="secondary">Скоро</Badge> : null}
          {product.tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-lg font-bold">{product.price} ₽</div>

        <Button onClick={onAdd} disabled={stopped || product.comingSoon}>
          {stopped ? "Недоступно" : product.comingSoon ? "Скоро" : "В корзину"}
        </Button>
      </div>
    </div>
  );
}
