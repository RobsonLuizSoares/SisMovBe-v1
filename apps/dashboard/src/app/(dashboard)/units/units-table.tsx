'use client';

import { useState } from 'react';
import { labels } from '@sismovbe/labels';
import { toggleUnitActive } from './actions';
import type { Unit } from './actions';
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
import { CreateUnitDialog } from './create-unit-dialog';
import { EditUnitDialog } from './edit-unit-dialog';
import { Pencil, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  units: Unit[];
};

export function UnitsTable({ units }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleToggleActive = async (unit: Unit) => {
    const result = await toggleUnitActive(unit.id);
    if (result.error) toast.error(result.error);
    else
      toast.success(result.active ? labels.units.activateSuccess : labels.units.deactivateSuccess);
  };

  const openEdit = (unit: Unit) => {
    setEditUnit(unit);
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{labels.nav.units}</h2>
        <Button onClick={() => setCreateOpen(true)}>{labels.units.createUnit}</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código UL</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma unidade encontrada.
                </TableCell>
              </TableRow>
            ) : (
              units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-medium">{u.ul_code}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'secondary'}>
                      {u.active ? labels.status.active : labels.status.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleActive(u)}
                        title={u.active ? 'Desativar' : 'Ativar'}
                      >
                        {u.active ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUnitDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUnitDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditUnit(null);
        }}
        unit={editUnit}
      />
    </div>
  );
}
