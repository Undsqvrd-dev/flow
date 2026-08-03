'use client';

import { useEffect, useState } from 'react';
import { useFocusStore, activeDayFocus } from '@/stores/useFocusStore';

/** Vrij tekstveld voor de dagfocus (geen taakkaart). */
export function DayFocusPanel({
  onDone,
  autoFocus = false,
  className,
}: {
  onDone?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const focuses = useFocusStore((s) => s.focuses);
  const setDayFocus = useFocusStore((s) => s.setDayFocus);
  const clearDayFocus = useFocusStore((s) => s.clearDayFocus);
  const saved = activeDayFocus(focuses);
  const [draft, setDraft] = useState(saved ?? '');

  useEffect(() => {
    setDraft(saved ?? '');
  }, [saved]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) setDayFocus(trimmed);
    else clearDayFocus();
    onDone?.();
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      autoFocus={autoFocus}
      placeholder="Wat is vandaag het belangrijkste?"
      className={
        className ??
        'h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] font-semibold text-txt outline-none placeholder:font-normal placeholder:text-muted-2 focus:border-green'
      }
    />
  );
}
