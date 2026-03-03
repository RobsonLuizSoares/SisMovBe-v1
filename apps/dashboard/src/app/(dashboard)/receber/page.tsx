import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { listReceiveMovements } from '@/lib/movements';
import { ReceberClient } from './receber-client';
import { redirect } from 'next/navigation';

export default async function ReceberPage() {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');
  if (auth.profile?.role !== 'TECH') redirect('/permission-denied');

  const { data: movements, error } = await listReceiveMovements();

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.tech.receive}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.tech.receive}</h1>
      <ReceberClient movements={movements ?? []} />
    </main>
  );
}
