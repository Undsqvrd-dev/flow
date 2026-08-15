'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileMenu } from './MobileMenu';
import { GlobalHotkeys } from './GlobalHotkeys';
import { NewTaskDialog } from './NewTaskDialog';
import { QuickCapture } from './QuickCapture';
import { CardModal } from '@/components/card/CardModal';
import { bootstrapData, forcePushLocalToRemote } from '@/lib/db/bootstrap';
import { syncEnabled } from '@/lib/db/enabled';
import { useBoardStore } from '@/stores/useBoardStore';

/**
 * Client-shell: wacht tot stores + Supabase-bootstrap klaar zijn,
 * daarna weekrollover.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [syncOk, setSyncOk] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await bootstrapData();
      if (cancelled) return;
      useBoardStore.getState().rollover();
      setSyncOk(syncEnabled());
      setReady(true);
      (
        window as unknown as { __flowForcePush?: typeof forcePushLocalToRemote }
      ).__flowForcePush = forcePushLocalToRemote;
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
        {ready && !syncOk && (
          <div className="border-b border-amber/30 bg-amber/10 px-4 py-2 text-[12px] text-txt-2">
            Cloud-sync is niet actief — wijzigingen blijven voorlopig alleen op dit apparaat.
            Vernieuw de pagina of check je login.
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto">
          {ready ? children : null}
        </main>
      </div>
      <MobileMenu />
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
