import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { listUnits } from './actions';
import { UnitsTable } from './units-table';
import { redirect } from 'next/navigation';

export default async function UnitsPage() {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');

  const { data: units, error } = await listUnits();

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.nav.units}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.nav.units}</h1>
      <UnitsTable units={units ?? []} />
    </main>
  );
}
