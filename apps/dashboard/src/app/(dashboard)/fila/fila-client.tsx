'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { getMovementDetail, startPickup } from '@/lib/movements';
import type { MovementListItem } from '@/lib/movements';
import { formatUnitDisplay, movementDisplayId } from '@/lib/movements.formatters';
import type { UnitOption } from '@/app/(dashboard)/units/actions';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MovementDetailDialog } from '../_components/movement-detail-dialog';
import type { MovementItem, MovementEvent } from '@/lib/movements';
import { SELECT_ALL_VALUE, filterValidSelectItems } from '@/lib/select';
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
  units: UnitOption[];
};

export function FilaClient({ movements: initialMovements, units }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [movements, setMovements] = useState(initialMovements);
  useEffect(() => setMovements(initialMovements), [initialMovements]);
  const [detailMovement, setDetailMovement] = useState<MovementListItem | null>(null);
  const [detailItems, setDetailItems] = useState<MovementItem[]>([]);
  const [detailEvents, setDetailEvents] = useState<MovementEvent[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [filterOrigin, setFilterOrigin] = useState(
    searchParams?.get('origin_unit_id') ?? SELECT_ALL_VALUE
  );

  useEffect(() => {
    setFilterOrigin(searchParams?.get('origin_unit_id') ?? SELECT_ALL_VALUE);
  }, [searchParams]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filterOrigin && filterOrigin !== SELECT_ALL_VALUE)
      params.set('origin_unit_id', filterOrigin);
    router.push(`/fila?${params.toString()}`);
  }, [router, filterOrigin]);

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

  const handleStartPickup = async (movementId: string) => {
    const result = await startPickup(movementId);
    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success('Recolhimento iniciado.');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border bg-muted/30">
        <div>
          <Label className="text-xs">{labels.requests.originUnit}</Label>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL_VALUE}>Todas</SelectItem>
              {filterValidSelectItems(units, (u) => u.id).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.ul_code} - {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters}>{labels.requests.filterApply}</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead className="w-[70px]">Itens</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma solicitação na fila.
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
                    {(m.item_count ?? 0) > 0 ? (
                      m.item_count
                    ) : (
                      <span className="text-destructive font-medium">0</span>
                    )}
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
        onStartPickup={handleStartPickup}
      />
    </div>
  );
}
