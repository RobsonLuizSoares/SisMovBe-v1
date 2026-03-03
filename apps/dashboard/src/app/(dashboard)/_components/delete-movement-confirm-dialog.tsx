'use client';

import { useState } from 'react';
import type { MovementListItem } from '@/lib/movements';
import { formatUnitDisplay, movementDisplayId } from '@/lib/movements.formatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { labels } from '@sismovbe/labels';

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
  itemCount: number;
  onConfirm: (movementId: string) => Promise<void>;
};

export function DeleteMovementConfirmDialog({
  open,
  onOpenChange,
  movement,
  itemCount,
  onConfirm,
}: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!movement) return null;

  const displayCode = movementDisplayId(movement);
  const expectedText = `EXCLUIR ${displayCode}`;
  const isValid = confirmText.trim() === expectedText;

  const handleClose = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  const handleExclude = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      await onConfirm(movement.id);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" showClose={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir movimentação
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. A movimentação e todos os itens e eventos serão removidos
            permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">ATENÇÃO: Esta ação é irreversível.</p>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Código:</span>{' '}
              <span className="font-mono font-semibold">{displayCode}</span>
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
              <span className="text-muted-foreground">Status:</span>{' '}
              {STATUS_LABELS[movement.status] ?? movement.status}
            </div>
            <div>
              <span className="text-muted-foreground">Quantidade de itens:</span> {itemCount}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Digite <strong>{expectedText}</strong> para confirmar
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedText}
              className="font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleExclude} disabled={!isValid || loading}>
            {loading ? 'Excluindo...' : 'Excluir definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
