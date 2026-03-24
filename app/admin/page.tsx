"use client";

import { useState } from "react";
import { AdminOrdersPanel } from "@/components/AdminOrdersPanel";
import { AdminStopListPanel } from "@/components/AdminStopListPanel";
import { Button } from "@/components/ui/button";
import type { BranchId } from "@/lib/types";

export default function AdminPage() {
  const [branch, setBranch] = useState<BranchId>("airport");

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Админка — На Виражах</h1>
            <p className="text-sm text-neutral-500">Заказы, статусы, стоп-лист</p>
          </div>

          <div className="flex gap-2">
            <Button variant={branch === "airport" ? "default" : "outline"} onClick={() => setBranch("airport")}>
              Аэропорт
            </Button>
            <Button variant={branch === "konechnaya" ? "default" : "outline"} onClick={() => setBranch("konechnaya")}>
              Конечная
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <AdminStopListPanel branch={branch} />
          <AdminOrdersPanel />
        </div>
      </div>
    </main>
  );
}
