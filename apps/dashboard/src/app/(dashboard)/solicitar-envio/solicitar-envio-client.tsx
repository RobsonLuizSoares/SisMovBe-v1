'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { createDraftMovement, searchAsset, addMovementItem, deleteEmptyMovement } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useZxing } from 'react-zxing';
import { Camera, Package, Check } from 'lucide-react';
import { normalizeTombamento } from '@/lib/normalize';
import { toast } from 'sonner';

type CartItem = { id: string; tombamento_text: string; scanned_method: string };

type Props = {
  movementId: string | null;
  items: CartItem[];
  originUnitName: string;
  destUnitName: string;
};

export function SolicitarEnvioClient({
  movementId: initialMovementId,
  items: initialItems,
  originUnitName,
  destUnitName,
}: Props) {
  const router = useRouter();
  const [movementId, setMovementId] = useState(initialMovementId);
  const [items, setItems] = useState(initialItems);
  const [mode, setMode] = useState<'scan' | 'manual' | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [foundAsset, setFoundAsset] = useState<{
    tombamento: string;
    description: string;
    unit_ul: string;
    unit_name: string;
    responsible: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualPhoto, setManualPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { ref: videoRef } = useZxing({
    onDecodeResult(result) {
      const code = result.getText().trim();
      if (code) handleAddItem(code, 'barcode');
    },
    paused: mode !== 'scan',
  });

  const ensureMovement = useCallback(async () => {
    if (movementId) return movementId;
    setLoading(true);
    const r = await createDraftMovement();
    setLoading(false);
    if (r.movementId) {
      setMovementId(r.movementId);
      router.refresh();
      return r.movementId;
    }
    toast.error(r.error ?? 'Erro ao criar solicitação');
    return null;
  }, [movementId, router]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setLoading(true);
    const r = await searchAsset(searchInput.trim());
    setLoading(false);
    setFoundAsset(
      r.asset
        ? {
            tombamento: r.asset.tombamento,
            description: r.asset.description,
            unit_ul: r.asset.unit_ul,
            unit_name: r.asset.unit_name,
            responsible: r.asset.responsible,
          }
        : null
    );
    if (!r.asset) toast.info(labels.unitUser.assetNotFound);
  };

  const handleAddItem = async (tombamento: string, method: 'barcode' | 'manual') => {
    const mid = await ensureMovement();
    if (!mid) return;
    if (method === 'manual' && !manualPhoto) {
      toast.error(labels.unitUser.takePhoto);
      return;
    }
    const norm = normalizeTombamento(tombamento) ?? tombamento.trim();
    if (
      norm &&
      items.some(
        (i) => (normalizeTombamento(i.tombamento_text) ?? i.tombamento_text.trim()) === norm
      )
    ) {
      toast.error('Este tombamento já está no carrinho.');
      return;
    }
    setLoading(true);
    const r = await addMovementItem(
      mid,
      tombamento,
      method,
      method === 'manual' ? (manualPhoto ? manualPhoto : undefined) : undefined
    );
    setLoading(false);
    if (r.success && r.item) {
      setItems((prev) => [...prev, r.item!]);
      router.refresh();
      setFoundAsset(null);
      setSearchInput('');
      setManualPhoto(null);
      setMode(null);
      if (r.emailWarning) {
        toast.warning(`Solicitação criada. ${r.emailWarning}`);
      } else {
        toast.success(labels.unitUser.addItem);
      }
    } else {
      const { success } = await deleteEmptyMovement(mid);
      if (success) {
        setMovementId(null);
        setItems([]);
      }
      toast.error(
        r.error?.includes('movimentação ativa') ? 'Este bem já está em movimentação ativa' : r.error
      );
    }
  };

  const handleManualAdd = () => {
    if (!searchInput.trim()) {
      toast.error(labels.assets.tombamentoRequired);
      return;
    }
    if (!manualPhoto) {
      toast.error(labels.unitUser.takePhoto);
      return;
    }
    handleAddItem(searchInput.trim(), 'manual');
  };

  const capturePhoto = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setManualPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Solicitar envio</CardTitle>
          <p className="text-sm text-muted-foreground">
            Origem: {originUnitName} → Destino: {destUnitName}
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adicionar itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={mode === 'scan' ? 'default' : 'outline'}
                onClick={() => setMode(mode === 'scan' ? null : 'scan')}
              >
                <Camera className="h-4 w-4 mr-1" />
                {labels.unitUser.scanBarcode}
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                onClick={() => setMode(mode === 'manual' ? null : 'manual')}
              >
                <Package className="h-4 w-4 mr-1" />
                {labels.unitUser.manualEntry}
              </Button>
            </div>

            {mode === 'scan' && (
              <div className="space-y-2">
                <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                  <video
                    ref={videoRef as React.RefObject<HTMLVideoElement>}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Aponte a câmera para o código de barras
                </p>
              </div>
            )}

            {mode === 'manual' && (
              <div className="space-y-4">
                <div>
                  <Label>{labels.unitUser.tombamento}</Label>
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="TOM001 ou código de barras"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{labels.unitUser.takePhoto}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <Button type="button" variant="outline" onClick={capturePhoto} className="mt-1">
                    Tirar foto
                  </Button>
                  {manualPhoto && (
                    <div className="mt-2">
                      <img src={manualPhoto} alt="Foto" className="max-h-32 rounded border" />
                    </div>
                  )}
                </div>
                <Button onClick={handleManualAdd} disabled={loading}>
                  {labels.unitUser.addItem}
                </Button>
              </div>
            )}

            {mode !== 'scan' && mode !== 'manual' && (
              <div className="space-y-2">
                <Label>Buscar bem (tombamento ou código de barras)</Label>
                <div className="flex gap-2">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="TOM001 ou código"
                  />
                  <Button onClick={handleSearch} disabled={loading}>
                    Buscar
                  </Button>
                </div>
              </div>
            )}

            {foundAsset && (
              <Card className="border-green-200 bg-green-50/50 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-sm">{labels.unitUser.assetFound}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    <strong>Tombamento:</strong> {foundAsset.tombamento}
                  </p>
                  <p>
                    <strong>Descrição:</strong> {foundAsset.description}
                  </p>
                  <p>
                    <strong>UL atual:</strong> {foundAsset.unit_ul} - {foundAsset.unit_name}
                  </p>
                  <p>
                    <strong>Responsável:</strong> {foundAsset.responsible}
                  </p>
                  <Button size="sm" onClick={() => handleAddItem(foundAsset.tombamento, 'barcode')}>
                    <Check className="h-4 w-4 mr-1" />
                    Adicionar ao carrinho
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{labels.unitUser.cart}</CardTitle>
            <p className="text-sm text-muted-foreground">{items.length} itens</p>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">{labels.unitUser.noItems}</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <span>{item.tombamento_text}</span>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 0 && (
              <div className="mt-4">
                <Button asChild>
                  <a href="/minhas-solicitacoes">{labels.unitUser.finishRequest}</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
