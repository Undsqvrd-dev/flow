'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

/** Invoerveld voor de quote die ook op het dashboard staat (`settings.mantra`). */
export function QuotePanel({
  autoFocus = false,
  className,
}: {
  autoFocus?: boolean;
  className?: string;
}) {
  const saved = useSettingsStore((s) => s.settings.mantra);
  const update = useSettingsStore((s) => s.update);
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  function commit() {
    const next = draft.trim();
    if (next !== saved) update({ mantra: next });
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
      placeholder="Jouw quote…"
      aria-label="Quote"
      className={
        className ??
        'h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] font-normal text-txt outline-none placeholder:text-muted-2/70 focus:border-green'
      }
    />
  );
}
