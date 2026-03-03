'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import {
  normalizeUlCode,
  normalizeTombamento,
  normalizeDescription,
  normalizeBarcode,
} from '@/lib/normalize';

export type Asset = {
  id: string;
  tombamento: string;
  barcode_value: string | null;
  description: string;
  current_unit_id: string;
  active: boolean;
  last_synced_at: string | null;
};

export type AssetWithUnit = Asset & {
  unit_ul_code: string | null;
  unit_name: string | null;
};

export type UnitOption = { id: string; ul_code: string; name: string };

export async function listAssets(): Promise<{
  data: AssetWithUnit[] | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, tombamento, barcode_value, description, current_unit_id, active, last_synced_at')
    .order('tombamento');

  if (error) return { data: null, error: error.message };
  if (!assets?.length) return { data: [], error: null };

  const unitIds = [...new Set(assets.map((a) => a.current_unit_id))];
  const { data: units } = await supabase
    .from('units')
    .select('id, ul_code, name')
    .in('id', unitIds);
  const unitMap = new Map(
    (units ?? []).map((u: { id: string; ul_code: string; name: string }) => [u.id, u])
  );

  const mapped: AssetWithUnit[] = assets.map((a) => {
    const u = unitMap.get(a.current_unit_id);
    return {
      ...a,
      unit_ul_code: u?.ul_code ?? null,
      unit_name: u?.name ?? null,
    };
  });
  return { data: mapped, error: null };
}

export async function getUnits(): Promise<{ data: UnitOption[] | null; error: string | null }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('units')
    .select('id, ul_code, name')
    .eq('active', true)
    .order('ul_code');
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function createAsset(formData: {
  tombamento: string;
  description: string;
  barcode_value: string | null;
  current_unit_id: string;
}) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };
  if (!formData.tombamento?.trim()) return { error: 'Tombamento é obrigatório' };
  if (!formData.description?.trim()) return { error: 'Descrição é obrigatória' };
  if (!formData.current_unit_id) return { error: 'Unidade é obrigatória' };

  const supabase = await createClient();
  const { error } = await supabase.from('assets').insert({
    tombamento: formData.tombamento.trim(),
    description: formData.description.trim(),
    barcode_value: formData.barcode_value?.trim() || null,
    current_unit_id: formData.current_unit_id,
    active: true,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Tombamento já existe' };
    return { error: error.message };
  }
  revalidatePath('/assets');
  return { success: true };
}

export async function updateAsset(
  assetId: string,
  formData: {
    tombamento: string;
    description: string;
    barcode_value: string | null;
    current_unit_id: string;
    active: boolean;
  }
) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };
  if (!formData.tombamento?.trim()) return { error: 'Tombamento é obrigatório' };
  if (!formData.description?.trim()) return { error: 'Descrição é obrigatória' };
  if (!formData.current_unit_id) return { error: 'Unidade é obrigatória' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('assets')
    .update({
      tombamento: formData.tombamento.trim(),
      description: formData.description.trim(),
      barcode_value: formData.barcode_value?.trim() || null,
      current_unit_id: formData.current_unit_id,
      active: formData.active,
    })
    .eq('id', assetId);

  if (error) {
    if (error.code === '23505') return { error: 'Tombamento já existe' };
    return { error: error.message };
  }
  revalidatePath('/assets');
  return { success: true };
}

export async function toggleAssetActive(assetId: string) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from('assets')
    .select('active')
    .eq('id', assetId)
    .single();
  if (!current) return { error: 'Bem não encontrado' };

  const { error } = await supabase
    .from('assets')
    .update({ active: !current.active })
    .eq('id', assetId);
  if (error) return { error: error.message };
  revalidatePath('/assets');
  return { success: true, active: !current.active };
}

// --- CSV Import ---

export type CsvRow = {
  tombamento: string;
  description: string;
  ul_code_atual: string;
  barcode_value: string | null;
};

export type CsvPreviewRow = CsvRow & {
  rowIndex: number;
  ok: boolean;
  error?: string;
  unit_id?: string;
  tombamento_original: string;
  tombamento_normalizado: string | null;
  ul_original: string;
  ul_normalizada: string | null;
  description_normalizada: string | null;
  barcode_normalizado: string | null;
};

