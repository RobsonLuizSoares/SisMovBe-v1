'use client';

import { signOut } from '@/app/actions/auth';
import { labels } from '@sismovbe/labels';
import { Button } from '@/components/ui/button';
import { UserChip } from '@/components/layout/user-chip';
import type { ProfileWithUnit } from '@/lib/auth';
import { LogOut } from 'lucide-react';

type Props = {
  profile: ProfileWithUnit;
};

export function DashboardHeader({ profile }: Props) {
  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b bg-card px-6">
      <UserChip profile={profile} />
      <form action={signOut}>
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="mr-2 h-4 w-4" />
          {labels.auth.logout}
        </Button>
      </form>
    </header>
  );
}
