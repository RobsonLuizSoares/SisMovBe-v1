import { createClient } from '@/lib/supabase/server';

export type UserRole = 'PATRIMONIO_ADMIN' | 'SEAME_ADMIN' | 'TECH' | 'UNIT_USER';

export const ALLOWED_DASHBOARD_ROLES: UserRole[] = [
  'PATRIMONIO_ADMIN',
  'SEAME_ADMIN',
  'TECH',
  'UNIT_USER',
];

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return profile;
}

export type ProfileWithUnit = {
  user_id: string;
  full_name: string | null;
  role: UserRole;
  unit_id: string | null;
  active: boolean;
  unit_ul_code: string | null;
  unit_name: string | null;
};

export async function getProfileWithUnit(): Promise<ProfileWithUnit | null> {
  const profile = await getProfile();
  if (!profile) return null;

  let unit_ul_code: string | null = null;
  let unit_name: string | null = null;

  if (profile.unit_id) {
    const supabase = await createClient();
    const { data: unit } = await supabase
      .from('units')
      .select('ul_code, name')
      .eq('id', profile.unit_id)
      .single();
    unit_ul_code = unit?.ul_code ?? null;
    unit_name = unit?.name ?? null;
  }

  return {
    user_id: profile.user_id,
    full_name: profile.full_name,
    role: profile.role as UserRole,
    unit_id: profile.unit_id,
    active: profile.active,
    unit_ul_code,
    unit_name,
  };
}

export async function requireAuth(allowedRoles = ALLOWED_DASHBOARD_ROLES) {
  const user = await getUser();
  if (!user) {
    return { allowed: false as const, redirect: '/login' };
  }

  const profile = await getProfile();
  if (!profile || !profile.active) {
    return { allowed: false as const, redirect: '/login' };
  }

  const hasRole = allowedRoles.includes(profile.role as UserRole);
  if (!hasRole) {
    return { allowed: false as const, redirect: '/permission-denied' };
  }

  return {
    allowed: true as const,
    user,
    profile,
  };
}
