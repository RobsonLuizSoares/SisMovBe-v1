import type { UserRole } from '@/lib/auth';

const PATRIMONIO_ADMIN_ROLES: UserRole[] = ['PATRIMONIO_ADMIN', 'SEAME_ADMIN', 'TECH', 'UNIT_USER'];
const SEAME_ADMIN_ROLES: UserRole[] = ['TECH', 'UNIT_USER'];

export function getAllowedRolesForCreate(actorRole: UserRole): UserRole[] {
  if (actorRole === 'PATRIMONIO_ADMIN') return PATRIMONIO_ADMIN_ROLES;
  if (actorRole === 'SEAME_ADMIN') return SEAME_ADMIN_ROLES;
  return [];
}
