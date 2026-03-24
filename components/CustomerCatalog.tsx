'use client';

import { useMemo, useState } from 'react';
import { addToCart } from '../lib/cart';
import { categories, products } from '../lib/menu';
import type { BranchId, CategoryId, Product } from '../lib/types';
import { useStopList } from '../hooks/useStopList';
import { ProductCard } from './ProductCard';
import { ProductDialog } from './ProductDialog';

export function CustomerCatalog({ branch, onCartChanged }: { branch: BranchId; onCartChanged: () => void }) {
  const { isStopped } = useStopList();
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const branchAllowed = !product.branchAvailability || product.branchAvailability.includes(branch);
      const categoryAllowed = activeCategory === 'all' || product.category === activeCategory;
      return branchAllowed && categoryAllowed;
    });
  }, [activeCategory, branch]);

  const handleAdd = (product: Product, payload?: { optionId?: string; optionName?: string; optionPrice?: number }) => {
    addToCart({
      branch,
      product,
      optionId: payload?.optionId,
      optionName: payload?.optionName,
      optionPrice: payload?.optionPrice
    });
    onCartChanged();
  };

  return (
    <section className="stack-16">
      <div className="chip-row">
        <button className={`chip ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')} type="button">
          Все
        </button>
        {categories.map((category) => (
          <button
            className={`chip ${activeCategory === category.id ? 'active' : ''}`}
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="grid-products">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            onAdd={() => handleAdd(product)}
            onOpen={() => setSelectedProduct(product)}
            product={product}
            stopped={isStopped(branch, product.id)}
          />
        ))}
      </div>

      <ProductDialog
        onAdd={(payload) => {
          if (!selectedProduct) return;
          handleAdd(selectedProduct, payload);
          setSelectedProduct(null);
        }}
        onClose={() => setSelectedProduct(null)}
        open={!!selectedProduct}
        product={selectedProduct}
        stopped={selectedProduct ? isStopped(branch, selectedProduct.id) : false}
      />
    </section>
  );
}
