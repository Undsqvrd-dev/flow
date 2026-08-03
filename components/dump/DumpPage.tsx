'use client';

import { useRef, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Archive, Inbox, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TaskCard } from '@/components/board/TaskCard';
import { useBoardStore, openTasksFor } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';
import {
  DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { DayKey, Task } from '@/lib/types';
import { weekOf } from '@/lib/dates';
import { cn } from '@/lib/utils';

function DumpColumn({ dayKey, title, hint, tasks }: {
  dayKey: DayKey; title: string; hint: string; tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `sec:${dayKey}:${weekOf()}:none` });

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[15px] font-bold text-txt">{title}</h2>
        <span className="text-[12px] text-muted">{hint}</span>
        <span className="ml-auto rounded-pill bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-col gap-2 rounded-panel border border-line bg-bg/50 p-2.5 dark:bg-surface-2/40',
          isOver && 'hatched outline-2 outline-dashed outline-line-2',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-[13px] text-muted">Nog leeg.</p>
        )}
      </div>
    </div>
  );
}

function StructureDialog({ open, onOpenChange, tasks }: {
  open: boolean; onOpenChange: (v: boolean) => void; tasks: Task[];
}) {
  const updateTask = useBoardStore((s) => s.updateTask);
  const removeTask = useBoardStore((s) => s.removeTask);
  const openTask = useUiStore((s) => s.openTask);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Structureer inspiratie" className="max-w-xl">
        <div className="p-5">
          <p className="panel-label mb-1">Structureer inspiratie</p>
          <p className="mb-4 text-[13px] text-muted">
            {tasks.length === 0 ? 'Nog geen inspiratie.' : 'Beslis per kaart: openen, naar wachtruimte of weg.'}
          </p>
          <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-card border border-line bg-surface-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[13px] text-txt">{t.title}</span>
                <Button variant="secondary" size="sm" onClick={() => { openTask(t.id); onOpenChange(false); }}>Open</Button>
                <Button variant="ghost" size="sm" onClick={() => updateTask(t.id, { dayKey: 'wachtruimte' })}>
                  <Archive size={13} strokeWidth={1.75} /> Wachten
                </Button>
                <Button variant="danger" size="sm" onClick={() => removeTask(t.id)}>Weg</Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dumpbak & wachtruimte: echte taakkaarten (zelfde modal als het weekbord).
 * Geen zakelijk/privé-toggle — dat zit optioneel in de kaart/doelkoppeling.
 */
export function DumpPage() {
  const allTasks = useBoardStore((s) => s.tasks);
  const addTask = useBoardStore((s) => s.addTask);
  const moveTask = useBoardStore((s) => s.moveTask);
  const openTask = useUiStore((s) => s.openTask);
  const [draft, setDraft] = useState('');
  const [structureOpen, setStructureOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dump = openTasksFor(allTasks, 'dump', null);
  const waiting = openTasksFor(allTasks, 'wachtruimte', null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function submit() {
    const title = draft.trim();
    if (!title) return;
    const task = addTask({ title, dayKey: 'dump' });
    setDraft('');
    openTask(task.id);
    inputRef.current?.focus();
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const task = allTasks.find((t) => t.id === active.id);
    if (!task) return;
    const overId = String(over.id);
    let dayKey: DayKey | null = null;
    let index = Number.MAX_SAFE_INTEGER;
    if (overId.startsWith('sec:')) {
      const parts = overId.split(':');
      dayKey = parts[1] as DayKey;
    } else {
      const overTask = allTasks.find((t) => t.id === overId);
      if (!overTask) return;
      dayKey = overTask.dayKey;
      const siblings = openTasksFor(allTasks, overTask.dayKey, null);
      index = siblings.findIndex((t) => t.id === overTask.id);
    }
    if (dayKey === 'dump' || dayKey === 'wachtruimte') {
      moveTask(task.id, dayKey, null, index);
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Inbox size={16} strokeWidth={1.75} className="text-muted" />
          <p className="text-[13px] text-muted">
            Dump inspiratie snel weg — open een kaart om te structureren.
          </p>
          {dump.length > 1 && (
            <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setStructureOpen(true)}>
              <ListChecks size={14} strokeWidth={1.75} /> Structureer
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Inspiratie… Enter = aanmaken en openen"
          className="mb-5 h-11 w-full rounded-card border border-line bg-surface px-3.5 text-[14px] text-txt shadow-soft-sm outline-none placeholder:text-muted-2 focus:border-green"
        />

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-6 md:grid-cols-2">
            <DumpColumn dayKey="dump" title="Inspiratie" hint="snel kwijt, later structureren" tasks={dump} />
            <DumpColumn dayKey="wachtruimte" title="Wachtruimte" hint="mag blijven liggen" tasks={waiting} />
          </div>
        </DndContext>

        {waiting.some((t) => differenceInCalendarDays(new Date(), parseISO(t.createdAt)) > 30) && (
          <p className="mt-4 text-[12px] text-muted">
            Tip: sommige kaarten in de wachtruimte liggen er al langer dan 30 dagen.
          </p>
        )}
      </div>
      <StructureDialog open={structureOpen} onOpenChange={setStructureOpen} tasks={dump} />
    </div>
  );
}
