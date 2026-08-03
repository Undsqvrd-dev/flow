'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Play, UnfoldVertical, ChevronDown } from 'lucide-react';
import type { DayKey, Task } from '@/lib/types';
import { useBoardStore } from '@/stores/useBoardStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { cn } from '@/lib/utils';

/**
 * Compacte batchkaart bovenaan de dagkolom: alle korte taken van die dag.
 * Nieuwe taken ≤ drempel sluiten automatisch aan zolang de bundel actief is.
 */
export function QuickWinsCard({
  tasks,
  dayKey,
  weekOf: columnWeekOf,
}: {
  tasks: Task[];
  dayKey: DayKey;
  weekOf?: string;
}) {
  const router = useRouter();
  const toggleDone = useBoardStore((s) => s.toggleDone);
  const disableBundle = useBoardStore((s) => s.disableQuickWinBundle);
  const start = usePomodoroStore((s) => s.start);
  const [open, setOpen] = useState(false);

  const totalMin = tasks.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0);
  const batchMin = Math.max(5, Math.ceil(totalMin / 5) * 5);

  function startBatch() {
    start({ mode: 'focus', minutes: batchMin, batchTaskIds: tasks.map((t) => t.id) });
    router.push('/focus');
  }

  return (
    <div className="rounded-card border border-green-200 bg-green-50 shadow-soft-sm dark:border-green-700/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left cursor-pointer"
      >
        <Zap size={13} strokeWidth={2} className="shrink-0 text-green" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-txt">
          QuickWin&apos;s
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted">
          {tasks.length} · {totalMin}m
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn('shrink-0 text-muted transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-green-200/70 px-3 pb-3 pt-2 dark:border-green-700/40">
          <ul className="mb-2.5 flex flex-col gap-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleDone(t.id)}
                  className="h-3.5 w-3.5 cursor-pointer accent-(--green)"
                />
                <span className={cn('flex-1 truncate text-[12.5px] text-txt-2', t.done && 'text-muted line-through')}>
                  {t.title}
                </span>
                <span className="text-[10px] tabular-nums text-muted-2">{t.estimateMin}m</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={startBatch}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-pill bg-green py-1.5 text-[12px] font-semibold text-white transition-colors duration-150 hover:brightness-105 cursor-pointer"
            >
              <Play size={12} strokeWidth={2} /> Batch starten · {batchMin} min
            </button>
            <button
              type="button"
              onClick={() => disableBundle(dayKey, columnWeekOf)}
              className="inline-flex w-full items-center justify-center gap-1 rounded-pill py-1 text-[11px] font-medium text-green-700 hover:bg-green-100/80 dark:text-green cursor-pointer"
            >
              <UnfoldVertical size={12} strokeWidth={2} /> Weer als aparte kaarten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Actie om ≥2 korte taken van deze dag te bundelen. */
export function QuickWinsBundlePrompt({
  count,
  dayKey,
  weekOf: columnWeekOf,
}: {
  count: number;
  dayKey: DayKey;
  weekOf?: string;
}) {
  const enableBundle = useBoardStore((s) => s.enableQuickWinBundle);

  return (
    <button
      type="button"
      onClick={() => enableBundle(dayKey, columnWeekOf)}
      className="flex w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-green-300 bg-green-50/60 px-2 py-2 text-[11.5px] font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-700/50 dark:text-green cursor-pointer"
    >
      <Zap size={12} strokeWidth={2} />
      Bundel {count} korte taken als QuickWin&apos;s
    </button>
  );
}
