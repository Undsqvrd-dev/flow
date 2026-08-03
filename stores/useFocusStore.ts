'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Focus } from '@/lib/types';
import { todayISO, weekOf } from '@/lib/dates';
import { uid } from '@/lib/utils';

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

export const useFocusStore = create<FocusState>()(
  persist(
    (set) => ({
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

      setWeekFocus: (patch) =>
        set((s) => ({ focuses: upsert(s.focuses, weekOf(), patch) })),

      setDayFocus: (note) => {
        const trimmed = note.trim();
        if (!trimmed) {
          set((s) => ({
            focuses: upsert(s.focuses, weekOf(), {
              dayFocusTaskId: null,
              dayFocusNote: null,
              dayFocusDate: null,
            }),
          }));
          return;
        }
        set((s) => ({
          focuses: upsert(s.focuses, weekOf(), {
            dayFocusTaskId: null,
            dayFocusNote: trimmed,
            dayFocusDate: todayISO(),
          }),
        }));
      },

      clearDayFocus: () =>
        set((s) => ({
          focuses: upsert(s.focuses, weekOf(), {
            dayFocusTaskId: null,
            dayFocusNote: null,
            dayFocusDate: null,
          }),
        })),
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
