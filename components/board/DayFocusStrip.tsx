'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Crosshair } from 'lucide-react';
import { useFocusStore, activeDayFocus } from '@/stores/useFocusStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { cn } from '@/lib/utils';

/**
 * Compacte dagfocus in een dagkolom — vrije tekst.
 * (Niet meer gebruikt op het bord; focusmodus heeft een inline veld.)
 */
export function DayFocusStrip() {
  const focuses = useFocusStore((s) => s.focuses);
  const setDayFocus = useFocusStore((s) => s.setDayFocus);
  const clearDayFocus = useFocusStore((s) => s.clearDayFocus);
  const lastVisit = useFocusStore((s) => s.lastVisitDate);
  const markVisited = useFocusStore((s) => s.markVisitedToday);
  const askOnOpen = useSettingsStore((s) => s.settings.askDayFocusOnOpen);
  const saved = activeDayFocus(focuses);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(saved ?? '');

  useEffect(() => {
    if (!lastVisit || lastVisit !== new Date().toISOString().slice(0, 10)) {
      markVisited();
      if (askOnOpen && !saved) setExpanded(true);
    }
  }, [askOnOpen, lastVisit, markVisited, saved]);

  useEffect(() => {
    setDraft(saved ?? '');
  }, [saved]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) setDayFocus(trimmed);
    else clearDayFocus();
    setExpanded(false);
  }

  return (
    <div className="mb-2 overflow-hidden rounded-card bg-green-900 text-white shadow-soft">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left cursor-pointer"
      >
        <Crosshair size={14} strokeWidth={2} className="shrink-0 text-green-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[.06em] text-green-200 dark:text-green-400">Dagfocus</span>
          <span className="block truncate text-[13px] font-semibold">
            {saved ?? 'Wat is vandaag het belangrijkste?'}
          </span>
        </span>
        <ChevronDown size={15} strokeWidth={2} className={cn('shrink-0 text-green-200 transition-transform duration-150 dark:text-green-400', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="border-t border-white/10 px-3 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            placeholder="Typ je dagfocus…"
            className="h-9 w-full rounded-[10px] border border-white/15 bg-white/10 px-3 text-[13px] text-white outline-none placeholder:text-white/45 focus:border-white/40"
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={commit}
              className="inline-flex items-center gap-1 rounded-pill bg-green px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 cursor-pointer"
            >
              Opslaan
            </button>
            {saved && (
              <button
                type="button"
                onClick={() => { clearDayFocus(); setDraft(''); setExpanded(false); }}
                className="text-[12px] text-green-200 hover:text-white cursor-pointer"
              >
                Wissen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
