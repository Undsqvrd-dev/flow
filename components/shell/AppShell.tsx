'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { GlobalHotkeys } from './GlobalHotkeys';
import { NewTaskDialog } from './NewTaskDialog';
import { QuickCapture } from './QuickCapture';
import { CardModal } from '@/components/card/CardModal';
import { useBoardStore } from '@/stores/useBoardStore';

/**
 * Client-shell: wacht tot de persistente stores gehydrateerd zijn
 * (localStorage) en draait daarna eenmalig de weekrollover.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useBoardStore.getState().rollover();
    setReady(true);
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
