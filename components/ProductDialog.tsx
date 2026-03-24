"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  stopped?: boolean;
  onAdd: (payload?: { optionId?: string; optionName?: string; optionPrice?: number }) => void;
};

export function ProductDialog({
  open,
  onOpenChange,
  product,
  stopped,
  onAdd,
}: Props) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();

  const selectedOption = useMemo(() => {
    if (!product?.options?.length) return undefined;
    return product.options.find((x) => x.id === selectedOptionId) ?? product.options[0];
  }, [product, selectedOptionId]);

  if (!product) return null;

  const price = selectedOption?.price ?? product.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
                Фото скоро добавим
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {stopped ? <Badge variant="destructive">В стоп-листе</Badge> : null}
            {product.comingSoon ? <Badge variant="secondary">Скоро в меню</Badge> : null}
            {product.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          <p className="text-sm leading-6 text-neutral-600">{product.description}</p>

          {product.options?.length ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Вариант</div>
              <div className="grid gap-2">
                {product.options.map((option) => {
                  const active = (selectedOption?.id ?? product.options?.[0]?.id) === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active ? "border-black bg-neutral-50" : "border-neutral-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option.name}</span>
                        <span className="font-semibold">{option.price} ₽</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">{price} ₽</div>
            <Button
              disabled={stopped || product.comingSoon}
              onClick={() =>
                onAdd({
                  optionId: selectedOption?.id,
                  optionName: selectedOption?.name,
                  optionPrice: selectedOption?.price,
                })
              }
            >
              {stopped ? "Недоступно" : product.comingSoon ? "Скоро" : "Добавить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
