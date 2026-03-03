'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { invokeSendMovementEmail } from '@/lib/sendMovementEmail';

export async function getUnitUserContext(): Promise<{
  originUnitId: string | null;
  destUnitId: string | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.profile)
    return { originUnitId: null, destUnitId: null, error: 'Não autorizado' };
  if (auth.profile.role !== 'UNIT_USER')
    return { originUnitId: null, destUnitId: null, error: 'Apenas para usuários de unidade' };
  const unitId = auth.profile.unit_id as string | null;
  if (!unitId)
    return { originUnitId: null, destUnitId: null, error: 'Unidade não definida no perfil' };

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('app_settings')
    .select('seame_receipts_ul_code')
    .eq('id', 1)
    .single();
  const ulCode = settings?.seame_receipts_ul_code;
  if (!ulCode)
    return { originUnitId: unitId, destUnitId: null, error: 'Configuração SEAME não encontrada' };

  const { data: destUnit } = await supabase
    .from('units')
    .select('id')
    .eq('ul_code', ulCode)
    .single();
  if (!destUnit)
    return { originUnitId: unitId, destUnitId: null, error: 'Unidade destino não encontrada' };

  return { originUnitId: unitId, destUnitId: destUnit.id, error: null };
}

export async function getOrCreateDraftMovement(): Promise<{
  movementId: string | null;
  items: Array<{ id: string; tombamento_text: string; scanned_method: string }>;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { movementId: null, items: [], error: 'Não autorizado' };
  const ctx = await getUnitUserContext();
  if (ctx.error || !ctx.originUnitId || !ctx.destUnitId)
    return { movementId: null, items: [], error: ctx.error ?? 'Dados incompletos' };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('movements')
    .select('id')
    .eq('requested_by', auth.user.id)
    .eq('status', 'requested')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const { data: items } = await supabase
      .from('movement_items')
      .select('id, tombamento_text, scanned_method')
      .eq('movement_id', existing.id);
    return {
      movementId: existing.id,
      items: (items ?? []) as Array<{
        id: string;
        tombamento_text: string;
        scanned_method: string;
      }>,
      error: null,
    };
  }

  const { data: inserted, error } = await supabase
    .from('movements')
    .insert({
      requested_by: auth.user.id,
      origin_unit_id: ctx.originUnitId,
      destination_unit_id: ctx.destUnitId,
      status: 'requested',
    })
    .select('id')
    .single();

  if (error) return { movementId: null, items: [], error: error.message };
  revalidatePath('/solicitar-envio');
  return { movementId: inserted.id, items: [], error: null };
}

export async function createDraftMovement(): Promise<{
  movementId: string | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.user) return { movementId: null, error: 'Não autorizado' };
  const ctx = await getUnitUserContext();
  if (ctx.error || !ctx.originUnitId || !ctx.destUnitId)
    return { movementId: null, error: ctx.error ?? 'Dados incompletos' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('movements')
    .insert({
      requested_by: auth.user.id,
      origin_unit_id: ctx.originUnitId,
      destination_unit_id: ctx.destUnitId,
      status: 'requested',
    })
    .select('id')
    .single();

  if (error) return { movementId: null, error: error.message };
  revalidatePath('/solicitar-envio');
  return { movementId: data.id, error: null };
}

export async function searchAsset(barcodeOrTombamento: string): Promise<{
  asset: {
    id: string;
    tombamento: string;
    description: string;
    barcode_value: string | null;
    unit_ul: string;
    unit_name: string;
    responsible: string;
  } | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { asset: null, error: 'Não autorizado' };

  const trimmed = barcodeOrTombamento.trim();
  if (!trimmed) return { asset: null, error: 'Informe o código' };

  const supabase = await createClient();
  const { data } = await supabase
    .from('assets')
    .select('id, tombamento, description, barcode_value, current_unit_id')
    .or(`tombamento.eq.${trimmed},barcode_value.eq.${trimmed}`)
    .eq('active', true)
    .limit(1)
    .single();

  if (!data) return { asset: null, error: null };

  const { data: unit } = await supabase
    .from('units')
    .select('ul_code, name')
    .eq('id', data.current_unit_id)
    .single();
  const { data: resp } = await supabase
    .from('unit_responsibles')
    .select('name')
    .eq('unit_id', data.current_unit_id)
    .eq('is_primary', true)
    .limit(1)
    .single();

  return {
    asset: {
      id: data.id,
      tombamento: data.tombamento,
      description: data.description,
      barcode_value: data.barcode_value,
      unit_ul: unit?.ul_code ?? '',
      unit_name: unit?.name ?? '',
      responsible: (resp as { name: string } | null)?.name ?? '-',
    },
    error: null,
  };
}

export async function addMovementItem(
  movementId: string,
  tombamento: string,
  scannedMethod: 'barcode' | 'manual',
  labelPhotoUrl?: string
): Promise<{
  success: boolean;
  item?: { id: string; tombamento_text: string; scanned_method: string };
  error: string | null;
  emailWarning?: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { success: false, error: 'Não autorizado' };
  if (scannedMethod === 'manual' && !labelPhotoUrl)
    return { success: false, error: 'Foto obrigatória para inserção manual' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('movement_items')
    .insert({
      movement_id: movementId,
      tombamento_text: tombamento.trim(),
      scanned_method: scannedMethod,
      label_photo_url: labelPhotoUrl || null,
    })
    .select('id, tombamento_text, scanned_method')
    .single();

  if (error) return { success: false, error: error.message };

  const { count } = await supabase
    .from('movement_items')
    .select('*', { count: 'exact', head: true })
    .eq('movement_id', movementId);
  let emailWarning: string | null = null;
  if (count === 1) {
    const emailResult = await invokeSendMovementEmail('REQUESTED_CREATED', movementId);
    if (!('skipped' in emailResult && emailResult.skipped) && !emailResult.success) {
      emailWarning = 'Notificação por e-mail pendente (erro).';
    }
  }

  revalidatePath('/solicitar-envio');
  return {
    success: true,
    item: data as { id: string; tombamento_text: string; scanned_method: string },
    error: null,
    emailWarning,
  };
}

/** Excluir movement vazio (rollback) - RLS permite apenas quando 0 itens */
export async function deleteEmptyMovement(
  movementId: string
): Promise<{ success: boolean; error: string | null }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { success: false, error: 'Não autorizado' };

  const supabase = await createClient();
  const { error } = await supabase.from('movements').delete().eq('id', movementId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/solicitar-envio');
  revalidatePath('/minhas-solicitacoes');
  return { success: true, error: null };
}
