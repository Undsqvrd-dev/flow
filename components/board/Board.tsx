'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { parseISO } from 'date-fns';
import type { DayKey } from '@/lib/types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { WeekTray } from './WeekTray';
import { QuickWinsCard } from './QuickWinsCard';
import { FocusBar } from '@/components/focusbar/FocusBar';
import { useBoardStore } from '@/stores/useBoardStore';
import { labelById, useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import { dayKeyFromDate, rollingBoardDates, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { LabelBundleFrame } from './LabelBundleFrame';
import { boardCollision, dragOverlay, finishBoardDrop, type ActiveDrag } from './boardDrag';
export function Board() {
  const tasks = useBoardStore((s) => s.tasks);
  const labelBundles = useBoardStore((s) => s.labelBundles);
  const labelDefs = useSettingsStore((s) => s.settings.labels ?? []);
  const threshold = useSettingsStore((s) => s.settings.quickWinThresholdMin);
  const focusMode = useUiStore((s) => s.focusMode);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
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
  // Boven een kolomlijst: nooit horizontaal (ook geen trackpad-swipe).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || focusMode) return;
    function onWheel(e: WheelEvent) {
      if (!el) return;
      const target = e.target as HTMLElement | null;
      const overList = Boolean(target?.closest('.thin-scroll'));

      if (overList) {
        // Trackpad links/rechts boven een lijst mag het bord niet meenemen.
        if (Math.abs(e.deltaX) >= Math.abs(e.deltaY) && e.deltaX !== 0) {
          e.preventDefault();
        }
        return;
      }

      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
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
    setActiveDrag(dragOverlay(String(e.active.id), tasks, threshold, labelBundles));
  }

  function onDragEnd(e: DragEndEvent) {
    const drag = activeDrag;
    setActiveDrag(null);
    if (!e.over) return;
    finishBoardDrop(String(e.active.id), String(e.over.id), tasks, drag);
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <FocusBar />
      <DndContext sensors={sensors} collisionDetection={boardCollision} onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
          {activeDrag?.type === 'task' ? (
            <div className={cn('rotate-2 opacity-95', focusMode ? 'w-[min(520px,100%)] max-w-[90vw]' : 'w-[248px]')}>
              <TaskCard task={activeDrag.task} sortable={false} />
            </div>
          ) : activeDrag?.type === 'label-bundle' ? (
            <div className="w-[248px]">
              <LabelBundleFrame
                bundle={activeDrag.bundle}
                tasks={activeDrag.tasks}
                label={labelById(labelDefs, activeDrag.bundle.labelId)}
                open
                overlay
                onToggle={() => {}}
              >
                {activeDrag.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} sortable={false} />
                ))}
              </LabelBundleFrame>
            </div>
          ) : activeDrag?.type === 'quickwin' ? (
            <div className="w-[248px]">
              <QuickWinsCard
                tasks={activeDrag.tasks}
                dayKey={activeDrag.dayKey}
                weekOf={activeDrag.weekOf}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
