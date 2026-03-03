'use client';

import { useState, useEffect } from 'react';
import { labels } from '@sismovbe/labels';
import { updateUser } from './actions';
import type { UserRole } from '@/lib/auth';
import type { ProfileWithEmail, UnitOption } from './actions';
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
  user: ProfileWithEmail | null;
  units: UnitOption[];
  allowedRoles: UserRole[];
};

export function EditUserDialog({ open, onOpenChange, user, units, allowedRoles }: Props) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('TECH');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  const rolesToShow = allowedRoles.filter((r) => ROLE_VALUES.includes(r));
  const unitsWithId = units.filter((u) => u.id);
  const canSubmit = Boolean(
    fullName?.trim() && role && unitId && unitsWithId.some((u) => u.id === unitId)
  );

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? '');
      setRole(user.role);
      setUnitId(user.unit_id);
      setActive(user.active);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName?.trim()) {
      toast.error(labels.users.fullNameRequired);
      return;
    }
    if (!unitId) {
      toast.error(labels.users.unitRequired);
      return;
    }

    setLoading(true);
    const result = await updateUser(user.user_id, {
      full_name: fullName.trim(),
      role,
      unit_id: unitId,
      active,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.users.updateSuccess);
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.users.editUser}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-fullName">{labels.users.fullName}</Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="edit-active">{labels.status.active}</Label>
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
              {labels.buttons.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
