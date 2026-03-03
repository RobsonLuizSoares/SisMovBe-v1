'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { updateAsset } from './actions';
import type { AssetWithUnit } from './actions';
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
  asset: AssetWithUnit | null;
  units: UnitOption[];
};

export function EditAssetDialog({ open, onOpenChange, asset, units }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tombamento, setTombamento] = useState('');
  const [description, setDescription] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (asset) {
      setTombamento(asset.tombamento);
      setDescription(asset.description);
      setBarcodeValue(asset.barcode_value ?? '');
      setUnitId(asset.current_unit_id);
      setActive(asset.active);
    }
  }, [asset, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
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
    const result = await updateAsset(asset.id, {
      tombamento: tombamento.trim(),
      description: description.trim(),
      barcode_value: barcodeValue.trim() || null,
      current_unit_id: unitId,
      active,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.assets.updateSuccess);
    router.refresh();
    onOpenChange(false);
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.assets.editAsset}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-tombamento">{labels.assets.tombamento} *</Label>
            <Input
              id="edit-tombamento"
              value={tombamento}
              onChange={(e) => setTombamento(e.target.value)}
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-description">{labels.assets.description} *</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-barcode">{labels.assets.barcode}</Label>
            <Input
              id="edit-barcode"
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="edit-active">{labels.assets.active}</Label>
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
