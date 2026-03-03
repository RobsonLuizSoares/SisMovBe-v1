'use client';

import { useState } from 'react';
import { labels } from '@sismovbe/labels';
import type { MovementListItem, MovementItem, MovementEvent } from '@/lib/movements';
import { formatUnitDisplay, movementDisplayId } from '@/lib/movements.formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteMovementConfirmDialog } from './delete-movement-confirm-dialog';

function formatDateStr(d: string | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  requested: labels.status.requested,
  picked_up: labels.status.picked_up,
  received: labels.status.received,
  delivered: labels.status.delivered,
  canceled: labels.status.canceled,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: MovementListItem | null;
  items: MovementItem[];
  events: MovementEvent[];
  showHistory?: boolean;
  /** TECH: botão Iniciar recolhimento (status=requested) */
  onStartPickup?: (movementId: string) => Promise<unknown>;
  /** TECH: botão Confirmar recebimento (status=picked_up) */
  onConfirmReceive?: (movementId: string) => Promise<unknown>;
  /** Admin: botão Excluir movimentação (apenas quando processed_asiweb=false) */
  canDeleteMovement?: boolean;
  onDeleteMovement?: (movementId: string) => Promise<unknown>;
};

export function MovementDetailDialog({
  open,
  onOpenChange,
  movement,
  items,
  events,
  showHistory = true,
  onStartPickup,
  onConfirmReceive,
  canDeleteMovement,
  onDeleteMovement,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  if (!movement) return null;

  const handleStartPickup = async () => {
    if (!onStartPickup || movement.status !== 'requested') return;
    if (!confirm(labels.tech.pickupConfirm)) return;
    setActionLoading(true);
    try {
      await onStartPickup(movement.id);
      onOpenChange(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!onConfirmReceive || movement.status !== 'picked_up') return;
    if (!confirm(labels.tech.receiveConfirm)) return;
    setActionLoading(true);
    try {
      await onConfirmReceive(movement.id);
      onOpenChange(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono font-semibold">{movementDisplayId(movement)}</span>
            <Badge>{STATUS_LABELS[movement.status] ?? movement.status}</Badge>
            {showHistory && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="text-sm text-primary hover:underline ml-2"
              >
                {labels.requests.viewHistory}
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Data:</span>{' '}
              {formatDateStr(movement.created_at)}
            </div>
            <div>
              <span className="text-muted-foreground">Origem:</span>{' '}
              {formatUnitDisplay(movement.origin_ul, movement.origin_name)}
            </div>
            <div>
              <span className="text-muted-foreground">Destino:</span>{' '}
              {formatUnitDisplay(movement.dest_ul, movement.dest_name)}
            </div>
            <div>
              <span className="text-muted-foreground">Solicitante:</span>{' '}
              {movement.requester_name ?? '-'}
            </div>
            {movement.pickup_tech_name && (
              <div>
                <span className="text-muted-foreground">Técnico retirada:</span>{' '}
                {movement.pickup_tech_name}
              </div>
            )}
            {movement.receiver_name && (
              <div>
                <span className="text-muted-foreground">Recebedor:</span> {movement.receiver_name}
              </div>
            )}
            {movement.pickup_at && (
              <div>
                <span className="text-muted-foreground">{labels.movements.pickupAt}:</span>{' '}
                {formatDateStr(movement.pickup_at)}
              </div>
            )}
            {movement.received_at && (
              <div>
                <span className="text-muted-foreground">{labels.movements.receivedAt}:</span>{' '}
                {formatDateStr(movement.received_at)}
              </div>
            )}
            {movement.delivered_at && (
              <div>
                <span className="text-muted-foreground">{labels.movements.deliveredAt}:</span>{' '}
                {formatDateStr(movement.delivered_at)}
              </div>
            )}
            {['received', 'delivered'].includes(movement.status) && (
              <>
                <div>
                  <span className="text-muted-foreground">{labels.movements.asiwebStatus}:</span>{' '}
                  {movement.processed_asiweb
                    ? labels.movements.asiwebYes
                    : labels.movements.asiwebNo}
                </div>
                {movement.processed_asiweb && movement.processed_at && (
                  <>
                    <div>
                      <span className="text-muted-foreground">{labels.movements.processedAt}:</span>{' '}
                      {formatDateStr(movement.processed_at)}
                    </div>
                    {movement.processed_by_name && (
                      <div>
                        <span className="text-muted-foreground">
                          {labels.movements.processedBy}:
                        </span>{' '}
                        {movement.processed_by_name}
                        {movement.processed_by_role && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({movement.processed_by_role})
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {movement.notes && (
              <div className="col-span-2">
                <span className="text-muted-foreground">{labels.movements.notes}:</span>{' '}
                {movement.notes}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">{labels.requests.items}</h4>
            <div className="rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tombamento</TableHead>
                    <TableHead>Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        <span className="font-medium text-destructive">INVÁLIDO:</span>{' '}
                        {labels.requests.noItems} — Esta movimentação não possui itens (snapshot
                        vazio).
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.tombamento_text}</TableCell>
                        <TableCell>{i.scanned_method}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {(() => {
            const emailEvents = events
              .filter((e) => e.event_type === 'EMAIL_SENT' || e.event_type === 'EMAIL_FAILED')
              .slice(-10)
              .reverse();
            return (
              emailEvents.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Notificações por e-mail</h4>
                  <div className="rounded border divide-y max-h-40 overflow-auto">
                    {emailEvents.map((e) => {
                      const p = e.payload as {
                        emailType?: string;
                        recipients?: { to?: string[]; cc?: string[] } | string[];
                        status?: string;
                        errorMessage?: string;
                        success?: boolean;
                      };
                      const rec = p?.recipients;
                      const allRecipients = Array.isArray(rec)
                        ? rec
                        : [...new Set([...(rec?.to ?? []), ...(rec?.cc ?? [])])];
                      const statusLabel =
                        e.event_type === 'EMAIL_SENT'
                          ? p?.success === false
                            ? 'Não enviado'
                            : 'Enviado'
                          : `Erro: ${p?.errorMessage ?? '-'}`;
                      return (
                        <div key={e.id} className="p-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">
                              {formatDateStr(e.created_at)}
                            </span>
                            <Badge
                              variant={e.event_type === 'EMAIL_SENT' ? 'default' : 'destructive'}
                            >
                              {p?.emailType ?? '?'}
                            </Badge>
                            <span
                              className={e.event_type === 'EMAIL_FAILED' ? 'text-destructive' : ''}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          {allRecipients.length > 0 && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {allRecipients.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            );
          })()}

          {events.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{labels.movements.timeline}</h4>
              <div className="rounded border divide-y max-h-40 overflow-auto">
                {events
                  .filter((e) => e.event_type !== 'EMAIL_SENT' && e.event_type !== 'EMAIL_FAILED')
                  .map((e) => (
                    <div key={e.id} className="p-2 text-sm">
                      <span className="text-muted-foreground">{formatDateStr(e.created_at)}</span>
                      {e.actor_name && <span className="ml-2">({e.actor_name})</span>}
                      {e.from_status && e.to_status && (
                        <span className="ml-2">
                          → {STATUS_LABELS[e.from_status]} → {STATUS_LABELS[e.to_status]}
                        </span>
                      )}
                      {e.event_type && <span className="ml-2">{e.event_type}</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {(onStartPickup || onConfirmReceive || (canDeleteMovement && onDeleteMovement)) && (
          <DialogFooter>
            {movement.status === 'requested' && onStartPickup && (
              <Button onClick={handleStartPickup} disabled={actionLoading}>
                {actionLoading ? '...' : labels.tech.startPickup}
              </Button>
            )}
            {movement.status === 'picked_up' && onConfirmReceive && (
              <Button onClick={handleConfirmReceive} disabled={actionLoading}>
                {actionLoading ? '...' : labels.tech.confirmReceive}
              </Button>
            )}
            {canDeleteMovement && onDeleteMovement && (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={actionLoading}
              >
                Excluir movimentação
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>

      <DeleteMovementConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        movement={movement}
        itemCount={items.length}
        onConfirm={async (id) => {
          if (!onDeleteMovement) return;
          setActionLoading(true);
          try {
            await onDeleteMovement(id);
            onOpenChange(false);
          } finally {
            setActionLoading(false);
          }
        }}
      />

      {historyOpen && (
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{labels.requests.history}</DialogTitle>
            </DialogHeader>
            <div className="rounded border divide-y max-h-80 overflow-auto">
              {events.length === 0 ? (
                <div className="p-4 text-muted-foreground text-sm">{labels.requests.noItems}</div>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="p-3 text-sm">
                    <span className="text-muted-foreground">{formatDateStr(e.created_at)}</span>
                    {e.actor_name && <span className="ml-2">— {e.actor_name}</span>}
                    {e.from_status && e.to_status && (
                      <div className="mt-1">
                        {STATUS_LABELS[e.from_status]} → {STATUS_LABELS[e.to_status]}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
