'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Focus as FocusIcon, Lightbulb, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { useUiStore } from '@/stores/useUiStore';
import { cn } from '@/lib/utils';
import { longDate } from '@/lib/dates';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/board': 'Weekbord',
  '/focus': 'Timer',
  '/dump': 'Inspiratie',
  '/goals': 'Doelen & waarden',
  '/sport': 'Sport',
  '/analytics': 'Analytics',
  '/settings': 'Instellingen',
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] ?? 'FLOW';
  const focusMode = useUiStore((s) => s.focusMode);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const setNewTaskOpen = useUiStore((s) => s.setNewTaskOpen);
  const setQuickCaptureOpen = useUiStore((s) => s.setQuickCaptureOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const [todayLabel, setTodayLabel] = useState('');

  useEffect(() => {
    setTodayLabel(longDate(new Date()));
  }, []);

  function toggleFocusMode() {
    if (focusMode) {
      setFocusMode(false);
      return;
    }
    setFocusMode(true);
    router.push('/board');
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-green text-white md:hidden cursor-pointer"
          aria-label="Menu openen"
        >
          <Leaf size={17} strokeWidth={2} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[16px] font-bold text-txt max-md:hidden">{title}</h1>
          <p className="hidden text-[16px] font-bold tracking-tight text-txt md:hidden">FLOW</p>
          <p className="hidden text-[12px] text-muted sm:block first-letter:uppercase">
            {todayLabel || '\u00a0'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip content="Inspiratie (⌘I)">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuickCaptureOpen(true)}
            aria-label="Inspiratie"
          >
            <Lightbulb size={17} strokeWidth={1.75} />
          </Button>
        </Tooltip>
        <Tooltip content="Focusmodus aan/uit (⌘F · Esc)">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Focusmodus"
            onClick={toggleFocusMode}
            className={cn(focusMode && 'bg-green-50 text-green')}
          >
            <FocusIcon size={17} strokeWidth={1.75} className={cn(focusMode && 'text-green')} />
          </Button>
        </Tooltip>
        <Button variant="primary" size="md" onClick={() => setNewTaskOpen(true)}>
          <Plus size={16} strokeWidth={2} />
          <span className="hidden sm:inline">Nieuwe taak</span>
        </Button>
      </div>
    </header>
  );
}
