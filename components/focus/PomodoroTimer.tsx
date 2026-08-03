'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { usePomodoroStore, remainingMsOf } from '@/stores/usePomodoroStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBoardStore } from '@/stores/useBoardStore';
import { useTicker, formatClock } from '@/lib/useTicker';
import { useAlarm } from '@/lib/useAlarm';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '25/5', focus: 25, break: 5 },
  { label: '50/10', focus: 50, break: 10 },
  { label: '15/3', focus: 15, break: 3 },
];

export function PomodoroTimer() {
  const store = usePomodoroStore();
  const settings = useSettingsStore((s) => s.settings);
  const tasks = useBoardStore((s) => s.tasks);
  const { play, notify } = useAlarm();
  const running = store.phase === 'running';
  useTicker(running, 250);

  const [focusMin, setFocusMin] = useState(settings.pomodoroFocusMin);
  const [breakMin, setBreakMin] = useState(settings.pomodoroBreakMin);
  const firedRef = useRef(false);

  const msLeft = remainingMsOf(store);
  const totalMs = store.plannedMin * 60_000;
  const progress = store.phase === 'idle' ? 0 : 1 - msLeft / totalMs;
  const task = store.taskId ? tasks.find((t) => t.id === store.taskId) : undefined;

  // Alarm bij afloop
  useEffect(() => {
    if (running && msLeft <= 0 && !firedRef.current) {
      firedRef.current = true;
      const wasFocus = store.mode === 'focus';
      play(settings.alarmSound);
      notify(
        wasFocus ? 'Focusblok klaar' : 'Pauze voorbij',
        wasFocus ? (task ? `"${task.title}" — tijd voor pauze.` : 'Tijd voor pauze.') : 'Weer aan de slag.',
      );
      store.stop(true);
      // Na 4 focusrondes → lange pauze voorstellen door de teller
      setTimeout(() => { firedRef.current = false; }, 500);
    }
  });

  const longBreakDue = store.roundsCompleted >= settings.pomodoroUntilLongBreak;
  const size = 280;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Grote ring met aftellende tijd */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={store.mode === 'pauze' ? 'var(--green-200)' : 'var(--green)'}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${progress * c} ${c}`}
            style={{ transition: 'stroke-dasharray 500ms cubic-bezier(.2,.8,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[52px] font-bold tabular-nums leading-none tracking-tight text-txt">
            {formatClock(store.phase === 'idle' ? focusMin * 60_000 : msLeft)}
          </span>
          <span className="mt-2 text-[12px] font-semibold uppercase tracking-[.08em] text-muted">
            {store.phase === 'idle' ? 'Klaar om te starten' : store.mode === 'focus' ? 'Focus' : 'Pauze'}
            {store.phase === 'paused' && ' · gepauzeerd'}
          </span>
        </div>
      </div>

      {/* Pomodoro-dots */}
      <div className="flex gap-2">
        {Array.from({ length: settings.pomodoroUntilLongBreak }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-2.5 w-2.5 rounded-pill transition-colors duration-150',
              i < store.roundsCompleted ? 'bg-green' : 'bg-surface-3 border border-line',
            )}
          />
        ))}
      </div>

      {store.phase === 'idle' ? (
        <>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setFocusMin(p.focus); setBreakMin(p.break); }}
                className={cn(
                  'rounded-pill border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150 cursor-pointer',
                  focusMin === p.focus && breakMin === p.break
                    ? 'border-green bg-green-50 text-green'
                    : 'border-line text-txt-2 hover:border-line-2',
                )}
              >
                {p.label}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={180}
              value={focusMin}
              onChange={(e) => setFocusMin(Math.max(1, Number(e.target.value)))}
              className="h-8 w-16 rounded-pill border border-line bg-surface-2 px-3 text-center text-[12.5px] tabular-nums text-txt outline-none focus:border-green"
              aria-label="Vrij aantal minuten"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => store.start({ mode: 'focus', minutes: focusMin, taskId: store.taskId })}
              className="inline-flex items-center gap-2 rounded-pill bg-green px-7 py-3 text-[14px] font-semibold text-white shadow-soft transition-all duration-150 hover:brightness-105 cursor-pointer"
            >
              <Play size={16} strokeWidth={2} /> Start focus
            </button>
            <button
              type="button"
              onClick={() =>
                store.start({
                  mode: 'pauze',
                  minutes: longBreakDue ? settings.pomodoroLongBreakMin : breakMin,
                })
              }
              className="inline-flex items-center gap-2 rounded-pill border border-line-2 px-6 py-3 text-[14px] font-medium text-txt-2 hover:bg-surface-2 cursor-pointer"
            >
              {longBreakDue ? `Lange pauze · ${settings.pomodoroLongBreakMin} min` : `Pauze · ${breakMin} min`}
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (running ? store.pause() : store.resume())}
            className="inline-flex items-center gap-2 rounded-pill bg-green px-7 py-3 text-[14px] font-semibold text-white shadow-soft hover:brightness-105 cursor-pointer"
          >
            {running ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} />}
            {running ? 'Pauzeer' : 'Verder'}
          </button>
          <button
            type="button"
            onClick={() => store.stop(false)}
            className="inline-flex items-center gap-2 rounded-pill border border-line-2 px-6 py-3 text-[14px] font-medium text-txt-2 hover:bg-surface-2 cursor-pointer"
          >
            <Square size={15} strokeWidth={2} /> Stop
          </button>
        </div>
      )}
    </div>
  );
}
