import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/types";

type Props = {
  status: OrderStatus;
};

const labels: Record<OrderStatus, string> = {
  new: "Новый",
  accepted: "Принят",
  cooking: "Готовится",
  ready: "Готов",
  completed: "Выдан",
  cancelled: "Отменён",
};

export function OrderStatusBadge({ status }: Props) {
  if (status === "ready") {
    return <Badge className="animate-pulse">{labels[status]}</Badge>;
  }

  if (status === "cancelled") {
    return <Badge variant="destructive">{labels[status]}</Badge>;
  }

  if (status === "completed") {
    return <Badge variant="secondary">{labels[status]}</Badge>;
  }

  return <Badge variant="outline">{labels[status]}</Badge>;
}
