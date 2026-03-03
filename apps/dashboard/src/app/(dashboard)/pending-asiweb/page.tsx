import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { PendingAsiwebClient } from './pending-asiweb-client';
import { redirect } from 'next/navigation';

export default async function PendingAsiwebPage() {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');
  if (auth.profile?.role !== 'PATRIMONIO_ADMIN' && auth.profile?.role !== 'SEAME_ADMIN') {
    redirect('/permission-denied');
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.pendingAsiweb.title}</h1>
      <PendingAsiwebClient />
    </main>
  );
}
