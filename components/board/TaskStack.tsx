'use client';

import { useState, type ReactNode } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { DayKey, Daypart, Task } from '@/lib/types';
import { blocksForTasks, sharedLabelId } from '@/lib/labelBundle';
import { useBoardStore } from '@/stores/useBoardStore';
import { useSettingsStore, labelById } from '@/stores/useSettingsStore';
import { TaskCard } from './TaskCard';
import { InsertTaskGap } from './InsertTaskGap';
import { LabelBundleFrame } from './LabelBundleFrame';

function BundleDropRing({ task, children }: { task: Task; children: ReactNode }) {
  const { active, over } = useDndContext();
  const tasks = useBoardStore((s) => s.tasks);
  const labelDefs = useSettingsStore((s) => s.settings.labels ?? []);
  const activeTask = typeof active?.id === 'string' ? tasks.find((item) => item.id === active.id) : undefined;
  const labelId =
    over?.id === task.id && activeTask && activeTask.id !== task.id
      ? sharedLabelId(activeTask.labels, task.labels)
      : null;
  const color = labelId ? labelById(labelDefs, labelId)?.color : undefined;

  return (
    <div
      className="rounded-card"
      style={color ? { outline: `2px solid ${color}`, outlineOffset: 2 } : undefined}
    >
      {children}
    </div>
  );
}

function TaskRow({
  task,
  dayKey,
  daypart,
  weekOf,
  first,
  nextId,
  labels,
  bundleId,
}: {
  task: Task;
  dayKey: DayKey;
  daypart: Daypart | null;
  weekOf: string;
  first: boolean;
  nextId: string | null;
  labels?: string[];
  bundleId?: string;
}) {
  const card = <TaskCard task={task} />;
  return (
    <div className="relative">
      {first && (
        <InsertTaskGap
          dayKey={dayKey}
          daypart={daypart}
          weekOf={weekOf}
          insertBeforeId={task.id}
          edge="before"
          labels={labels}
          bundleId={bundleId}
        />
      )}
      {dayKey === 'gedaan' ? card : <BundleDropRing task={task}>{card}</BundleDropRing>}
      {nextId && (
        <InsertTaskGap
          dayKey={dayKey}
          daypart={daypart}
          weekOf={weekOf}
          insertBeforeId={nextId}
          edge="after"
          labels={labels}
          bundleId={bundleId}
        />
      )}
    </div>
  );
}

/** Gewone kaarten, met een inklapbaar kleurblok om een labelgroep. */
export function TaskStack({
  tasks,
  dayKey,
  daypart,
  weekOf,
}: {
  tasks: Task[];
  dayKey: DayKey;
  daypart: Daypart | null;
  weekOf: string;
}) {
  const bundles = useBoardStore((s) => s.labelBundles);
  const labelDefs = useSettingsStore((s) => s.settings.labels ?? []);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  // Gedaan toont afgeronde taken los; de bundel blijft bestaan op de dagkolom.
  const blocks =
    dayKey === 'gedaan'
      ? tasks.map((task) => ({ kind: 'task' as const, task }))
      : blocksForTasks(tasks, bundles);
  const visual = blocks.flatMap((block) => {
    if (block.kind === 'task') return [block.task];
    return closed[block.bundle.id] ? [] : block.tasks;
  });

  function row(task: Task, bundle?: { id: string; labelId: string }) {
    const index = visual.findIndex((item) => item.id === task.id);
    return (
      <TaskRow
        key={task.id}
        task={task}
        dayKey={dayKey}
        daypart={bundle ? task.daypart : daypart}
        weekOf={weekOf}
        first={index === 0}
        nextId={visual[index + 1]?.id ?? null}
        labels={bundle ? [bundle.labelId] : undefined}
        bundleId={bundle?.id}
      />
    );
  }

  return (
    <SortableContext items={visual.map((task) => task.id)} strategy={verticalListSortingStrategy}>
      {blocks.map((block) => {
        if (block.kind === 'task') return row(block.task);
        const label = labelById(labelDefs, block.bundle.labelId);
        const open = !closed[block.bundle.id];
        return (
          <LabelBundleFrame
            key={block.bundle.id}
            bundle={block.bundle}
            tasks={block.tasks}
            label={label}
            open={open}
            onToggle={() =>
              setClosed((current) => ({ ...current, [block.bundle.id]: !current[block.bundle.id] }))
            }
          >
            {block.tasks.map((task) => row(task, block.bundle))}
          </LabelBundleFrame>
        );
      })}
    </SortableContext>
  );
}
