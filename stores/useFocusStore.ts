'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Focus } from '@/lib/types';
import { todayISO, weekOf } from '@/lib/dates';
import { uid } from '@/lib/utils';
import { syncFocuses } from '@/lib/db/storeSync';

interface FocusState {
  focuses: Focus[];

  /* UI-staat van de focusbalk en lenzen */
  barExpanded: boolean;
  lensFocusGoal: boolean;   // andere kaarten dimmen
  lensToday: boolean;       // andere dagkolommen verbergen
  lensHideDone: boolean;    // afgeronde kaarten verbergen
  lastVisitDate: string | null; // voor het ochtendritueel

  setBarExpanded: (v: boolean) => void;
  toggleBar: () => void;
  setLens: (lens: 'focusGoal' | 'today' | 'hideDone', v: boolean) => void;
  markVisitedToday: () => void;

  setWeekFocus: (patch: { goalId?: string | null; headline?: string | null }) => void;
  /** Dagfocus is vrije tekst — geen taakkaart. */
  setDayFocus: (note: string) => void;
  clearDayFocus: () => void;
}

function emptyFocus(week: string): Focus {
  return {
    id: uid(),
    weekOf: week,
    goalId: null,
    headline: null,
    dayFocusTaskId: null,
    dayFocusNote: null,
    dayFocusDate: null,
    updatedAt: new Date().toISOString(),
  };
}

function upsert(focuses: Focus[], week: string, patch: Partial<Focus>): Focus[] {
  const existing = focuses.find((f) => f.weekOf === week);
  const base = existing ?? emptyFocus(week);
  const updated: Focus = { ...base, ...patch, updatedAt: new Date().toISOString() };
  return [...focuses.filter((f) => f.weekOf !== week), updated];
}

function syncWeek(prev: Focus[], next: Focus[]): void {
  const week = weekOf();
  const updated = next.find((f) => f.weekOf === week);
  if (updated) syncFocuses([updated], () => useFocusStore.setState({ focuses: prev }));
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      focuses: [],
      barExpanded: false,
      lensFocusGoal: false,
      lensToday: false,
      lensHideDone: false,
      lastVisitDate: null,

      setBarExpanded: (v) => set({ barExpanded: v }),
      toggleBar: () => set((s) => ({ barExpanded: !s.barExpanded })),
      setLens: (lens, v) =>
        set(
          lens === 'focusGoal'
            ? { lensFocusGoal: v }
            : lens === 'today'
              ? { lensToday: v }
              : { lensHideDone: v },
        ),
      markVisitedToday: () => set({ lastVisitDate: todayISO() }),

      setWeekFocus: (patch) => {
        const prev = get().focuses;
        const next = upsert(prev, weekOf(), patch);
        set({ focuses: next });
        syncWeek(prev, next);
      },

      setDayFocus: (note) => {
        const trimmed = note.trim();
        const prev = get().focuses;
        const next = trimmed
          ? upsert(prev, weekOf(), {
              dayFocusTaskId: null,
              dayFocusNote: trimmed,
              dayFocusDate: todayISO(),
            })
          : upsert(prev, weekOf(), {
              dayFocusTaskId: null,
              dayFocusNote: null,
              dayFocusDate: null,
            });
        set({ focuses: next });
        syncWeek(prev, next);
      },

      clearDayFocus: () => {
        const prev = get().focuses;
        const next = upsert(prev, weekOf(), {
          dayFocusTaskId: null,
          dayFocusNote: null,
          dayFocusDate: null,
        });
        set({ focuses: next });
        syncWeek(prev, next);
      },
    }),
    { name: 'flow-focus' },
  ),
);

export function currentFocus(focuses: Focus[]): Focus | undefined {
  return focuses.find((f) => f.weekOf === weekOf());
}

/** Dagfocus-tekst voor vandaag, of null. */
export function activeDayFocus(focuses: Focus[]): string | null {
  const f = currentFocus(focuses);
  if (!f || f.dayFocusDate !== todayISO()) return null;
  const note = f.dayFocusNote?.trim();
  return note || null;
}
