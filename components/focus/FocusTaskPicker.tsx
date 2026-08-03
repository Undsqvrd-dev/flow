'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useBoardStore, openTasksForDate } from '@/stores/useBoardStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { sortByQuadrant } from '@/lib/priority';
import { todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** Kies de taak voor deze sessie. */
export function FocusTaskPicker() {
  const tasks = useBoardStore((s) => s.tasks);
  const taskId = usePomodoroStore((s) => s.taskId);
  const setTask = usePomodoroStore((s) => s.setTask);
  const phase = usePomodoroStore((s) => s.phase);
  const [open, setOpen] = useState(false);

  const current = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const candidates = sortByQuadrant(openTasksForDate(tasks, todayISO()));
  const disabled = phase !== 'idle';

  return (
    <div className="relative w-full max-w-sm">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-card border border-line bg-surface px-3.5 py-2.5 text-left',
          'transition-colors duration-150 hover:border-line-2 disabled:opacity-60 cursor-pointer disabled:cursor-default',
        )}
      >
        <span className="min-w-0">
          <span className="panel-label block">Gekoppelde taak</span>
          <span className="block truncate text-[13.5px] font-medium text-txt">
            {current?.title ?? 'Geen taak — vrije sessie'}
          </span>
        </span>
        {!disabled && <ChevronDown size={15} strokeWidth={1.75} className="shrink-0 text-muted" />}
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-soft-lg">
          <button
            type="button"
            onClick={() => { setTask(null); setOpen(false); }}
            className="w-full rounded-[8px] px-2.5 py-1.5 text-left text-[13px] text-muted hover:bg-surface-2 cursor-pointer"
          >
            Geen taak — vrije sessie
          </button>
          {candidates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTask(t.id); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] text-txt-2 hover:bg-surface-2 cursor-pointer"
            >
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Checklist van de gekoppelde taak (of de batch), direct afvinkbaar. */
export function LinkedTaskChecklist() {
  const tasks = useBoardStore((s) => s.tasks);
  const updateTask = useBoardStore((s) => s.updateTask);
  const toggleDone = useBoardStore((s) => s.toggleDone);
  const taskId = usePomodoroStore((s) => s.taskId);
  const batchIds = usePomodoroStore((s) => s.batchTaskIds);

  if (batchIds.length > 0) {
    const batch = tasks.filter((t) => batchIds.includes(t.id));
    return (
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-3.5">
        <p className="panel-label mb-2">Quick wins-batch</p>
        <ul className="flex flex-col gap-1">
          {batch.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} className="h-4 w-4 cursor-pointer accent-(--green)" />
              <span className={cn('flex-1 truncate text-[13px] text-txt-2', t.done && 'text-muted line-through')}>{t.title}</span>
              <span className="text-[10px] tabular-nums text-muted-2">{t.estimateMin}m</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  if (!task || task.checklist.length === 0) return null;

  return (
    <div className="w-full max-w-sm rounded-card border border-line bg-surface p-3.5">
      <p className="panel-label mb-2">Checklist</p>
      <ul className="flex flex-col gap-1">
        {[...task.checklist].sort((a, b) => a.rank - b.rank).map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() =>
                updateTask(task.id, {
                  checklist: task.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)),
                })
              }
              className="h-4 w-4 cursor-pointer accent-(--green)"
            />
            <span className={cn('text-[13px] text-txt-2', item.done && 'text-muted line-through')}>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
