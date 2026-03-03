import Link from 'next/link';
import { labels } from '@sismovbe/labels';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function PermissionDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
      <div className="text-center">
        <ShieldX className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">{labels.messages.permissionDenied}</h1>
        <p className="mt-2 text-muted-foreground">{labels.messages.permissionDeniedHint}</p>
        <Button asChild className="mt-6">
          <Link href="/login">{labels.auth.backToLogin}</Link>
        </Button>
      </div>
    </div>
  );
}
