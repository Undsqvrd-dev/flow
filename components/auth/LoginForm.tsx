'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

const supabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error') === 'auth';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) return;

    setStatus('loading');
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (error) {
        setStatus('error');
        setMessage(
          error.message === 'Invalid login credentials'
            ? 'Onjuist e-mailadres of wachtwoord.'
            : error.message,
        );
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Inloggen mislukt.');
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-txt">FLOW</h1>
        <p className="mt-2 text-sm text-muted">Log in met e-mail en wachtwoord</p>
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
          disabled={!supabaseConfigured || status === 'loading'}
          className="mt-2"
          required
        />

        <label className="mt-4 block text-[13px] font-medium text-txt-2" htmlFor="password">
          Wachtwoord
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!supabaseConfigured || status === 'loading'}
          className="mt-2"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="mt-4 w-full"
          disabled={!supabaseConfigured || status === 'loading'}
        >
          {status === 'loading' ? 'Bezig…' : 'Inloggen'}
        </Button>

        {!supabaseConfigured && (
          <p className="mt-4 text-center text-[13px] text-red">
            Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en
            NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel en redeploy.
          </p>
        )}

        {(message || authError) && (
          <p
            className={`mt-4 text-center text-[13px] ${
              status === 'error' || authError ? 'text-red' : 'text-muted'
            }`}
          >
            {authError && status === 'idle' ? 'Inloggen mislukt. Probeer opnieuw.' : message}
          </p>
        )}
      </form>
    </div>
  );
}
