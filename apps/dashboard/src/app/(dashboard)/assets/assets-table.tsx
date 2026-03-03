'use client';

import { useState } from 'react';
import { labels } from '@sismovbe/labels';
import { toggleAssetActive } from './actions';
import type { AssetWithUnit } from './actions';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateAssetDialog } from './create-asset-dialog';
import { EditAssetDialog } from './edit-asset-dialog';
import { ImportCsvDialog } from './import-csv-dialog';
import { Pencil, MoreHorizontal, Upload, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitOption } from './actions';

type Props = {
  assets: AssetWithUnit[];
  units: UnitOption[];
};

export function AssetsTable({ assets, units }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<AssetWithUnit | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleToggle = async (asset: AssetWithUnit) => {
    const result = await toggleAssetActive(asset.id);
    if (result.error) toast.error(result.error);
    else
      toast.success(
        result.active ? labels.assets.activateSuccess : labels.assets.deactivateSuccess
      );
  };

  const openEdit = (asset: AssetWithUnit) => {
    setEditAsset(asset);
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold">{labels.nav.assets}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Importar CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>{labels.assets.createAsset}</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tombamento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum bem encontrado.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((a) => {
                const unitDisplay = a.unit_ul_code
                  ? `${a.unit_ul_code}${a.unit_name ? ` - ${a.unit_name}` : ''}`
                  : '-';
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.tombamento}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{a.description}</TableCell>
                    <TableCell>{unitDisplay}</TableCell>
                    <TableCell>{a.barcode_value ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={a.active ? 'default' : 'secondary'}>
                        {a.active ? labels.status.active : labels.status.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(a)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {labels.buttons.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(a)}>
                            {a.active ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateAssetDialog open={createOpen} onOpenChange={setCreateOpen} units={units} />
      <EditAssetDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditAsset(null);
        }}
        asset={editAsset}
        units={units}
      />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
