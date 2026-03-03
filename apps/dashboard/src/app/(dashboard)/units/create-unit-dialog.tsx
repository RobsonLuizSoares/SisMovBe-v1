'use client';

import { useState, useCallback } from 'react';
import { labels } from '@sismovbe/labels';
import { createUnit } from './actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function formatUlCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  return digits;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateUnitDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [ulCode, setUlCode] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);

  const handleUlCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUlCode(formatUlCode(e.target.value));
  }, []);

  const reset = () => {
    setUlCode('');
    setName('');
    setActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ulCode.length !== 6) {
      toast.error(labels.units.ulCodeRequired);
      return;
    }
    if (!name?.trim()) {
      toast.error(labels.units.nameRequired);
      return;
    }

    setLoading(true);
    const result = await createUnit({ ul_code: ulCode, name: name.trim(), active });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.units.createSuccess);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.units.createUnit}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="create-ul_code">{labels.units.ulCode} *</Label>
            <Input
              id="create-ul_code"
              value={ulCode}
              onChange={handleUlCodeChange}
              placeholder={labels.units.ulCodePlaceholder}
              maxLength={6}
              disabled={loading}
              className="mt-1 font-mono tracking-wider"
            />
            <p className="text-xs text-muted-foreground mt-0.5">6 dígitos numéricos</p>
          </div>
          <div>
            <Label htmlFor="create-name">{labels.units.name} *</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da unidade"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="create-active">{labels.units.active}</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {labels.buttons.cancel}
            </Button>
            <Button type="submit" disabled={loading || ulCode.length !== 6}>
              {loading ? 'Salvando...' : labels.buttons.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
