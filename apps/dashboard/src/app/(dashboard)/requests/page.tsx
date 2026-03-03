import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { getUnits } from '@/app/(dashboard)/units/actions';
import { listUsers } from '@/app/(dashboard)/users/actions';
import { listMovements } from '@/lib/movements';
import { RequestsClient } from './requests-client';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RequestsPage({ searchParams }: Props) {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN' && auth.profile?.role !== 'SEAME_ADMIN') {
    redirect('/permission-denied');
  }

  const params = await searchParams;
  const originUnitId =
    typeof params.origin_unit_id === 'string' ? params.origin_unit_id : undefined;
  const requestedBy = typeof params.requested_by === 'string' ? params.requested_by : undefined;
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined;
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined;

  const [movementsResult, unitsResult, usersResult] = await Promise.all([
    listMovements(
      {
        origin_unit_id: originUnitId,
        requested_by: requestedBy,
        date_from: dateFrom,
        date_to: dateTo,
      },
      'requested'
    ),
    getUnits(),
    listUsers(),
  ]);

  const movements = movementsResult.data ?? [];
  const units = unitsResult.data ?? [];
  const users = usersResult.data ?? [];
  const error = movementsResult.error ?? unitsResult.error ?? usersResult.error;

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.nav.requests}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.requests.title}</h1>
      <RequestsClient movements={movements} units={units} users={users} />
    </main>
  );
}
