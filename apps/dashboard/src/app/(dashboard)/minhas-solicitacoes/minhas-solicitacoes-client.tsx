'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { getMovementDetail, cancelMovementByUnitUser } from '@/lib/movements';
import type { MovementListItem } from '@/lib/movements';
import { formatUnitDisplay, movementDisplayId } from '@/lib/movements.formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MovementDetailDialog } from '../_components/movement-detail-dialog';
import type { MovementItem, MovementEvent } from '@/lib/movements';
import { Eye, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  requested: labels.status.requested,
  picked_up: labels.status.picked_up,
  received: labels.status.received,
  delivered: labels.status.delivered,
  canceled: labels.status.canceled,
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  movements: MovementListItem[];
};

export function MinhasSolicitacoesClient({ movements }: Props) {
  const router = useRouter();
  const [detailMovement, setDetailMovement] = useState<MovementListItem | null>(null);
  const [detailItems, setDetailItems] = useState<MovementItem[]>([]);
  const [detailEvents, setDetailEvents] = useState<MovementEvent[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const openDetail = async (mov: MovementListItem) => {
    setLoadingDetail(true);
    const r = await getMovementDetail(mov.id);
    setLoadingDetail(false);
    if (r.movement) {
      setDetailMovement(r.movement);
      setDetailItems(r.items);
      setDetailEvents(r.events);
      setDetailOpen(true);
    }
  };

  const handleCancel = async (mov: MovementListItem) => {
    if (mov.status !== 'requested') return;
    if (!confirm(labels.unitUser.cancelConfirm)) return;
    setCancelingId(mov.id);
    const result = await cancelMovementByUnitUser(mov.id);
    setCancelingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.unitUser.cancel);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="w-[70px]">Itens</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma solicitação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-semibold">{movementDisplayId(m)}</TableCell>
                  <TableCell>{formatDate(m.created_at)}</TableCell>
                  <TableCell>
                    <Badge>{STATUS_LABELS[m.status] ?? m.status}</Badge>
                  </TableCell>
                  <TableCell>{formatUnitDisplay(m.origin_ul, m.origin_name)}</TableCell>
                  <TableCell>{formatUnitDisplay(m.dest_ul, m.dest_name)}</TableCell>
                  <TableCell>
                    {(m.item_count ?? 0) > 0 ? (
                      m.item_count
                    ) : (
                      <span className="text-destructive font-medium">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetail(m)}
                        disabled={loadingDetail}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {m.status === 'requested' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleCancel(m)}
                          disabled={cancelingId === m.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {labels.unitUser.cancel}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MovementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        movement={detailMovement}
        items={detailItems}
        events={detailEvents}
        showHistory
      />
    </div>
  );
}
