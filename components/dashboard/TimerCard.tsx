'use client';

import Link from 'next/link';
import { Pause, Play, Square, Timer } from 'lucide-react';
import { usePomodoroStore, remainingMsOf, focusMinutesBetween } from '@/stores/usePomodoroStore';
import { useTicker, formatClock } from '@/lib/useTicker';
import { todayISO } from '@/lib/dates';
import { formatMinutes } from '@/lib/utils';

/** Compacte timer rechtsboven op het dashboard. */
export function TimerCard() {
  const store = usePomodoroStore();
  const running = store.phase === 'running';
  useTicker(running);

  const msLeft = remainingMsOf(store);
  const todayStart = `${todayISO()}T00:00:00`;
  const todayEnd = `${todayISO()}T23:59:59`;
  const focusedToday = focusMinutesBetween(store.sessions, todayStart, todayEnd);

  return (
    <div className="flex h-full min-h-[120px] flex-col justify-between rounded-panel bg-green-900 p-4 text-white shadow-soft sm:p-5">
      <p className="panel-label inline-flex items-center gap-1.5 !mb-0 !text-green-200 dark:!text-green-400">
        <Timer size={13} strokeWidth={2} /> Timer
      </p>

      {store.phase !== 'idle' ? (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[32px] font-bold tabular-nums leading-none tracking-tight">
              {formatClock(msLeft)}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[.06em] text-green-200 dark:text-green-400">
              {store.mode === 'focus' ? 'Focus' : 'Pauze'}
              {store.phase === 'paused' && ' · gepauzeerd'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (running ? store.pause() : store.resume())}
              className="inline-flex items-center gap-1.5 rounded-pill bg-green px-3 py-2 text-[12px] font-semibold hover:brightness-110 cursor-pointer"
            >
              {running ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
              {running ? 'Pauze' : 'Verder'}
            </button>
            <button
              type="button"
              onClick={() => store.stop(false)}
              className="inline-flex items-center justify-center rounded-pill border border-white/25 px-3 py-2 hover:bg-white/10 cursor-pointer"
              aria-label="Stop"
            >
              <Square size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[22px] font-bold leading-tight tracking-tight">
              {focusedToday > 0 ? formatMinutes(focusedToday) : 'Start focus'}
            </p>
            <p className="mt-1 text-[12px] text-green-200 dark:text-green-400">
              {focusedToday > 0 ? 'gefocust vandaag' : 'pomodoro-sessie'}
            </p>
          </div>
          <Link
            href="/focus"
            className="inline-flex items-center gap-1.5 rounded-pill border border-white/25 px-3 py-2 text-[12px] font-medium hover:bg-white/10"
          >
            <Play size={14} strokeWidth={2} /> Start
          </Link>
        </div>
      )}
    </div>
  );
}
