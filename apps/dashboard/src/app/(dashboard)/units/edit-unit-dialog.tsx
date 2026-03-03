'use client';

import { useState, useCallback, useEffect } from 'react';
import { labels } from '@sismovbe/labels';
import {
  updateUnit,
  listResponsiblesByUnit,
  createResponsible,
  updateResponsible,
  setResponsiblePrimary,
  deleteResponsible,
} from './actions';
import type { Unit, UnitResponsible } from './actions';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Star, MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function formatUlCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
};

export function EditUnitDialog({ open, onOpenChange, unit }: Props) {
  const [loading, setLoading] = useState(false);
  const [ulCode, setUlCode] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [responsibles, setResponsibles] = useState<UnitResponsible[]>([]);
  const [loadingResp, setLoadingResp] = useState(false);

  const [respDialogOpen, setRespDialogOpen] = useState(false);
  const [editingResp, setEditingResp] = useState<UnitResponsible | null>(null);
  const [respName, setRespName] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [respPrimary, setRespPrimary] = useState(false);
  const [respActive, setRespActive] = useState(true);
  const [respLoading, setRespLoading] = useState(false);

  const handleUlCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUlCode(formatUlCode(e.target.value));
  }, []);

  useEffect(() => {
    if (unit && open) {
      setUlCode(unit.ul_code);
      setName(unit.name);
      setActive(unit.active);
      void (async () => {
        setLoadingResp(true);
        const r = await listResponsiblesByUnit(unit.id);
        setLoadingResp(false);
        setResponsibles(r.data ?? []);
      })();
    }
  }, [unit?.id, open]);

  const loadResponsibles = async () => {
    if (!unit) return;
    setLoadingResp(true);
    const r = await listResponsiblesByUnit(unit.id);
    setLoadingResp(false);
    setResponsibles(r.data ?? []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;
    if (ulCode.length !== 6) {
      toast.error(labels.units.ulCodeRequired);
      return;
    }
    if (!name?.trim()) {
      toast.error(labels.units.nameRequired);
      return;
    }

    setLoading(true);
    const result = await updateUnit(unit.id, { ul_code: ulCode, name: name.trim(), active });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(labels.units.updateSuccess);
    onOpenChange(false);
  };

  const openAddResp = () => {
    setEditingResp(null);
    setRespName('');
    setRespEmail('');
    setRespPrimary(responsibles.length === 0);
    setRespActive(true);
    setRespDialogOpen(true);
  };

  const openEditResp = (r: UnitResponsible) => {
    setEditingResp(r);
    setRespName(r.name);
    setRespEmail(r.email);
    setRespPrimary(r.is_primary);
    setRespActive(r.active);
    setRespDialogOpen(true);
  };

  const handleSaveResp = async () => {
    if (!unit) return;
    if (!respName?.trim()) {
      toast.error(labels.responsibles.nameRequired);
      return;
    }
    if (!respEmail?.trim()) {
      toast.error(labels.responsibles.emailRequired);
      return;
    }

    setRespLoading(true);
    if (editingResp) {
      const r = await updateResponsible(editingResp.id, {
        name: respName.trim(),
        email: respEmail.trim(),
        is_primary: respPrimary,
        active: respActive,
      });
      if (r.error) toast.error(r.error);
      else {
        toast.success(labels.responsibles.updateSuccess);
        setRespDialogOpen(false);
        loadResponsibles();
      }
    } else {
      const r = await createResponsible({
        unit_id: unit.id,
        name: respName.trim(),
        email: respEmail.trim(),
        is_primary: respPrimary,
      });
      if (r.error) toast.error(r.error);
      else {
        toast.success(labels.responsibles.createSuccess);
        setRespDialogOpen(false);
        loadResponsibles();
      }
    }
    setRespLoading(false);
  };

  const handleSetPrimary = async (id: string) => {
    const r = await setResponsiblePrimary(id);
    if (r.error) toast.error(r.error);
    else {
      toast.success(labels.responsibles.updateSuccess);
      loadResponsibles();
    }
  };

  const handleDeleteResp = async (id: string) => {
    if (!confirm('Remover este responsável?')) return;
    const r = await deleteResponsible(id);
    if (r.error) toast.error(r.error);
    else {
      toast.success(labels.responsibles.deleteSuccess);
      loadResponsibles();
    }
  };

  if (!unit) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.units.editUnit}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-ul_code">{labels.units.ulCode} *</Label>
                <Input
                  id="edit-ul_code"
                  value={ulCode}
                  onChange={handleUlCodeChange}
                  maxLength={6}
                  disabled={loading}
                  className="mt-1 font-mono tracking-wider"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">{labels.units.name} *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1"
                />
              </div>
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
              <Label htmlFor="edit-active">{labels.units.active}</Label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>{labels.responsibles.title}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openAddResp}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {labels.responsibles.add}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead className="w-[80px]">Principal</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingResp ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : responsibles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                          Nenhum responsável
                        </TableCell>
                      </TableRow>
                    ) : (
                      responsibles.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>
                            {r.is_primary ? (
                              <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPrimary(r.id)}
                                title={labels.responsibles.setPrimary}
                              >
                                <Star className="h-5 w-5" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditResp(r)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {labels.buttons.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteResp(r.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {labels.buttons.delete}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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

      {/* Responsável add/edit dialog */}
      <Dialog open={respDialogOpen} onOpenChange={setRespDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingResp ? labels.responsibles.edit : labels.responsibles.add}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{labels.responsibles.name} *</Label>
              <Input
                value={respName}
                onChange={(e) => setRespName(e.target.value)}
                disabled={respLoading}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{labels.responsibles.email} *</Label>
              <Input
                type="email"
                value={respEmail}
                onChange={(e) => setRespEmail(e.target.value)}
                disabled={respLoading}
                className="mt-1"
              />
            </div>
            {editingResp && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resp-active"
                  checked={respActive}
                  onChange={(e) => setRespActive(e.target.checked)}
                  disabled={respLoading}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="resp-active">{labels.status.active}</Label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="resp-primary"
                checked={respPrimary}
                onChange={(e) => setRespPrimary(e.target.checked)}
                disabled={respLoading}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="resp-primary">{labels.responsibles.primary}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRespDialogOpen(false)}
              disabled={respLoading}
            >
              {labels.buttons.cancel}
            </Button>
            <Button onClick={handleSaveResp} disabled={respLoading}>
              {respLoading ? 'Salvando...' : labels.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
