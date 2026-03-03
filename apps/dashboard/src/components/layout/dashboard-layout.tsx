'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import type { ProfileWithUnit } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  profile: ProfileWithUnit;
}

export function DashboardLayout({ children, profile }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={profile.role} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader profile={profile} />
        {children}
      </div>
    </div>
  );
}
