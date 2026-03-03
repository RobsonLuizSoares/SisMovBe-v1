'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { createAsset } from './actions';
import type { UnitOption } from './actions';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { filterValidSelectItems } from '@/lib/select';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitOption[];
};

export function CreateAssetDialog({ open, onOpenChange, units }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tombamento, setTombamento] = useState('');
  const [description, setDescription] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [unitId, setUnitId] = useState<string | null>(null);

  const reset = () => {
    setTombamento('');
    setDescription('');
    setBarcodeValue('');
    setUnitId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tombamento?.trim()) {
      toast.error(labels.assets.tombamentoRequired);
      return;
    }
    if (!description?.trim()) {
      toast.error(labels.assets.descriptionRequired);
      return;
    }
    if (!unitId) {
      toast.error(labels.assets.unitRequired);
      return;
    }

    setLoading(true);
    const result = await createAsset({
      tombamento: tombamento.trim(),
      description: description.trim(),
      barcode_value: barcodeValue.trim() || null,
      current_unit_id: unitId,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.assets.createSuccess);
    router.refresh();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.assets.createAsset}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="create-tombamento">{labels.assets.tombamento} *</Label>
            <Input
              id="create-tombamento"
              value={tombamento}
              onChange={(e) => setTombamento(e.target.value)}
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="create-description">{labels.assets.description} *</Label>
            <Input
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="create-barcode">{labels.assets.barcode}</Label>
            <Input
              id="create-barcode"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{labels.assets.unit} *</Label>
            <Select
              value={unitId ?? ''}
              onValueChange={(v) => setUnitId(v || null)}
              required
              disabled={loading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={labels.users.selectUnit} />
              </SelectTrigger>
              <SelectContent>
                {filterValidSelectItems(units, (u) => u.id).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.ul_code} - {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : labels.buttons.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
