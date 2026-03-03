import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { listUsers, getUnits } from './actions';
import { UsersTable } from './users-table';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/auth';

export default async function UsersPage() {
  const auth = await requireAuth();
  if (!auth.allowed || !auth.profile) {
    redirect('/login');
  }

  const [usersResult, unitsResult] = await Promise.all([listUsers(), getUnits()]);

  const users = usersResult.data ?? [];
  const units = unitsResult.data ?? [];
  const error = usersResult.error ?? unitsResult.error;

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.nav.users}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.nav.users}</h1>
      <UsersTable users={users} units={units} currentUserRole={auth.profile.role as UserRole} />
    </main>
  );
}
