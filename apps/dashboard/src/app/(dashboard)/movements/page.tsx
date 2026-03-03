import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { getUnits } from '@/app/(dashboard)/units/actions';
import { listUsers } from '@/app/(dashboard)/users/actions';
import { listMovements } from '@/lib/movements';
import type { MovementStatus } from '@/lib/movements';
import { MovementsClient } from './movements-client';
import { redirect } from 'next/navigation';
import { SELECT_ALL_VALUE } from '@/lib/select';

const VALID_STATUSES: MovementStatus[] = [
  'requested',
  'picked_up',
  'received',
  'delivered',
  'canceled',
];

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MovementsPage({ searchParams }: Props) {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN' && auth.profile?.role !== 'SEAME_ADMIN') {
    redirect('/permission-denied');
  }

  const params = await searchParams;
  const statusParam =
    typeof params.status === 'string' && params.status !== SELECT_ALL_VALUE
      ? params.status
      : undefined;
  const status: MovementStatus | undefined =
    statusParam && VALID_STATUSES.includes(statusParam as MovementStatus)
      ? (statusParam as MovementStatus)
      : undefined;
  const originUnitId =
    typeof params.origin_unit_id === 'string' ? params.origin_unit_id : undefined;
  const destUnitId =
    typeof params.destination_unit_id === 'string' ? params.destination_unit_id : undefined;
  const pickupTechId =
    typeof params.pickup_technician_id === 'string' ? params.pickup_technician_id : undefined;
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined;
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined;

  const [movementsResult, unitsResult, usersResult] = await Promise.all([
    listMovements({
      status,
      origin_unit_id: originUnitId,
      destination_unit_id: destUnitId,
      pickup_technician_id: pickupTechId,
      date_from: dateFrom,
      date_to: dateTo,
    }),
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
        <h1 className="text-2xl font-bold">{labels.nav.movements}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.movements.title}</h1>
      <MovementsClient movements={movements} units={units} users={users} />
    </main>
  );
}
