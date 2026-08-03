'use client';

import Link from 'next/link';
import { Pause, Play, Square, Timer } from 'lucide-react';
import { usePomodoroStore, remainingMsOf, focusMinutesBetween } from '@/stores/usePomodoroStore';
import { useTicker, formatClock } from '@/lib/useTicker';
import { todayISO } from '@/lib/dates';
import { formatMinutes } from '@/lib/utils';

/** Donkergroene timerkaart — groter, prominenter op het dashboard. */
export function TimerCard() {
  const store = usePomodoroStore();
  const running = store.phase === 'running';
  useTicker(running);

  const msLeft = remainingMsOf(store);
  const todayStart = `${todayISO()}T00:00:00`;
  const todayEnd = `${todayISO()}T23:59:59`;
  const focusedToday = focusMinutesBetween(store.sessions, todayStart, todayEnd);

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-panel bg-green-900 p-6 text-white shadow-soft">
      <p className="panel-label inline-flex items-center gap-1.5 !text-green-200 dark:!text-green-400">
        <Timer size={13} strokeWidth={2} /> Timer
      </p>
      {store.phase !== 'idle' ? (
        <>
          <p className="mt-6 text-[48px] font-bold tabular-nums leading-none tracking-tight">
            {formatClock(msLeft)}
          </p>
          <p className="mt-2 text-[12px] uppercase tracking-[.06em] text-green-200 dark:text-green-400">
            {store.mode === 'focus' ? 'Focus' : 'Pauze'}{store.phase === 'paused' && ' · gepauzeerd'}
          </p>
          <div className="mt-auto flex gap-2 pt-6">
            <button
              type="button"
              onClick={() => (running ? store.pause() : store.resume())}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-green py-3 text-[13px] font-semibold hover:brightness-110 cursor-pointer"
            >
              {running ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
              {running ? 'Pauze' : 'Verder'}
            </button>
            <button
              type="button"
              onClick={() => store.stop(false)}
              className="flex items-center justify-center rounded-pill border border-white/25 px-4 hover:bg-white/10 cursor-pointer"
              aria-label="Stop"
            >
              <Square size={15} strokeWidth={2} />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-6 text-[36px] font-bold leading-tight tracking-tight">
            {focusedToday > 0 ? formatMinutes(focusedToday) : 'Nog geen focus'}
          </p>
          <p className="mt-2 text-[13px] text-green-200 dark:text-green-400">
            {focusedToday > 0 ? 'gefocust vandaag' : 'vandaag'}
          </p>
          <Link
            href="/focus"
            className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-pill border border-white/25 py-3 text-[13px] font-medium hover:bg-white/10"
          >
            <Play size={14} strokeWidth={2} /> Start pomodoro
          </Link>
        </>
      )}
    </div>
  );
}
