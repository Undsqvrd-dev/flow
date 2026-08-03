'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GoalScope, Idea } from '@/lib/types';
import { uid } from '@/lib/utils';
import { useBoardStore } from './useBoardStore';

interface IdeasState {
  ideas: Idea[];
  lastScope: GoalScope;

  addIdea: (body: string, scope?: GoalScope) => void;
  setScope: (scope: GoalScope) => void;
  moveToWaiting: (id: string) => void;
  moveToDump: (id: string) => void;
  removeIdea: (id: string) => void;
  /** Zet een idee om naar een taak in 'algemeen'; idee krijgt status 'omgezet'. */
  convertToTask: (id: string) => void;
}

export const useIdeasStore = create<IdeasState>()(
  persist(
    (set, get) => ({
      ideas: [],
      lastScope: 'zakelijk',

      addIdea: (body, scope) =>
        set((s) => ({
          ideas: [
            {
              id: uid(),
              body,
              scope: scope ?? s.lastScope,
              status: 'dumpbak',
              taskId: null,
              createdAt: new Date().toISOString(),
            },
            ...s.ideas,
          ],
          lastScope: scope ?? s.lastScope,
        })),

      setScope: (scope) => set({ lastScope: scope }),

      moveToWaiting: (id) =>
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, status: 'wachtruimte' } : i)),
        })),

      moveToDump: (id) =>
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, status: 'dumpbak' } : i)),
        })),

      removeIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),

      convertToTask: (id) => {
        const idea = get().ideas.find((i) => i.id === id);
        if (!idea) return;
        const task = useBoardStore.getState().addTask({ title: idea.body, dayKey: 'algemeen' });
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id ? { ...i, status: 'omgezet', taskId: task.id } : i,
          ),
        }));
      },
    }),
    { name: 'flow-ideas' },
  ),
);
