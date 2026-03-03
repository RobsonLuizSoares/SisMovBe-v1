'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { getMovementDetail } from '@/lib/movements';
import type { MovementListItem } from '@/lib/movements';
import { formatUnitDisplay, movementDisplayId } from '@/lib/movements.formatters';
import type { UnitOption } from '@/app/(dashboard)/units/actions';
import type { ProfileWithEmail } from '@/app/(dashboard)/users/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  units: UnitOption[];
  users: ProfileWithEmail[];
};

export function RequestsClient({ movements: initialMovements, units, users }: Props) {
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
  const [filterRequestedBy, setFilterRequestedBy] = useState(
    searchParams?.get('requested_by') ?? SELECT_ALL_VALUE
  );
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams?.get('date_from') ?? '');
  const [filterDateTo, setFilterDateTo] = useState(searchParams?.get('date_to') ?? '');

  useEffect(() => {
    setFilterOrigin(searchParams?.get('origin_unit_id') ?? SELECT_ALL_VALUE);
    setFilterRequestedBy(searchParams?.get('requested_by') ?? SELECT_ALL_VALUE);
    setFilterDateFrom(searchParams?.get('date_from') ?? '');
    setFilterDateTo(searchParams?.get('date_to') ?? '');
  }, [searchParams]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filterOrigin && filterOrigin !== SELECT_ALL_VALUE)
      params.set('origin_unit_id', filterOrigin);
    if (filterRequestedBy && filterRequestedBy !== SELECT_ALL_VALUE)
      params.set('requested_by', filterRequestedBy);
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);
    router.push(`/requests?${params.toString()}`);
  }, [router, filterOrigin, filterRequestedBy, filterDateFrom, filterDateTo]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border bg-muted/30">
        <div>
          <Label className="text-xs">{labels.requests.originUnit}</Label>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL_VALUE}>Todos</SelectItem>
              {filterValidSelectItems(units, (u) => u.id).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.ul_code} - {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{labels.requests.requestedBy}</Label>
          <Select value={filterRequestedBy} onValueChange={setFilterRequestedBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL_VALUE}>Todos</SelectItem>
              {filterValidSelectItems(users, (u) => u.user_id).map((u) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.full_name ?? u.email ?? u.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{labels.movements.from}</Label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <div>
          <Label className="text-xs">{labels.movements.to}</Label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-[140px]"
          />
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
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma solicitação encontrada.
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
      />
    </div>
  );
}
