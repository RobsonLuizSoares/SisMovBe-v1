'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import {
  getMovementDetail,
  markAsProcessedAsiweb,
  getPendingAsiwebForExport,
  fetchAsiwebMovements,
} from '@/lib/movements';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MovementDetailDialog } from '../_components/movement-detail-dialog';
import type { MovementItem, MovementEvent } from '@/lib/movements';
import { Eye, CheckCircle2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  requested: labels.status.requested,
  picked_up: labels.status.picked_up,
  received: labels.status.received,
  delivered: labels.status.delivered,
  canceled: labels.status.canceled,
};

const PAGE_SIZES = [20, 50, 100];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function downloadCsv(rows: Array<Record<string, string>>, filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PendingAsiwebClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [movements, setMovements] = useState<MovementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [detailMovement, setDetailMovement] = useState<MovementListItem | null>(null);
  const [detailItems, setDetailItems] = useState<MovementItem[]>([]);
  const [detailEvents, setDetailEvents] = useState<MovementEvent[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data,
      total: t,
      error,
    } = await fetchAsiwebMovements({
      processed: activeTab === 'processed',
      page,
      pageSize,
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      setMovements([]);
      setTotal(0);
      return;
    }
    setMovements(data);
    setTotal(t);
  }, [activeTab, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'pending') setPage(1);
  }, [activeTab]);

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

  const handleMarkProcessed = async (mov: MovementListItem) => {
    setProcessingId(mov.id);
    const result = await markAsProcessedAsiweb(mov.id);
    setProcessingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.pendingAsiweb.processedSuccess);
    loadData();
    router.refresh();
  };

  const handleExport = async () => {
    setExporting(true);
    const { data } = await getPendingAsiwebForExport();
    setExporting(false);
    if (!data?.length) {
      toast.info(labels.pendingAsiweb.noPending);
      return;
    }
    const csvRows = data.map((r) => ({
      movement_id: r.movement_id,
      created_at: r.created_at,
      status: r.status,
      tombamento: r.tombamento_text,
      origem_ul: r.origin_ul,
      origem_nome: r.origin_name,
      destino_ul: r.dest_ul,
      destino_nome: r.dest_name,
      solicitante: r.requester_name,
    }));
    downloadCsv(csvRows, `pendencias-asiweb-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('CSV exportado');
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isEmpty = movements.length === 0 && !loading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'pending' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('pending')}
          >
            {labels.pendingAsiweb.tabPending}
          </Button>
          <Button
            variant={activeTab === 'processed' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('processed')}
          >
            {labels.pendingAsiweb.tabProcessed}
          </Button>
        </div>
        {activeTab === 'pending' && (
          <Button onClick={handleExport} disabled={exporting} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            {labels.pendingAsiweb.exportCsv}
          </Button>
        )}
      </div>

      {activeTab === 'processed' && (
        <p className="text-sm text-muted-foreground">{labels.pendingAsiweb.tabProcessedDesc}</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Solicitante</TableHead>
              {activeTab === 'processed' && (
                <>
                  <TableHead>{labels.pendingAsiweb.processedAt}</TableHead>
                  <TableHead>{labels.pendingAsiweb.processedBy}</TableHead>
                </>
              )}
              {activeTab === 'pending' && <TableHead className="w-[180px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={activeTab === 'processed' ? 8 : 7}
                  className="text-center text-muted-foreground py-8"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={activeTab === 'processed' ? 8 : 7}
                  className="text-center text-muted-foreground py-8"
                >
                  {activeTab === 'pending'
                    ? labels.pendingAsiweb.noPending
                    : labels.pendingAsiweb.noProcessed}
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
                  <TableCell>{m.requester_name ?? '-'}</TableCell>
                  {activeTab === 'processed' && (
                    <>
                      <TableCell>{m.processed_at ? formatDate(m.processed_at) : '-'}</TableCell>
                      <TableCell>
                        {m.processed_by_name ?? '-'}
                        {m.processed_by_role && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({m.processed_by_role})
                          </span>
                        )}
                      </TableCell>
                    </>
                  )}
                  {activeTab === 'pending' && (
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
                        <Button
                          size="sm"
                          onClick={() => handleMarkProcessed(m)}
                          disabled={processingId === m.id}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {processingId === m.id ? '...' : labels.pendingAsiweb.markProcessed}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {total} registro(s) • Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
