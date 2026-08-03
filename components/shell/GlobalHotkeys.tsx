'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUiStore } from '@/stores/useUiStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function isModKey(e: KeyboardEvent, code: string): boolean {
  return (e.metaKey || e.ctrlKey) && !e.altKey && e.code === code;
}

function exitFocusMode() {
  useUiStore.getState().setFocusMode(false);
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function enterFocusMode(router: { push: (href: string) => void }) {
  useUiStore.getState().setFocusMode(true);
  router.push('/board');
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function GlobalHotkeys() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return;

      const mod = e.metaKey || e.ctrlKey;
      const ui = useUiStore.getState();

      // ⌘I / ⌘D — inspiratie snel vastleggen
      if (isModKey(e, 'KeyI') || isModKey(e, 'KeyD')) {
        e.preventDefault();
        e.stopPropagation();
        ui.setQuickCaptureOpen(true);
        return;
      }

      // ⌘F — focusmodus aan óf uit (expliciet, geen toggle-race)
      if (isModKey(e, 'KeyF')) {
        e.preventDefault();
        e.stopPropagation();
        if (ui.focusMode) exitFocusMode();
        else enterFocusMode(router);
        return;
      }

      // ⌘K — nieuwe taak op vandaag · dagdeel dag
      if (isModKey(e, 'KeyK')) {
        e.preventDefault();
        e.stopPropagation();
        ui.setNewTaskOpen(true);
        return;
      }

      // Esc — in focusmodus terug naar weekoverzicht
      if (e.code === 'Escape' || e.key === 'Escape') {
        if (!ui.focusMode) return;
        if (ui.quickCaptureOpen || ui.newTaskOpen || ui.openTaskId) return;
        e.preventDefault();
        e.stopPropagation();
        exitFocusMode();
        return;
      }

      if (isTyping(e.target) || mod) return;

      const key = e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        const ui = useUiStore.getState();
        if (ui.focusMode) exitFocusMode();
        else enterFocusMode(router);
      } else if (key === 'n') {
        e.preventDefault();
        ui.setNewTaskOpen(true);
      } else if (key === 'p') {
        e.preventDefault();
        const p = usePomodoroStore.getState();
        if (p.phase === 'running') p.pause();
        else if (p.phase === 'paused') p.resume();
        else {
          const min = useSettingsStore.getState().settings.pomodoroFocusMin;
          p.start({ mode: 'focus', minutes: min });
          router.push('/focus');
        }
      } else if (/^[1-7]$/.test(key)) {
        const el = document.querySelector<HTMLElement>(`[data-column-index="${key}"]`);
        el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    }

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [router]);

  return null;
}
