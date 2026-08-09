'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);

    async function finish(path: string) {
      router.replace(path);
      router.refresh();
    }

    async function handle() {
      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        await finish(error ? '/login?error=auth' : '/dashboard');
        return;
      }

      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type') as EmailOtpType | null;
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        await finish(error ? '/login?error=auth' : '/dashboard');
        return;
      }

      const hash = window.location.hash.slice(1);
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) {
          await finish('/login?error=auth');
          return;
        }
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        await finish(error ? '/login?error=auth' : '/dashboard');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      await finish(session ? '/dashboard' : '/login?error=auth');
    }

    void handle();
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg">
      <p className="text-sm text-muted">Bezig met inloggen…</p>
    </main>
  );
}
