'use client';

import { Badge } from '@/components/ui/badge';
import { labels } from '@sismovbe/labels';

const MOVEMENT_STATUS_MAP = {
  requested: 'requested',
  picked_up: 'picked_up',
  received: 'received',
  delivered: 'delivered',
  canceled: 'canceled',
} as const;

type MovementStatus = keyof typeof MOVEMENT_STATUS_MAP;

interface StatusBadgeProps {
  status: MovementStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = labels.status[status as keyof typeof labels.status] ?? status;
  const variant = MOVEMENT_STATUS_MAP[status] ?? 'secondary';

  return <Badge variant={variant as keyof typeof MOVEMENT_STATUS_MAP}>{label}</Badge>;
}
