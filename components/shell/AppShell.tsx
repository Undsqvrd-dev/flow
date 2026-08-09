'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { GlobalHotkeys } from './GlobalHotkeys';
import { NewTaskDialog } from './NewTaskDialog';
import { QuickCapture } from './QuickCapture';
import { CardModal } from '@/components/card/CardModal';
import { bootstrapData } from '@/lib/db/bootstrap';
import { useBoardStore } from '@/stores/useBoardStore';

/**
 * Client-shell: wacht tot stores + Supabase-bootstrap klaar zijn,
 * daarna weekrollover.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await bootstrapData();
      if (cancelled) return;
      useBoardStore.getState().rollover();
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">
          {ready ? children : null}
        </main>
      </div>
      <MobileNav />
      {ready && (
        <>
          <GlobalHotkeys />
          <NewTaskDialog />
          <QuickCapture />
          <CardModal />
        </>
      )}
    </div>
  );
}
