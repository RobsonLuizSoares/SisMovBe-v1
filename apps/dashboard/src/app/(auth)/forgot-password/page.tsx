'use client';

import { useState } from 'react';
import Link from 'next/link';
import { labels } from '@sismovbe/labels';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/login`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{labels.auth.forgotPassword}</h1>
            <p className="mt-4 text-muted-foreground">{labels.messages.checkEmailForReset}</p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">{labels.auth.backToLogin}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{labels.auth.forgotPassword}</h1>
          <p className="mt-1 text-muted-foreground">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{labels.auth.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.unicamp.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : labels.auth.sendResetLink}
          </Button>
        </form>

        <p className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            {labels.auth.backToLogin}
          </Link>
        </p>
      </div>
    </div>
  );
}
