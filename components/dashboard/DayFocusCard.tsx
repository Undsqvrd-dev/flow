'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, Play } from 'lucide-react';
import { useFocusStore, activeDayFocus } from '@/stores/useFocusStore';
import { useUiStore } from '@/stores/useUiStore';

/** Donkergroene dagfocuskaart — vrije tekst + start focusmodus. */
export function DayFocusCard() {
  const router = useRouter();
  const focuses = useFocusStore((s) => s.focuses);
  const setDayFocus = useFocusStore((s) => s.setDayFocus);
  const clearDayFocus = useFocusStore((s) => s.clearDayFocus);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const saved = activeDayFocus(focuses);
  const [draft, setDraft] = useState(saved ?? '');

  useEffect(() => {
    setDraft(saved ?? '');
  }, [saved]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) setDayFocus(trimmed);
    else clearDayFocus();
  }

  return (
    <div className="flex h-full flex-col rounded-panel bg-green-900 p-5 text-white shadow-soft">
      <p className="panel-label inline-flex items-center gap-1.5 !text-green-200 dark:!text-green-400">
        <Crosshair size={12} strokeWidth={2} /> Dagfocus
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={3}
        placeholder="Wat is vandaag het belangrijkste?"
        className="mt-3 w-full resize-none bg-transparent text-[16px] font-semibold leading-snug text-white outline-none placeholder:font-normal placeholder:text-white/50"
      />
      <button
        type="button"
        onClick={() => {
          commit();
          setFocusMode(true);
          router.push('/board');
        }}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-pill bg-green py-2.5 text-[13px] font-semibold text-white transition-all duration-150 hover:brightness-110 cursor-pointer"
      >
        <Play size={15} strokeWidth={2} /> Start focus
      </button>
    </div>
  );
}
