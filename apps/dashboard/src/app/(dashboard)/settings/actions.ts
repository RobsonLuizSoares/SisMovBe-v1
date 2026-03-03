'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';

export type AppSettings = {
  seame_group_email: string;
  seame_receipts_ul_code: string;
};

export type UnitOption = { id: string; ul_code: string; name: string };

export async function getAppSettings(): Promise<{
  data: AppSettings | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('seame_group_email, seame_receipts_ul_code')
    .eq('id', 1)
    .single();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Configurações não encontradas' };
  return {
    data: {
      seame_group_email: data.seame_group_email ?? '',
      seame_receipts_ul_code: data.seame_receipts_ul_code ?? '',
    },
    error: null,
  };
}

export async function getUnitsForSettings(): Promise<{
  data: UnitOption[] | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('units').select('id, ul_code, name').order('ul_code');
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function updateAppSettings(formData: {
  seame_group_email: string;
  seame_receipts_ul_code: string;
}) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN') {
    return { error: 'Apenas Patrimônio Admin pode editar configurações' };
  }

  const { seame_group_email, seame_receipts_ul_code } = formData;
  if (!seame_group_email?.trim()) return { error: 'E-mail do grupo é obrigatório' };
  if (!seame_receipts_ul_code?.trim()) return { error: 'Selecione uma unidade para recibos SEAME' };

  const supabase = await createClient();

  const { data: unitExists } = await supabase
    .from('units')
    .select('id')
    .eq('ul_code', seame_receipts_ul_code.trim())
    .limit(1)
    .single();

  if (!unitExists) return { error: 'Unidade não encontrada. Verifique o código UL.' };

  const { error } = await supabase
    .from('app_settings')
    .update({
      seame_group_email: seame_group_email.trim(),
      seame_receipts_ul_code: seame_receipts_ul_code.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) return { error: error.message };
  revalidatePath('/settings');
  return { success: true };
}
