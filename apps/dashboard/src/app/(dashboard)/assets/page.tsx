import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { listAssets, getUnits } from './actions';
import { AssetsTable } from './assets-table';
import { redirect } from 'next/navigation';

export default async function AssetsPage() {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');

  const [assetsResult, unitsResult] = await Promise.all([listAssets(), getUnits()]);

  const assets = assetsResult.data ?? [];
  const units = unitsResult.data ?? [];
  const error = assetsResult.error ?? unitsResult.error;

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.nav.assets}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.nav.assets}</h1>
      <AssetsTable assets={assets} units={units} />
    </main>
  );
}
