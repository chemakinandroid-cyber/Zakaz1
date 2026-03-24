"use client";

import { useEffect, useState } from "react";
import { CustomerCatalog } from "@/components/CustomerCatalog";
import { CartPanel } from "@/components/CartPanel";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/storage";
import type { BranchId } from "@/lib/types";

export default function HomePage() {
  const [branch, setBranch] = useState<BranchId>("airport");
  const [cartTick, setCartTick] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEYS.BRANCH) as BranchId | null;
    if (saved === "airport" || saved === "konechnaya") {
      setBranch(saved);
    }
  }, []);

  const switchBranch = (next: BranchId) => {
    setBranch(next);
    window.localStorage.setItem(STORAGE_KEYS.BRANCH, next);
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">На Виражах</h1>
              <p className="text-sm text-neutral-500">Онлайн-заказ</p>
            </div>

            <div className="flex gap-2">
              <Button variant={branch === "airport" ? "default" : "outline"} onClick={() => switchBranch("airport")}>
                Аэропорт
              </Button>
              <Button variant={branch === "konechnaya" ? "default" : "outline"} onClick={() => switchBranch("konechnaya")}>
                Конечная
              </Button>
            </div>
          </div>

          <CustomerCatalog branch={branch} onCartChanged={() => setCartTick((x) => x + 1)} />
        </section>

        <aside key={cartTick}>
          <CartPanel branch={branch} />
        </aside>
      </div>
    </main>
  );
}
