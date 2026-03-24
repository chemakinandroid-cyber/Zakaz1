"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { Button } from "@/components/ui/button";
import { products, categories } from "@/lib/menu";
import { addToCart } from "@/lib/cart";
import { useStopList } from "@/hooks/useStopList";
import type { BranchId, CategoryId, Product } from "@/lib/types";

type Props = {
  branch: BranchId;
  onCartChanged?: () => void;
};

export function CustomerCatalog({ branch, onCartChanged }: Props) {
  const { isStopped } = useStopList();
  const [activeCategory, setActiveCategory] = useState<CategoryId | "all">("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const branchAllowed =
        !product.branchAvailability || product.branchAvailability.includes(branch);

      const categoryAllowed =
        activeCategory === "all" || product.category === activeCategory;

      return branchAllowed && categoryAllowed;
    });
  }, [branch, activeCategory]);

  const handleAdd = (
    product: Product,
    payload?: { optionId?: string; optionName?: string; optionPrice?: number }
  ) => {
    addToCart({
      branch,
      product,
      optionId: payload?.optionId,
      optionName: payload?.optionName,
      optionPrice: payload?.optionPrice,
    });

    onCartChanged?.();
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          onClick={() => setActiveCategory("all")}
          className="rounded-full"
        >
          Все
        </Button>

        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "outline"}
            onClick={() => setActiveCategory(category.id)}
            className="rounded-full whitespace-nowrap"
          >
            {category.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProducts.map((product) => {
          const stopped = isStopped(branch, product.id);

          return (
            <ProductCard
              key={product.id}
              product={product}
              stopped={stopped}
              onOpen={() => setSelectedProduct(product)}
              onAdd={() => handleAdd(product)}
            />
          );
        })}
      </div>

      <ProductDialog
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        product={selectedProduct}
        stopped={selectedProduct ? isStopped(branch, selectedProduct.id) : false}
        onAdd={(payload) => {
          if (!selectedProduct) return;
          handleAdd(selectedProduct, payload);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}
