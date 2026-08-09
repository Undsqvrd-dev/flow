'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayKey } from '@/lib/types';

interface UiState {
  quickCaptureOpen: boolean;
  newTaskOpen: boolean;
  newTaskDayKey: DayKey | null;
  openTaskId: string | null;
  /** Tijdelijke weergave: alleen vandaag + gedaan. Niet persistent. */
  focusMode: boolean;
  sidebarCollapsed: boolean;
  weekTrayOpen: boolean;
  /** Mobiel: volledige navigatie-drawer. Niet persistent. */
  mobileNavOpen: boolean;

  setQuickCaptureOpen: (v: boolean) => void;
  setNewTaskOpen: (v: boolean, dayKey?: DayKey | null) => void;
  openTask: (id: string | null) => void;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setWeekTrayOpen: (v: boolean) => void;
  toggleWeekTray: () => void;
  setMobileNavOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      quickCaptureOpen: false,
      newTaskOpen: false,
      newTaskDayKey: null,
      openTaskId: null,
      focusMode: false,
      sidebarCollapsed: false,
      weekTrayOpen: false,
      mobileNavOpen: false,

      setQuickCaptureOpen: (v) => set({ quickCaptureOpen: v }),
      setNewTaskOpen: (v, dayKey) =>
        set((s) => {
          if (!v) return { newTaskOpen: false, newTaskDayKey: null };
          return {
            newTaskOpen: true,
            newTaskDayKey: dayKey !== undefined ? dayKey : s.newTaskDayKey,
          };
        }),
      openTask: (id) => set({ openTaskId: id }),
      setFocusMode: (v) =>
        set((s) => ({
          focusMode: v,
          ...(v ? { weekTrayOpen: false } : {}),
        })),
      toggleFocusMode: () =>
        set((s) => {
          const next = !s.focusMode;
          return {
            focusMode: next,
            ...(next ? { weekTrayOpen: false } : {}),
          };
        }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setWeekTrayOpen: (v) => set({ weekTrayOpen: v }),
      toggleWeekTray: () => set((s) => ({ weekTrayOpen: !s.weekTrayOpen })),
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
    }),
    {
      name: 'flow-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        weekTrayOpen: s.weekTrayOpen,
      }),
    },
  ),
);
