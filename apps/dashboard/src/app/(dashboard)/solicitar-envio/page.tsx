import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateDraftMovement, getUnitUserContext } from './actions';
import { SolicitarEnvioClient } from './solicitar-envio-client';
import { redirect } from 'next/navigation';

export default async function SolicitarEnvioPage() {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');
  if (auth.profile?.role !== 'UNIT_USER') redirect('/permission-denied');

  const [draft, ctx] = await Promise.all([getOrCreateDraftMovement(), getUnitUserContext()]);

  if (ctx.error || !ctx.originUnitId || !ctx.destUnitId) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.unitUser.requestShipment}</h1>
        <p className="mt-2 text-destructive">{ctx.error ?? 'Configuração incompleta'}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: originUnit } = await supabase
    .from('units')
    .select('ul_code, name')
    .eq('id', ctx.originUnitId)
    .single();
  const { data: destUnit } = await supabase
    .from('units')
    .select('ul_code, name')
    .eq('id', ctx.destUnitId)
    .single();

  const originName = originUnit ? `${originUnit.ul_code} - ${originUnit.name}` : '-';
  const destName = destUnit ? `${destUnit.ul_code} - ${destUnit.name}` : '-';

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.unitUser.requestShipment}</h1>
      <SolicitarEnvioClient
        movementId={draft.movementId}
        items={draft.items}
        originUnitName={originName}
        destUnitName={destName}
      />
    </main>
  );
}
