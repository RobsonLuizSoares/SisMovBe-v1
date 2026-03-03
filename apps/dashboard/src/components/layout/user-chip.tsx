'use client';

import { labels } from '@sismovbe/labels';
import type { ProfileWithUnit } from '@/lib/auth';

type Props = {
  profile: ProfileWithUnit;
};

export function UserChip({ profile }: Props) {
  const displayName = profile.full_name?.trim() || null;
  const roleLabel = labels.roles[profile.role] ?? profile.role;
  const unitDisplay =
    profile.unit_ul_code && profile.unit_name
      ? `${profile.unit_ul_code} - ${profile.unit_name}`
      : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
        {(displayName?.[0] ?? '?').toUpperCase()}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="truncate text-sm font-medium">
          {displayName || labels.users.userFallback}
        </span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span>{roleLabel}</span>
          {unitDisplay && (
            <>
              <span aria-hidden>•</span>
              <span className="truncate">{unitDisplay}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
