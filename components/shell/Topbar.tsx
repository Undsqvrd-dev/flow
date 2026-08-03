'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Focus as FocusIcon, Lightbulb } from 'lucide-react';
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
      <div>
        <h1 className="text-[16px] font-bold text-txt">{title}</h1>
        <p className="hidden text-[12px] text-muted sm:block first-letter:uppercase">{todayLabel || '\u00a0'}</p>
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
          Nieuwe taak
        </Button>
      </div>
    </header>
  );
}
