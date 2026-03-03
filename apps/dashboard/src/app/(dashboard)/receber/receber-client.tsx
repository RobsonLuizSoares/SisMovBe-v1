'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { getMovementDetail, confirmReceive } from '@/lib/movements';
import type { MovementListItem } from '@/lib/movements';
import { formatUnitDisplay, movementDisplayId } from '@/lib/movements.formatters';
import { Button } from '@/components/ui/button';
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
import { Eye } from 'lucide-react';
import { toast } from 'sonner';

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

export function ReceberClient({ movements: initialMovements }: Props) {
  const router = useRouter();
  const [movements, setMovements] = useState(initialMovements);
  useEffect(() => setMovements(initialMovements), [initialMovements]);
  const [detailMovement, setDetailMovement] = useState<MovementListItem | null>(null);
  const [detailItems, setDetailItems] = useState<MovementItem[]>([]);
  const [detailEvents, setDetailEvents] = useState<MovementEvent[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const handleConfirmReceive = async (movementId: string) => {
    const result = await confirmReceive(movementId);
    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success('Recebimento confirmado.');
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
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Retirado em</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação aguardando recebimento.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-semibold">{movementDisplayId(m)}</TableCell>
                  <TableCell>{formatDate(m.created_at)}</TableCell>
                  <TableCell>{formatUnitDisplay(m.origin_ul, m.origin_name)}</TableCell>
                  <TableCell>{formatUnitDisplay(m.dest_ul, m.dest_name)}</TableCell>
                  <TableCell>{m.requester_name ?? '-'}</TableCell>
                  <TableCell>
                    {m.pickup_at
                      ? new Date(m.pickup_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDetail(m)}
                      disabled={loadingDetail}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
        onConfirmReceive={handleConfirmReceive}
      />
    </div>
  );
}
