'use client';

import Link from 'next/link';
import { Pause, Play, Square } from 'lucide-react';
import { usePomodoroStore, remainingMsOf } from '@/stores/usePomodoroStore';
import { useBoardStore } from '@/stores/useBoardStore';
import { useTicker, formatClock } from '@/lib/useTicker';

/** Compacte timerbalk bovenaan het weekbord — alleen zichtbaar als er een sessie loopt. */
export function ActiveTimerStrip() {
  const store = usePomodoroStore();
  const tasks = useBoardStore((s) => s.tasks);
  const active = store.phase !== 'idle';
  useTicker(active && store.phase === 'running', 250);

  if (!active) return null;

  const msLeft = remainingMsOf(store);
  const task = store.taskId ? tasks.find((t) => t.id === store.taskId) : undefined;
  const running = store.phase === 'running';

  return (
    <div className="flex items-center gap-3 border-t border-green-700/30 bg-green-900 px-4 py-2 text-white md:px-6">
      <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-green-200">
        {store.mode === 'focus' ? 'Focus' : 'Pauze'}
        {store.phase === 'paused' && ' · gepauzeerd'}
      </span>
      <span className="text-[18px] font-bold tabular-nums tracking-tight">{formatClock(msLeft)}</span>
      {task && <span className="min-w-0 flex-1 truncate text-[13px] text-green-200">{task.title}</span>}
      {!task && store.batchTaskIds.length > 0 && (
        <span className="min-w-0 flex-1 truncate text-[13px] text-green-200">Quick wins-batch</span>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => (running ? store.pause() : store.resume())}
          className="inline-flex items-center gap-1 rounded-pill bg-green px-3 py-1.5 text-[12px] font-semibold hover:brightness-110 cursor-pointer"
        >
          {running ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}
          {running ? 'Pauze' : 'Verder'}
        </button>
        <button
          type="button"
          onClick={() => store.stop(false)}
          className="rounded-pill border border-white/25 p-1.5 hover:bg-white/10 cursor-pointer"
          aria-label="Stop"
        >
          <Square size={12} strokeWidth={2} />
        </button>
        <Link href="/focus" className="rounded-pill border border-white/25 px-2.5 py-1.5 text-[11px] font-medium hover:bg-white/10">
          Open
        </Link>
      </div>
    </div>
  );
}
