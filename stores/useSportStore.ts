'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SportSession, Task } from '@/lib/types';
import { uid } from '@/lib/utils';
import { weekOf } from '@/lib/dates';
import { useGoalsStore } from './useGoalsStore';
import { syncRemoveSport, syncSport } from '@/lib/db/storeSync';
import { planSportSessionSync, SPORT_RITUAL_NOTE } from '@/lib/sportRitual';

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
  logRitual: (date: string) => void;
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
          updatedAt: new Date().toISOString(),
        };
        set({ sessions: [...prev, session] });
        syncSport([session], prev, () => set({ sessions: prev }));
        bumpLinkedGoal(1);
      },

      logRitual: (date) => {
        const prev = get().sessions;
        if (prev.some((session) => session.date === date && session.note === SPORT_RITUAL_NOTE)) return;
        const session: SportSession = {
          id: uid(),
          date,
          type: 'sport',
          durationMin: 0,
          intensity: 3,
          note: SPORT_RITUAL_NOTE,
          updatedAt: new Date().toISOString(),
        };
        set({ sessions: [...prev, session] });
        syncSport([session], prev, () => set({ sessions: prev }));
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
    {
      name: 'flow-sport',
      version: 1,
      migrate: (persisted) => {
        const state = persisted as Partial<SportState>;
        return {
          ...state,
          sessions: (state.sessions ?? []).map((session) => ({
            ...session,
            updatedAt: session.updatedAt ?? new Date(0).toISOString(),
          })),
        };
      },
    },
  ),
);

/** Afgevinkte sporttaak wordt een sessie; uitvinken haalt die sessie weer weg. */
export function reconcileSportSessions(tasks: readonly Pick<Task, 'ritualKey' | 'done'>[]): void {
  const plan = planSportSessionSync(tasks, useSportStore.getState().sessions);
  const { logRitual, removeSession } = useSportStore.getState();
  for (const date of plan.addDates) logRitual(date);
  for (const id of plan.removeIds) removeSession(id);
}

export function sessionsInWeek(sessions: SportSession[], weekMonday: string = weekOf()): SportSession[] {
  return sessions.filter((s) => weekOf(new Date(`${s.date}T12:00:00`)) === weekMonday);
}

/** Aaneengesloten weken (t/m vorige week of deze week) waarin het target is gehaald. */
export function weekStreak(sessions: SportSession[], target: number, weeks: string[]): number {
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const count = sessionsInWeek(sessions, weeks[i]).length;
    if (count >= target) streak++;
    else if (i === weeks.length - 1) continue;
    else break;
  }
  return streak;
}
