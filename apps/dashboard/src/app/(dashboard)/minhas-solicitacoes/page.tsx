import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { listMovementsByCurrentUser } from '@/lib/movements';
import { MinhasSolicitacoesClient } from './minhas-solicitacoes-client';
import { redirect } from 'next/navigation';

export default async function MinhasSolicitacoesPage() {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');
  if (auth.profile?.role !== 'UNIT_USER') redirect('/permission-denied');

  const { data: movements, error } = await listMovementsByCurrentUser();

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.unitUser.myRequests}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.unitUser.myRequests}</h1>
      <MinhasSolicitacoesClient movements={movements ?? []} />
    </main>
  );
}
