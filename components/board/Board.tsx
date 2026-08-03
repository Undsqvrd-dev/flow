'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { parseISO } from 'date-fns';
import type { DayKey, Daypart, Task } from '@/lib/types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { WeekTray } from './WeekTray';
import { parseSectionId } from './PartSection';
import { FocusBar } from '@/components/focusbar/FocusBar';
import { useBoardStore, openTasksFor } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';
import { dayKeyFromDate, rollingBoardDates, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

function targetOf(
  overId: string,
  tasks: Task[],
): { dayKey: DayKey; daypart: Daypart | null; index: number; weekOf: string } | null {
  const section = parseSectionId(overId);
  if (section) {
    return { ...section, index: Number.MAX_SAFE_INTEGER };
  }
  const overTask = tasks.find((t) => t.id === overId);
  if (!overTask) return null;
  const siblings = openTasksFor(
    tasks,
    overTask.dayKey,
    overTask.daypart,
    overTask.weekOf,
  );
  const index = siblings.findIndex((t) => t.id === overTask.id);
  return {
    dayKey: overTask.dayKey,
    daypart: overTask.daypart,
    weekOf: overTask.weekOf,
    index: index === -1 ? 0 : index,
  };
}

export function Board() {
  const tasks = useBoardStore((s) => s.tasks);
  const moveTask = useBoardStore((s) => s.moveTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const toggleDone = useBoardStore((s) => s.toggleDone);
  const focusMode = useUiStore((s) => s.focusMode);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const today = todayISO();
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasFocusMode = useRef(focusMode);
  const didInitialScroll = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  // Focusmodus: alleen vandaag + Gedaan.
  // Anders: sticky eerdere dagen + vandaag…+6 (chronologisch).
  const dayDates = focusMode ? [today] : rollingBoardDates(tasks);
  const visibleDayColumns = dayDates.map((dateISO) => ({
    dateISO,
    dayKey: dayKeyFromDate(parseISO(dateISO)),
  }));

  function scrollToToday() {
    const el = scrollRef.current;
    if (!el) return;
    const todayCol = el.querySelector(`[data-date="${today}"]`) as HTMLElement | null;
    if (!todayCol) return;
    // Positie t.o.v. de scrollcontainer (offsetLeft is onbetrouwbaar na layout-wissel).
    const elRect = el.getBoundingClientRect();
    const colRect = todayCol.getBoundingClientRect();
    const next = el.scrollLeft + (colRect.left - elRect.left) - 12;
    el.scrollLeft = Math.max(0, next);
  }

  // Verticaal muiswiel → horizontaal scrollen over de week.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || focusMode) return;
    function onWheel(e: WheelEvent) {
      if (!el) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const target = e.target as HTMLElement | null;
      const nested = target?.closest('.thin-scroll') as HTMLElement | null;
      if (nested && nested.scrollHeight > nested.clientHeight) {
        const atTop = nested.scrollTop <= 0 && e.deltaY < 0;
        const atBottom =
          nested.scrollTop + nested.clientHeight >= nested.scrollHeight - 1 && e.deltaY > 0;
        if (!atTop && !atBottom) return;
      }
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [focusMode]);

  // Scroll naar vandaag: bij eerste load, en na verlaten van focusmodus (na layout).
  useEffect(() => {
    const leftFocus = wasFocusMode.current && !focusMode;
    wasFocusMode.current = focusMode;

    if (focusMode) return;
    if (!leftFocus && didInitialScroll.current) return;

    let cancelled = false;
    // Dubbele rAF: wacht tot flex/horizontale kolommen echt gemeten zijn.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        scrollToToday();
        didInitialScroll.current = true;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [focusMode, today]);

  function onDragStart(e: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const target = targetOf(String(over.id), tasks);
    if (!target) return;

    if (target.dayKey === 'gedaan') {
      if (!task.done) toggleDone(task.id);
      return;
    }
    if (task.done) {
      updateTask(task.id, { done: false, completedAt: null });
    }
    moveTask(task.id, target.dayKey, target.daypart, target.index, target.weekOf);
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <FocusBar />
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex min-h-0 min-w-0 flex-1">
          <WeekTray />
          <div
            ref={scrollRef}
            className={cn(
              'board-scroll flex min-h-0 min-w-0 flex-1 items-start gap-3 overflow-x-auto py-4',
              focusMode
                ? 'flex-col px-3 pb-20 snap-none sm:flex-row sm:justify-center sm:px-4 md:px-6 md:pb-4'
                : 'pl-3 pr-4 snap-x snap-mandatory md:snap-none md:pr-6',
            )}
          >
            {visibleDayColumns.map(({ dateISO, dayKey }, i) => (
              <Column
                key={dateISO}
                dayKey={dayKey}
                dateISO={dateISO}
                index={i + 1}
                featured={focusMode && dateISO === today}
              />
            ))}
            <Column dayKey="gedaan" index={visibleDayColumns.length + 1} />
          </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className={cn('rotate-2 opacity-95', focusMode ? 'w-[min(520px,100%)] max-w-[90vw]' : 'w-[248px]')}>
              <TaskCard task={activeTask} sortable={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
