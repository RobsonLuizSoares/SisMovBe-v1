'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { getMovementDetail, deleteMovementForAdmin } from '@/lib/movements';
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
import { DeleteMovementConfirmDialog } from '../_components/delete-movement-confirm-dialog';
import type { MovementItem, MovementEvent } from '@/lib/movements';
import { SELECT_ALL_VALUE, filterValidSelectItems } from '@/lib/select';
import { Eye, Trash2 } from 'lucide-react';
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
  units: UnitOption[];
  users: ProfileWithEmail[];
};

export function MovementsClient({ movements: initialMovements, units, users }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [movements, setMovements] = useState(initialMovements);
  const [detailMovement, setDetailMovement] = useState<MovementListItem | null>(null);
  const [detailItems, setDetailItems] = useState<MovementItem[]>([]);
  const [detailEvents, setDetailEvents] = useState<MovementEvent[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteConfirmMovement, setDeleteConfirmMovement] = useState<MovementListItem | null>(null);

  const [filterStatus, setFilterStatus] = useState(searchParams?.get('status') ?? SELECT_ALL_VALUE);
  const [filterOrigin, setFilterOrigin] = useState(
    searchParams?.get('origin_unit_id') ?? SELECT_ALL_VALUE
  );
  const [filterDest, setFilterDest] = useState(
    searchParams?.get('destination_unit_id') ?? SELECT_ALL_VALUE
  );
  const [filterPickupTech, setFilterPickupTech] = useState(
    searchParams?.get('pickup_technician_id') ?? SELECT_ALL_VALUE
  );
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams?.get('date_from') ?? '');
  const [filterDateTo, setFilterDateTo] = useState(searchParams?.get('date_to') ?? '');

  useEffect(() => setMovements(initialMovements), [initialMovements]);
  useEffect(() => {
    setFilterStatus(searchParams?.get('status') ?? SELECT_ALL_VALUE);
    setFilterOrigin(searchParams?.get('origin_unit_id') ?? SELECT_ALL_VALUE);
    setFilterDest(searchParams?.get('destination_unit_id') ?? SELECT_ALL_VALUE);
    setFilterPickupTech(searchParams?.get('pickup_technician_id') ?? SELECT_ALL_VALUE);
    setFilterDateFrom(searchParams?.get('date_from') ?? '');
    setFilterDateTo(searchParams?.get('date_to') ?? '');
  }, [searchParams]);

  const detailId = searchParams?.get('detail');
  useEffect(() => {
    if (!detailId || detailOpen) return;
    setLoadingDetail(true);
    getMovementDetail(detailId).then((r) => {
      setLoadingDetail(false);
      if (r.movement) {
        setDetailMovement(r.movement);
        setDetailItems(r.items);
        setDetailEvents(r.events);
        setDetailOpen(true);
      }
    });
  }, [detailId, detailOpen]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filterStatus && filterStatus !== SELECT_ALL_VALUE) params.set('status', filterStatus);
    if (filterOrigin && filterOrigin !== SELECT_ALL_VALUE)
      params.set('origin_unit_id', filterOrigin);
    if (filterDest && filterDest !== SELECT_ALL_VALUE)
      params.set('destination_unit_id', filterDest);
    if (filterPickupTech && filterPickupTech !== SELECT_ALL_VALUE)
      params.set('pickup_technician_id', filterPickupTech);
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);
    router.push(`/movements?${params.toString()}`);
  };

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
          <Label className="text-xs">{labels.movements.status}</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL_VALUE}>Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{labels.movements.origin}</Label>
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
          <Label className="text-xs">{labels.movements.destination}</Label>
          <Select value={filterDest} onValueChange={setFilterDest}>
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
          <Label className="text-xs">{labels.movements.pickupTech}</Label>
          <Select value={filterPickupTech} onValueChange={setFilterPickupTech}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL_VALUE}>Todos</SelectItem>
              {filterValidSelectItems(users, (u) => u.user_id).map((u) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.full_name ?? u.email ?? '-'}
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
              <TableHead>Status</TableHead>
              <TableHead>{labels.movements.asiweb}</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação encontrada.
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
                  <TableCell>
                    {['received', 'delivered'].includes(m.status) ? (
                      m.processed_asiweb ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        >
                          {labels.movements.asiwebProcessed}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          {labels.movements.asiwebPending}
                        </Badge>
                      )
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatUnitDisplay(m.origin_ul, m.origin_name)}</TableCell>
                  <TableCell>{formatUnitDisplay(m.dest_ul, m.dest_name)}</TableCell>
                  <TableCell>{m.requester_name ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetail(m)}
                        disabled={loadingDetail}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!m.processed_asiweb && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmMovement(m)}
                          disabled={loadingDetail}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <DeleteMovementConfirmDialog
        open={!!deleteConfirmMovement}
        onOpenChange={(open) => !open && setDeleteConfirmMovement(null)}
        movement={deleteConfirmMovement}
        itemCount={deleteConfirmMovement?.item_count ?? 0}
        onConfirm={async (id) => {
          const r = await deleteMovementForAdmin(id);
          if (!r.success) {
            toast.error(r.error);
            throw new Error(r.error);
          }
          toast.success('Movimentação excluída.');
          setDeleteConfirmMovement(null);
          router.refresh();
        }}
      />

      <MovementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        movement={detailMovement}
        items={detailItems}
        events={detailEvents}
        showHistory
        canDeleteMovement={detailMovement ? !detailMovement.processed_asiweb : false}
        onDeleteMovement={async (id) => {
          const r = await deleteMovementForAdmin(id);
          if (!r.success) {
            toast.error(r.error);
            throw new Error(r.error);
          }
          toast.success('Movimentação excluída.');
          router.refresh();
        }}
      />
    </div>
  );
}
