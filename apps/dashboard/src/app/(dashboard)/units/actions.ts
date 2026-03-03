'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';

export type Unit = {
  id: string;
  ul_code: string;
  name: string;
  active: boolean;
};

export type UnitResponsible = {
  id: string;
  unit_id: string;
  name: string;
  email: string;
  is_primary: boolean;
  active: boolean;
};

const UL_CODE_REGEX = /^\d{6}$/;

function validateUlCode(val: string): boolean {
  return UL_CODE_REGEX.test(val);
}

export type UnitOption = { id: string; ul_code: string; name: string };

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

export async function listUnits(): Promise<{ data: Unit[] | null; error: string | null }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('units')
    .select('id, ul_code, name, active')
    .order('ul_code');
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function createUnit(formData: { ul_code: string; name: string; active: boolean }) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };

  const ul_code = formData.ul_code.replace(/\D/g, '').slice(0, 6);
  if (!validateUlCode(ul_code)) return { error: 'Código UL deve ter exatamente 6 dígitos' };
  if (!formData.name?.trim()) return { error: 'Nome é obrigatório' };

  const supabase = await createClient();
  const { error } = await supabase.from('units').insert({
    ul_code,
    name: formData.name.trim(),
    active: formData.active ?? true,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Código UL já existe' };
    return { error: error.message };
  }
  revalidatePath('/units');
  return { success: true };
}

export async function updateUnit(
  unitId: string,
  formData: { ul_code: string; name: string; active: boolean }
) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };

  const ul_code = formData.ul_code.replace(/\D/g, '').slice(0, 6);
  if (!validateUlCode(ul_code)) return { error: 'Código UL deve ter exatamente 6 dígitos' };
  if (!formData.name?.trim()) return { error: 'Nome é obrigatório' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('units')
    .update({ ul_code, name: formData.name.trim(), active: formData.active ?? true })
    .eq('id', unitId);

  if (error) {
    if (error.code === '23505') return { error: 'Código UL já existe' };
    return { error: error.message };
  }
  revalidatePath('/units');
  return { success: true };
}

export async function toggleUnitActive(unitId: string) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };

  const supabase = await createClient();
  const { data: current } = await supabase.from('units').select('active').eq('id', unitId).single();
  if (!current) return { error: 'Unidade não encontrada' };

  const { error } = await supabase
    .from('units')
    .update({ active: !current.active })
    .eq('id', unitId);
  if (error) return { error: error.message };
  revalidatePath('/units');
  return { success: true, active: !current.active };
}

// --- Unit Responsibles ---

export async function listResponsiblesByUnit(
  unitId: string
): Promise<{ data: UnitResponsible[] | null; error: string | null }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('unit_responsibles')
    .select('id, unit_id, name, email, is_primary, active')
    .eq('unit_id', unitId)
    .order('is_primary', { ascending: false })
    .order('name');
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function createResponsible(formData: {
  unit_id: string;
  name: string;
  email: string;
  is_primary: boolean;
}) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };
  if (!formData.name?.trim()) return { error: 'Nome é obrigatório' };
  if (!formData.email?.trim()) return { error: 'E-mail é obrigatório' };

  const supabase = await createClient();

  if (formData.is_primary) {
    await supabase
      .from('unit_responsibles')
      .update({ is_primary: false })
      .eq('unit_id', formData.unit_id);
  }

  const { error } = await supabase.from('unit_responsibles').insert({
    unit_id: formData.unit_id,
    name: formData.name.trim(),
    email: formData.email.trim(),
    is_primary: formData.is_primary ?? false,
    active: true,
  });

  if (error) return { error: error.message };
  revalidatePath('/units');
  return { success: true };
}

export async function updateResponsible(
  id: string,
  formData: { name: string; email: string; is_primary: boolean; active: boolean }
) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };
  if (!formData.name?.trim()) return { error: 'Nome é obrigatório' };
  if (!formData.email?.trim()) return { error: 'E-mail é obrigatório' };

  const supabase = await createClient();

  // Get current unit_id to unset other primaries if needed
  const { data: current } = await supabase
    .from('unit_responsibles')
    .select('unit_id')
    .eq('id', id)
    .single();
  if (!current) return { error: 'Responsável não encontrado' };

  if (formData.is_primary) {
    await supabase
      .from('unit_responsibles')
      .update({ is_primary: false })
      .eq('unit_id', current.unit_id)
      .neq('id', id);
  }

  const { error } = await supabase
    .from('unit_responsibles')
    .update({
      name: formData.name.trim(),
      email: formData.email.trim(),
      is_primary: formData.is_primary,
      active: formData.active,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/units');
  return { success: true };
}

export async function setResponsiblePrimary(responsibleId: string) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };

  const supabase = await createClient();
  const { data: resp } = await supabase
    .from('unit_responsibles')
    .select('unit_id')
    .eq('id', responsibleId)
    .single();
  if (!resp) return { error: 'Responsável não encontrado' };

  await supabase
    .from('unit_responsibles')
    .update({ is_primary: false })
    .eq('unit_id', resp.unit_id);

  const { error } = await supabase
    .from('unit_responsibles')
    .update({ is_primary: true })
    .eq('id', responsibleId);

  if (error) return { error: error.message };
  revalidatePath('/units');
  return { success: true };
}

export async function deleteResponsible(id: string) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };

  const supabase = await createClient();
  const { error } = await supabase.from('unit_responsibles').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/units');
  return { success: true };
}
