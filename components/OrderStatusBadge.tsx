import type { OrderStatus } from '../lib/types';

const labels: Record<OrderStatus, string> = {
  new: 'Новый',
  accepted: 'Принят',
  cooking: 'Готовится',
  ready: 'Готов',
  completed: 'Выдан',
  cancelled: 'Отменён'
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const className =
    status === 'ready'
      ? 'status-badge status-ready'
      : status === 'cancelled'
        ? 'status-badge status-cancelled'
        : status === 'completed'
          ? 'status-badge status-completed'
          : 'status-badge';

  return <span className={className}>{labels[status]}</span>;
}
