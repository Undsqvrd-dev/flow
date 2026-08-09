'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const searchParams = useSearchParams();
  const authError = searchParams.get('error') === 'auth';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('loading');
    setMessage(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('sent');
    setMessage('Check je inbox — klik op de link om in te loggen.');
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-txt">FLOW</h1>
        <p className="mt-2 text-sm text-muted">Log in met een magic link</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-panel border border-line bg-surface p-6 shadow-soft-sm"
      >
        <label className="block text-[13px] font-medium text-txt-2" htmlFor="email">
          E-mailadres
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="jij@voorbeeld.nl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading' || status === 'sent'}
          className="mt-2"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="mt-4 w-full"
          disabled={status === 'loading' || status === 'sent'}
        >
          {status === 'loading' ? 'Versturen…' : 'Stuur magic link'}
        </Button>

        {(message || authError) && (
          <p
            className={`mt-4 text-center text-[13px] ${
              status === 'error' || authError ? 'text-red' : 'text-muted'
            }`}
          >
            {authError && status === 'idle'
              ? 'Inloggen mislukt. Vraag een nieuwe link aan.'
              : message}
          </p>
        )}
      </form>
    </div>
  );
}
