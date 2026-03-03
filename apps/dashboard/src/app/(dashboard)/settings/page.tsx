import { labels } from '@sismovbe/labels';
import { requireAuth } from '@/lib/auth';
import { getAppSettings, getUnitsForSettings } from './actions';
import { SettingsForm } from './settings-form';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const auth = await requireAuth();
  if (!auth.allowed) redirect('/login');

  const [settingsResult, unitsResult] = await Promise.all([
    getAppSettings(),
    getUnitsForSettings(),
  ]);

  const settings = settingsResult.data;
  const units = unitsResult.data ?? [];
  const error = settingsResult.error ?? unitsResult.error;
  const canEdit = auth.profile?.role === 'PATRIMONIO_ADMIN';

  if (error) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.screenTitles.settings}</h1>
        <p className="mt-2 text-destructive">{error}</p>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">{labels.screenTitles.settings}</h1>
        <p className="mt-2 text-muted-foreground">Configurações não encontradas.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">{labels.screenTitles.settings}</h1>
      <SettingsForm settings={settings} units={units} canEdit={canEdit} />
    </main>
  );
}
