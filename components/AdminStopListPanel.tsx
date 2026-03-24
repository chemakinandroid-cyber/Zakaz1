import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStopList } from "@/hooks/useStopList";
import { products } from "@/lib/menu";
import type { BranchId } from "@/lib/types";

type Props = {
  branch: BranchId;
};

export function AdminStopListPanel({ branch }: Props) {
  const [query, setQuery] = useState("");
  const { isStopped, toggleItem } = useStopList();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return products.filter((p) => {
      const allowed = !p.branchAvailability || p.branchAvailability.includes(branch);
      if (!allowed) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });
  }, [branch, query]);

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Стоп-лист</div>
          <div className="text-sm text-neutral-500">Управление доступностью блюд для филиала</div>
        </div>
        <Badge variant="outline">{branch === "airport" ? "Аэропорт" : "Конечная"}</Badge>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск блюда..."
        className="mb-4"
      />

      <ScrollArea className="h-[420px] pr-3">
        <div className="space-y-2">
          {filtered.map((item) => {
            const stopped = isStopped(branch, item.id);

            return (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border p-3">
                <div className="min-w-0 pr-3">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="truncate text-sm text-neutral-500">{item.description}</div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleItem(branch, item.id)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    stopped ? "bg-red-600 text-white" : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {stopped ? "На стопе" : "Доступно"}
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
