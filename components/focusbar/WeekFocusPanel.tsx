'use client';

import { useEffect, useState } from 'react';
import { useFocusStore, currentFocus } from '@/stores/useFocusStore';

/** Vrij tekstveld voor de weekfocus (zoals dagfocus). */
export function WeekFocusPanel({
  autoFocus = false,
  className,
}: {
  autoFocus?: boolean;
  className?: string;
}) {
  const focuses = useFocusStore((s) => s.focuses);
  const setWeekFocus = useFocusStore((s) => s.setWeekFocus);
  const focus = currentFocus(focuses);
  const saved = focus?.headline?.trim() || null;
  const [draft, setDraft] = useState(saved ?? '');

  useEffect(() => {
    setDraft(saved ?? '');
  }, [saved]);

  function commit() {
    setWeekFocus({ headline: draft.trim() || null });
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
      placeholder="Waar draait deze week om?"
      className={
        className ??
        'h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] font-semibold text-txt outline-none placeholder:font-normal placeholder:text-muted-2/70 focus:border-green'
      }
    />
  );
}
