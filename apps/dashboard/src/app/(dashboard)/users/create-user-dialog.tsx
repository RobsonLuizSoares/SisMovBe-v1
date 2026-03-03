'use client';

import { useState } from 'react';
import { labels } from '@sismovbe/labels';
import { createUser } from './actions';
import type { UserRole } from '@/lib/auth';
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

const ROLE_VALUES: UserRole[] = ['PATRIMONIO_ADMIN', 'SEAME_ADMIN', 'TECH', 'UNIT_USER'];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitOption[];
  allowedRoles: UserRole[];
};

export function CreateUserDialog({ open, onOpenChange, units, allowedRoles }: Props) {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('TECH');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const rolesToShow = allowedRoles.filter((r) => ROLE_VALUES.includes(r));
  const unitsWithId = units.filter((u) => u.id);
  const canSubmit = Boolean(
    email?.trim() && fullName?.trim() && role && unitId && unitsWithId.some((u) => u.id === unitId)
  );

  const reset = () => {
    setEmail('');
    setFullName('');
    setRole('TECH');
    setUnitId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email?.trim()) {
      toast.error(labels.users.emailRequired);
      return;
    }
    if (!fullName?.trim()) {
      toast.error(labels.users.fullNameRequired);
      return;
    }
    if (!unitId) {
      toast.error(labels.users.unitRequired);
      return;
    }

    setLoading(true);
    const result = await createUser({
      email: email.trim(),
      full_name: fullName.trim(),
      role,
      unit_id: unitId,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.users.createSuccess);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.users.createUser}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="create-email">{labels.auth.email}</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@dominio.gov.br"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="create-fullName">{labels.users.fullName}</Label>
            <Input
              id="create-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{labels.users.role}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={loading}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={labels.users.selectRole} />
              </SelectTrigger>
              <SelectContent>
                {rolesToShow
                  .filter((r) => r && String(r).trim() !== '')
                  .map((r) => (
                    <SelectItem key={r} value={r}>
                      {labels.roles[r]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{labels.users.unit} *</Label>
            <Select
              value={unitId ?? ''}
              onValueChange={(v) => setUnitId(v || null)}
              disabled={loading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={labels.users.selectUnit} />
              </SelectTrigger>
              <SelectContent>
                {filterValidSelectItems(unitsWithId, (u) => u.id).map((u) => (
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
            <Button type="submit" disabled={loading || !canSubmit}>
              {loading ? labels.users.creating : labels.buttons.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
