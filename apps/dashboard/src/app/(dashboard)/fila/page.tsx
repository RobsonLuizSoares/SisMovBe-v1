import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { getUnits } from '@/app/(dashboard)/units/actions';
import { listQueueMovements } from '@/lib/movements';
import { FilaClient } from './fila-client';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function FilaPage({ searchParams }: Props) {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');
  if (auth.profile?.role !== 'TECH') redirect('/permission-denied');

  const params = await searchParams;
  const originUnitId =
    typeof params.origin_unit_id === 'string' ? params.origin_unit_id : undefined;

  const [movementsResult, unitsResult] = await Promise.all([
    listQueueMovements({ origin_unit_id: originUnitId }),
    getUnits(),
  ]);

  const movements = movementsResult.data ?? [];
  const units = unitsResult.data ?? [];
  const error = movementsResult.error ?? unitsResult.error;

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.tech.queue}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.tech.queue}</h1>
      <FilaClient movements={movements} units={units ?? []} />
    </main>
  );
}
