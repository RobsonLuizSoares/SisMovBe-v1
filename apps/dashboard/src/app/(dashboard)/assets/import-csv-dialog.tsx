'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { labels } from '@sismovbe/labels';
import { validateCsvPreview, importAssetsChunk } from './actions';
import type { CsvRow, CsvPreviewRow } from './actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const CHUNK_SIZE = 20;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(String(current).trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += c;
    }
  }
  result.push(String(current).trim().replace(/^"|"$/g, ''));
  return result;
}

/** Garante string - nunca converter para number (Excel perde zeros à esquerda). */
function getCell(parts: string[], idx: number): string {
  if (idx < 0 || parts[idx] === undefined) return '';
  const v = parts[idx];
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headerParts = parseCsvLine(lines[0]);
  const headers = headerParts.map((h) => String(h).trim().toLowerCase().replace(/^"|"$/g, ''));
  const tombIdx = headers.indexOf('tombamento');
  const descIdx = headers.indexOf('description');
  const ulIdx = headers.indexOf('ul_code_atual');
  const barcodeIdx = headers.indexOf('barcode_value');

  if (tombIdx === -1 || descIdx === -1 || ulIdx === -1) return [];

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const barcodeRaw = getCell(parts, barcodeIdx);
    rows.push({
      tombamento: getCell(parts, tombIdx),
      description: getCell(parts, descIdx),
      ul_code_atual: getCell(parts, ulIdx),
      barcode_value: barcodeRaw === '' || barcodeRaw === '-' ? null : barcodeRaw,
    });
  }
  return rows;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Step = 'select' | 'preview' | 'importing' | 'report';

