'use client';

import { useEffect, useState } from 'react';
import { todayISO } from '@/lib/dates';

/** Lokale kalenderdag, ververst om middernacht en als het tabblad weer zichtbaar wordt. */
export function useTodayISO(): string {
  const [today, setToday] = useState(() => todayISO());

  useEffect(() => {
    const refresh = (): void => setToday(todayISO());
    const arm = (): number => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 1, 0);
      return window.setTimeout(() => {
        refresh();
        timer = arm();
      }, Math.max(1000, next.getTime() - now.getTime()));
    };
    let timer = arm();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return today;
}
