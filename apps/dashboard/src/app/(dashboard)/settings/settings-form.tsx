'use client';

import { useState, useEffect } from 'react';
import { labels } from '@sismovbe/labels';
import { updateAppSettings } from './actions';
import type { AppSettings } from './actions';
import type { UnitOption } from './actions';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type Props = {
  settings: AppSettings;
  units: UnitOption[];
  canEdit: boolean;
};

export function SettingsForm({ settings, units, canEdit }: Props) {
  const [loading, setLoading] = useState(false);
  const [seameGroupEmail, setSeameGroupEmail] = useState(settings.seame_group_email);
  const [seameReceiptsUlCode, setSeameReceiptsUlCode] = useState(settings.seame_receipts_ul_code);

  useEffect(() => {
    setSeameGroupEmail(settings.seame_group_email);
    setSeameReceiptsUlCode(settings.seame_receipts_ul_code);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error(labels.settings.onlyPatrimonioAdmin);
      return;
    }
    if (!seameGroupEmail?.trim()) {
      toast.error(labels.settings.seameGroupEmailRequired);
      return;
    }
    if (!seameReceiptsUlCode?.trim()) {
      toast.error(labels.settings.ulCodeRequired);
      return;
    }

    const unit = units.find((u) => u.ul_code === seameReceiptsUlCode);
    if (!unit) {
      toast.error(labels.settings.ulCodeNotFound);
      return;
    }

    setLoading(true);
    const result = await updateAppSettings({
      seame_group_email: seameGroupEmail.trim(),
      seame_receipts_ul_code: seameReceiptsUlCode.trim(),
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.settings.updateSuccess);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.settings.title}</CardTitle>
        <CardDescription>
          Configurações gerais do sistema. Apenas Patrimônio Admin pode alterar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="seame_group_email">{labels.settings.seameGroupEmail}</Label>
            <Input
              id="seame_group_email"
              type="email"
              value={seameGroupEmail}
              onChange={(e) => setSeameGroupEmail(e.target.value)}
              placeholder="grupo@dominio.gov.br"
              required
              disabled={!canEdit || loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="seame_receipts_ul_code">{labels.settings.seameReceiptsUlCode}</Label>
            <Select
              value={seameReceiptsUlCode}
              onValueChange={setSeameReceiptsUlCode}
              disabled={!canEdit || loading}
              required
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={labels.users.selectUnit} />
              </SelectTrigger>
              <SelectContent>
                {filterValidSelectItems(units, (u) => u.ul_code).map((u) => (
                  <SelectItem key={u.id} value={u.ul_code}>
                    {u.ul_code} - {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unidade existente para recibos SEAME. Deve ser um código UL válido.
            </p>
          </div>
          {canEdit && (
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : labels.buttons.save}
            </Button>
          )}
          {!canEdit && (
            <p className="text-sm text-muted-foreground">{labels.settings.onlyPatrimonioAdmin}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
