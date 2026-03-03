'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

export type ProfileWithEmail = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  unit_id: string | null;
  active: boolean;
  created_at: string | null;
  unit_name: string | null;
  unit_ul_code: string | null;
};

export type UnitOption = { id: string; name: string; ul_code: string };

export async function listUsers(): Promise<{
  data: ProfileWithEmail[] | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.profile) {
    return { data: null, error: 'Não autorizado' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_profiles_with_email');
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getUnits(): Promise<{ data: UnitOption[] | null; error: string | null }> {
  const auth = await requireAuth();
  if (!auth.allowed) return { data: null, error: 'Não autorizado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('units')
    .select('id, name, ul_code')
    .eq('active', true)
    .order('ul_code');
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

import { getAllowedRolesForCreate } from '@/lib/user-roles';

function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'PATRIMONIO_ADMIN') return true;
  if (actorRole === 'SEAME_ADMIN') {
    return targetRole !== 'PATRIMONIO_ADMIN' && targetRole !== 'SEAME_ADMIN';
  }
  return false;
}

function canEditProfile(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === 'PATRIMONIO_ADMIN') return actorRole === 'PATRIMONIO_ADMIN';
  return canManageRole(actorRole, targetRole);
}

export async function createUser(formData: {
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
}) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.profile) {
    return { error: 'Não autorizado' };
  }

  const { email, full_name, role, unit_id } = formData;
  const actorRole = auth.profile.role as UserRole;
  const allowedRoles = getAllowedRolesForCreate(actorRole);

  if (!email?.trim()) return { error: 'E-mail é obrigatório' };
  if (!full_name?.trim()) return { error: 'Nome é obrigatório' };
  if (!role) return { error: 'Perfil é obrigatório' };
  if (!unit_id?.trim()) return { error: 'Unidade é obrigatória para todos os usuários' };
  if (!allowedRoles.includes(role)) {
    return { error: 'Sem permissão para criar esse perfil' };
  }

  const supabase = await createClient();
  const { data: unitExists } = await supabase
    .from('units')
    .select('id')
    .eq('id', unit_id)
    .eq('active', true)
    .single();
  if (!unitExists) return { error: 'Unidade não encontrada ou inativa' };

  try {
    const admin = createAdminClient();
    const tempPassword = crypto.randomUUID() + 'A1!';

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        return { error: 'E-mail já cadastrado' };
      }
      return { error: createError.message };
    }
    if (!newUser.user) return { error: 'Erro ao criar usuário' };

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: newUser.user.id,
        full_name: full_name.trim(),
        role,
        unit_id,
        active: true,
      },
      { onConflict: 'user_id' }
    );

    if (profileError) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      return { error: 'Erro ao criar perfil: ' + profileError.message };
    }

    const { error: resetError } = await admin.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
    });

    if (resetError) {
      console.warn('Password reset email failed:', resetError);
    }

    revalidatePath('/users');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar usuário' };
  }
}

export async function updateUser(
  userId: string,
  formData: { full_name: string; role: UserRole; unit_id: string | null; active: boolean }
) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.profile) return { error: 'Não autorizado' };

  const supabase = await createClient();
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (!targetProfile) return { error: 'Usuário não encontrado' };
  const actorRole = auth.profile.role as UserRole;
  if (!canEditProfile(actorRole, targetProfile.role as UserRole)) {
    return { error: 'Sem permissão para editar este usuário' };
  }

  const { full_name, role, unit_id, active } = formData;
  if (!full_name?.trim()) return { error: 'Nome é obrigatório' };
  if (!unit_id?.trim()) return { error: 'Unidade é obrigatória para todos os usuários' };

  const allowedRoles = getAllowedRolesForCreate(actorRole);
  if (!allowedRoles.includes(role)) {
    return { error: 'Sem permissão para atribuir esse perfil' };
  }

  const { data: unitExists } = await supabase
    .from('units')
    .select('id')
    .eq('id', unit_id)
    .eq('active', true)
    .single();
  if (!unitExists) return { error: 'Unidade não encontrada ou inativa' };

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: full_name.trim(),
      role,
      unit_id,
      active,
    })
    .eq('user_id', userId);

  if (error) return { error: error.message };
  revalidatePath('/users');
  return { success: true };
}

export async function resetUserPassword(email: string) {
  const auth = await requireAuth();
  if (!auth.allowed) return { error: 'Não autorizado' };

  if (!email?.trim()) return { error: 'E-mail é obrigatório' };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
    });
    if (error) return { error: error.message };
    revalidatePath('/users');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao enviar e-mail' };
  }
}

export async function toggleUserActive(userId: string, targetRole: UserRole) {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.profile) return { error: 'Não autorizado' };
  if (!canEditProfile(auth.profile.role as UserRole, targetRole)) {
    return { error: 'Sem permissão para editar este usuário' };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from('profiles')
    .select('active')
    .eq('user_id', userId)
    .single();

  if (!current) return { error: 'Usuário não encontrado' };

  const { error } = await supabase
    .from('profiles')
    .update({ active: !current.active })
    .eq('user_id', userId);

  if (error) return { error: error.message };
  revalidatePath('/users');
  return { success: true, active: !current.active };
}
