import { redirect } from 'next/navigation';
import { requireAuth, getProfileWithUnit } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const result = await requireAuth();

  if (!result.allowed) {
    redirect(result.redirect);
  }

  const profileWithUnit = await getProfileWithUnit();
  if (!profileWithUnit) {
    redirect('/login');
  }

  return <DashboardLayout profile={profileWithUnit}>{children}</DashboardLayout>;
}