export function ImportCsvDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [fillBarcodeWithTombamento, setFillBarcodeWithTombamento] = useState(true);
  const [okRows, setOkRows] = useState<CsvPreviewRow[]>([]);
  const [errorRows, setErrorRows] = useState<CsvPreviewRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState({
    imported: 0,
    failed: 0,
    errors: [] as { row: number; msg: string }[],
  });
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStep('select');
    setFile(null);
    setOkRows([]);
    setErrorRows([]);
    setProgress(0);
    setReport({ imported: 0, failed: 0, errors: [] });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleParseAndValidate = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast.error(labels.importCsv.invalidFormat);
        setLoading(false);
        return;
      }
      const { ok, errors } = await validateCsvPreview(rows, fillBarcodeWithTombamento);
      setOkRows(ok);
      setErrorRows(errors);
      setStep('preview');
      if (ok.length === 0) {
        toast.error(labels.importCsv.noRows);
      }
    } catch {
      toast.error('Erro ao ler arquivo');
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (okRows.length === 0) return;
    setStep('importing');
    setProgress(0);

    const chunks: CsvPreviewRow[][] = [];
    for (let i = 0; i < okRows.length; i += CHUNK_SIZE) {
      chunks.push(okRows.slice(i, i + CHUNK_SIZE));
    }

    let totalImported = 0;
    let totalFailed = 0;
    const allErrors: { row: number; msg: string }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const result = await importAssetsChunk(chunks[i]);
      totalImported += result.imported;
      totalFailed += result.failed;
      allErrors.push(...result.errors);
      setProgress(((i + 1) / chunks.length) * 100);
    }

    setReport({ imported: totalImported, failed: totalFailed, errors: allErrors });
    setStep('report');
    if (totalImported > 0) router.refresh();
    if (totalFailed === 0) {
      toast.success(`${totalImported} bens importados/atualizados`);
    } else {
      toast.warning(`${totalImported} importados, ${totalFailed} falharam`);
    }
    onOpenChange(true);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{labels.importCsv.title}</DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              CSV com colunas: <code>tombamento</code>, <code>description</code>,{' '}
              <code>ul_code_atual</code> (4 ou 6 dígitos), <code>barcode_value</code> (opcional).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fill-barcode"
                checked={fillBarcodeWithTombamento}
                onChange={(e) => setFillBarcodeWithTombamento(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="fill-barcode" className="text-sm font-normal cursor-pointer">
                {labels.importCsv.fillBarcodeWithTombamento}
              </Label>
            </div>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file"
              />
              <label
                htmlFor="csv-file"
                className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <FileSpreadsheet className="h-12 w-12" />
                {file ? (
                  <span className="font-medium">{file.name}</span>
                ) : (
                  <span>{labels.importCsv.selectFile}</span>
                )}
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                {labels.buttons.cancel}
              </Button>
              <Button onClick={handleParseAndValidate} disabled={!file || loading}>
                {loading ? labels.importCsv.validating : labels.importCsv.preview}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {labels.importCsv.rowsOk}: {okRows.length}
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" />
                {labels.importCsv.rowsError}: {errorRows.length}
              </span>
            </div>
            <div className="grid gap-4 max-h-60 overflow-auto">
              {okRows.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-green-700">Linhas OK ({okRows.length})</h4>
                  <div className="rounded border overflow-auto max-h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>{labels.importCsv.tombamentoOriginal}</TableHead>
                          <TableHead>{labels.importCsv.tombamentoNormalized}</TableHead>
                          <TableHead>{labels.importCsv.ulOriginal}</TableHead>
                          <TableHead>{labels.importCsv.ulNormalized}</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Barcode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {okRows.slice(0, 15).map((r) => (
                          <TableRow key={`${r.rowIndex}-${r.tombamento_normalizado}`}>
                            <TableCell>{r.rowIndex}</TableCell>
                            <TableCell>{r.tombamento_original || '-'}</TableCell>
                            <TableCell>{r.tombamento_normalizado ?? '-'}</TableCell>
                            <TableCell>{r.ul_original || '-'}</TableCell>
                            <TableCell>{r.ul_normalizada ?? '-'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {r.description_normalizada ?? '-'}
                            </TableCell>
                            <TableCell>{r.barcode_normalizado ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {okRows.length > 15 && (
                      <p className="text-xs text-muted-foreground p-2">
                        ... e mais {okRows.length - 15} linhas
                      </p>
                    )}
                  </div>
                </div>
              )}
              {errorRows.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-destructive">
                    Linhas com erro ({errorRows.length})
                  </h4>
                  <div className="rounded border overflow-auto max-h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>{labels.importCsv.tombamentoOriginal}</TableHead>
                          <TableHead>{labels.importCsv.tombamentoNormalized}</TableHead>
                          <TableHead>{labels.importCsv.ulOriginal}</TableHead>
                          <TableHead>{labels.importCsv.ulNormalized}</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-[180px]">Erro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errorRows.map((r) => (
                          <TableRow key={`err-${r.rowIndex}-${r.tombamento_original}`}>
                            <TableCell>{r.rowIndex}</TableCell>
                            <TableCell>{r.tombamento_original || '-'}</TableCell>
                            <TableCell>{r.tombamento_normalizado ?? '-'}</TableCell>
                            <TableCell>{r.ul_original || '-'}</TableCell>
                            <TableCell>{r.ul_normalizada ?? '-'}</TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {r.description_normalizada ?? '-'}
                            </TableCell>
                            <TableCell className="text-destructive text-xs">{r.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                {labels.importCsv.back}
              </Button>
              <Button onClick={handleImport} disabled={okRows.length === 0}>
                {labels.importCsv.import}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 animate-pulse" />
              <span>{labels.importCsv.importing}</span>
            </div>
            <Progress value={progress} max={100} />
          </div>
        )}

        {step === 'report' && (
          <div className="space-y-4">
            <h4 className="font-medium">{labels.importCsv.report}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold text-green-600">{report.imported}</p>
                <p className="text-sm text-muted-foreground">{labels.importCsv.imported}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold text-destructive">{report.failed}</p>
                <p className="text-sm text-muted-foreground">{labels.importCsv.failed}</p>
              </div>
            </div>
            {report.errors.length > 0 && (
              <div className="rounded border overflow-auto max-h-32">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell className="text-destructive text-sm">{e.msg}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>{labels.importCsv.done}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