export async function validateCsvPreview(
  rows: CsvRow[],
  fillBarcodeWithTombamento = true
): Promise<{ ok: CsvPreviewRow[]; errors: CsvPreviewRow[] }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { ok: [], errors: [] };

  const supabase = await createClient();
  const { data: units } = await supabase.from('units').select('id, ul_code');

  const ulMap = new Map<string, string>();
  units?.forEach((u: { ul_code: string; id: string }) => {
    const norm = normalizeUlCode(u.ul_code);
    if (norm) ulMap.set(norm, u.id);
  });

  const ok: CsvPreviewRow[] = [];
  const errors: CsvPreviewRow[] = [];
  const seenTombamentos = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    const tombamento_original = String(r.tombamento ?? '').trim();
    const ul_original = String(r.ul_code_atual ?? '').trim();

    const tombamento_normalizado = normalizeTombamento(r.tombamento);
    const ul_normalizada = normalizeUlCode(r.ul_code_atual);
    const description_normalizada = normalizeDescription(r.description);
    let barcode_normalizado = normalizeBarcode(r.barcode_value);

    if (!tombamento_normalizado) {
      errors.push({
        ...r,
        rowIndex,
        ok: false,
        error: 'Tombamento vazio',
        tombamento_original,
        tombamento_normalizado: null,
        ul_original,
        ul_normalizada,
        description_normalizada,
        barcode_normalizado,
      });
      continue;
    }
    if (!description_normalizada) {
      errors.push({
        ...r,
        rowIndex,
        ok: false,
        error: 'Descrição vazia',
        tombamento_original,
        tombamento_normalizado,
        ul_original,
        ul_normalizada,
        description_normalizada: null,
        barcode_normalizado,
      });
      continue;
    }
    if (!ul_normalizada) {
      errors.push({
        ...r,
        rowIndex,
        ok: false,
        error: 'UL vazia',
        tombamento_original,
        tombamento_normalizado,
        ul_original,
        ul_normalizada: null,
        description_normalizada,
        barcode_normalizado,
      });
      continue;
    }

    const unitId = ulMap.get(ul_normalizada);
    if (!unitId) {
      errors.push({
        ...r,
        rowIndex,
        ok: false,
        error: `UL não encontrada: ${ul_normalizada}`,
        tombamento_original,
        tombamento_normalizado,
        ul_original,
        ul_normalizada,
        description_normalizada,
        barcode_normalizado,
      });
      continue;
    }

    if (seenTombamentos.has(tombamento_normalizado)) {
      errors.push({
        ...r,
        rowIndex,
        ok: false,
        error: 'Tombamento duplicado no CSV',
        tombamento_original,
        tombamento_normalizado,
        ul_original,
        ul_normalizada,
        description_normalizada,
        barcode_normalizado,
      });
      continue;
    }
    seenTombamentos.add(tombamento_normalizado);

    if (fillBarcodeWithTombamento && !barcode_normalizado) {
      barcode_normalizado = tombamento_normalizado;
    }

    ok.push({
      ...r,
      rowIndex,
      ok: true,
      unit_id: unitId,
      tombamento_original,
      tombamento_normalizado,
      ul_original,
      ul_normalizada,
      description_normalizada,
      barcode_normalizado,
    });
  }

  return { ok, errors };
}

export async function importAssetsChunk(
  rows: CsvPreviewRow[]
): Promise<{ imported: number; failed: number; errors: { row: number; msg: string }[] }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { imported: 0, failed: 0, errors: [] };

  const supabase = await createClient();
  let imported = 0;
  let failed = 0;
  const errors: { row: number; msg: string }[] = [];

  for (const r of rows) {
    if (!r.unit_id || !r.tombamento_normalizado || !r.description_normalizada) continue;

    const { error } = await supabase.from('assets').upsert(
      {
        tombamento: r.tombamento_normalizado,
        description: r.description_normalizada,
        barcode_value: r.barcode_normalizado ?? null,
        current_unit_id: r.unit_id,
        active: true,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'tombamento' }
    );

    if (error) {
      failed++;
      errors.push({ row: r.rowIndex, msg: error.message });
    } else {
      imported++;
    }
  }

  revalidatePath('/assets');
  return { imported, failed, errors };
}
