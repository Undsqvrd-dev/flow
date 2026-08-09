'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SportSession } from '@/lib/types';
import { uid } from '@/lib/utils';
import { weekOf } from '@/lib/dates';
import { useGoalsStore } from './useGoalsStore';
import { syncRemoveSport, syncSport } from '@/lib/db/storeSync';

export interface NewSportSession {
  date: string;
  type: string;
  durationMin: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  note?: string | null;
}

interface SportState {
  sessions: SportSession[];
  logSession: (input: NewSportSession) => void;
  removeSession: (id: string) => void;
}

/** Privédoel met unit 'sessies' telt automatisch mee. */
function bumpLinkedGoal(delta: number) {
  const { goals, incrementGoal } = useGoalsStore.getState();
  const linked = goals.find((g) => g.active && g.scope === 'prive' && g.unit === 'sessies');
  if (linked) incrementGoal(linked.id, delta);
}

export const useSportStore = create<SportState>()(
  persist(
    (set, get) => ({
      sessions: [],

      logSession: (input) => {
        const prev = get().sessions;
        const session: SportSession = {
          id: uid(),
          date: input.date,
          type: input.type,
          durationMin: input.durationMin,
          intensity: input.intensity,
          note: input.note ?? null,
        };
        set({ sessions: [...prev, session] });
        syncSport([session], () => set({ sessions: prev }));
        bumpLinkedGoal(1);
      },

      removeSession: (id) => {
        const prev = get().sessions;
        const existed = prev.some((s) => s.id === id);
        set({ sessions: prev.filter((x) => x.id !== id) });
        syncRemoveSport(id, () => set({ sessions: prev }));
        if (existed) bumpLinkedGoal(-1);
      },
    }),
    { name: 'flow-sport' },
  ),
);

export function sessionsInWeek(sessions: SportSession[], weekMonday: string = weekOf()): SportSession[] {
  return sessions.filter((s) => weekOf(new Date(`${s.date}T12:00:00`)) === weekMonday);
}

/** Aaneengesloten weken (t/m vorige week of deze week) waarin het target is gehaald. */
export function weekStreak(sessions: SportSession[], target: number, weeks: string[]): number {
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const count = sessionsInWeek(sessions, weeks[i]).length;
    if (count >= target) streak++;
    else if (i === weeks.length - 1) continue; // huidige week mag nog onvolledig zijn
    else break;
  }
  return streak;
}
