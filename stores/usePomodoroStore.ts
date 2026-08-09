'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PomodoroSession } from '@/lib/types';
import { uid } from '@/lib/utils';
import { syncPomodoro } from '@/lib/db/storeSync';

export type TimerPhase = 'idle' | 'running' | 'paused';
export type TimerMode = 'focus' | 'pauze';

interface PomodoroState {
  phase: TimerPhase;
  mode: TimerMode;
  /** Date-gebaseerd: een refresh doodt de timer niet. */
  endsAt: number | null;        // epoch ms
  remainingMs: number | null;   // alleen gezet bij pauze
  plannedMin: number;
  taskId: string | null;
  batchTaskIds: string[];       // Quick Wins-batch
  roundsCompleted: number;      // voor de pomodoro-dots (0–4)
  startedAtISO: string | null;
  sessions: PomodoroSession[];

  start: (opts: { mode: TimerMode; minutes: number; taskId?: string | null; batchTaskIds?: string[] }) => void;
  pause: () => void;
  resume: () => void;
  /** Stopt de timer; `completed` = het alarm is afgegaan. */
  stop: (completed: boolean) => void;
  setTask: (taskId: string | null) => void;
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      mode: 'focus',
      endsAt: null,
      remainingMs: null,
      plannedMin: 25,
      taskId: null,
      batchTaskIds: [],
      roundsCompleted: 0,
      startedAtISO: null,
      sessions: [],

      start: ({ mode, minutes, taskId = null, batchTaskIds = [] }) =>
        set({
          phase: 'running',
          mode,
          plannedMin: minutes,
          endsAt: Date.now() + minutes * 60_000,
          remainingMs: null,
          taskId,
          batchTaskIds,
          startedAtISO: new Date().toISOString(),
        }),

      pause: () => {
        const { endsAt, phase } = get();
        if (phase !== 'running' || endsAt === null) return;
        set({ phase: 'paused', remainingMs: Math.max(0, endsAt - Date.now()), endsAt: null });
      },

      resume: () => {
        const { remainingMs, phase } = get();
        if (phase !== 'paused' || remainingMs === null) return;
        set({ phase: 'running', endsAt: Date.now() + remainingMs, remainingMs: null });
      },

      stop: (completed) => {
        const s = get();
        if (s.phase === 'idle') return;
        const prevSessions = s.sessions;
        const plannedMs = s.plannedMin * 60_000;
        const leftMs = s.phase === 'paused' ? (s.remainingMs ?? 0) : Math.max(0, (s.endsAt ?? 0) - Date.now());
        const actualMin = Math.round((plannedMs - leftMs) / 60_000);
        const session: PomodoroSession = {
          id: uid(),
          taskId: s.taskId,
          mode: s.mode,
          plannedMin: s.plannedMin,
          actualMin: completed ? s.plannedMin : actualMin,
          startedAt: s.startedAtISO ?? new Date().toISOString(),
          completed,
        };
        const rounds =
          completed && s.mode === 'focus' ? (s.roundsCompleted + 1) % 5 : s.roundsCompleted;
        set({
          phase: 'idle',
          endsAt: null,
          remainingMs: null,
          startedAtISO: null,
          batchTaskIds: [],
          roundsCompleted: rounds,
          sessions: [...prevSessions, session],
        });
        syncPomodoro([session], () => set({ sessions: prevSessions }));
      },

      setTask: (taskId) => set({ taskId }),
    }),
    { name: 'flow-pomodoro' },
  ),
);

/** Resterende ms afgeleid van de klok; component tikt zelf met een interval. */
export function remainingMsOf(s: Pick<PomodoroState, 'phase' | 'endsAt' | 'remainingMs' | 'plannedMin'>): number {
  if (s.phase === 'running' && s.endsAt !== null) return Math.max(0, s.endsAt - Date.now());
  if (s.phase === 'paused' && s.remainingMs !== null) return s.remainingMs;
  return s.plannedMin * 60_000;
}

export function focusMinutesBetween(sessions: PomodoroSession[], fromISO: string, toISO: string): number {
  return sessions
    .filter((x) => x.mode === 'focus' && x.startedAt >= fromISO && x.startedAt < toISO)
    .reduce((sum, x) => sum + x.actualMin, 0);
}
