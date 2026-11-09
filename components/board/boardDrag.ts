import type { DayKey, Daypart, Task } from '@/lib/types';
import { isBoardDayKey } from '@/lib/dates';
import { bundlePair, detachTask, joinBundle, parseBundleDropId, planDrop } from '@/lib/labelBundle';
import { parseQuickWinDragId } from '@/lib/quickWinDrag';
import { uid } from '@/lib/utils';
import { openTasksFor, openTasksForDay, quickWinsForDay, useBoardStore } from '@/stores/useBoardStore';
import { parseSectionId } from './PartSection';

export type ActiveDrag =
  | { type: 'task'; task: Task }
  | { type: 'quickwin'; dayKey: DayKey; weekOf: string; tasks: Task[] };

export function targetOf(
  overId: string,
  tasks: Task[],
): { dayKey: DayKey; daypart: Daypart | null; index: number; weekOf: string } | null {
  const qw = parseQuickWinDragId(overId);
  if (qw) return { dayKey: qw.dayKey, daypart: null, weekOf: qw.weekOf, index: 0 };
  const section = parseSectionId(overId);
  if (section) return { ...section, index: Number.MAX_SAFE_INTEGER };
  const overTask = tasks.find((task) => task.id === overId);
  if (!overTask) return null;
  const siblings = isBoardDayKey(overTask.dayKey)
    ? openTasksForDay(tasks, overTask.dayKey, overTask.weekOf)
    : openTasksFor(tasks, overTask.dayKey, overTask.daypart, overTask.weekOf);
  const index = siblings.findIndex((task) => task.id === overTask.id);
  return {
    dayKey: overTask.dayKey,
    daypart: isBoardDayKey(overTask.dayKey) ? null : overTask.daypart,
    weekOf: overTask.weekOf,
    index: index === -1 ? 0 : index,
  };
}

function memberId(
  bundles: { id: string; taskIds: string[] }[],
  overId: string,
  tasks: Task[],
  activeId: string,
): string {
  const bundleId = parseBundleDropId(overId);
  const bundle = bundles.find((item) => item.id === bundleId);
  const member = tasks.find((task) => bundle?.taskIds.includes(task.id) && task.id !== activeId && !task.done);
  return member?.id ?? overId;
}

export function dragOverlay(activeId: string, tasks: Task[], threshold: number): ActiveDrag | null {
  const qw = parseQuickWinDragId(activeId);
  if (qw) {
    return {
      type: 'quickwin',
      dayKey: qw.dayKey,
      weekOf: qw.weekOf,
      tasks: quickWinsForDay(tasks, qw.dayKey, threshold, qw.weekOf),
    };
  }
  const task = tasks.find((item) => item.id === activeId);
  return task ? { type: 'task', task } : null;
}

export function finishBoardDrop(activeId: string, overId: string, tasks: Task[], drag: ActiveDrag | null): void {
  const store = useBoardStore.getState();
  const qw = parseQuickWinDragId(activeId);
  if (qw) {
    const target = targetOf(overId, tasks);
    if (!target || target.dayKey === 'gedaan') return;
    store.moveQuickWinBundle(qw.dayKey, qw.weekOf, target.dayKey, target.weekOf);
    return;
  }

  const task = tasks.find((item) => item.id === activeId) ?? (drag?.type === 'task' ? drag.task : null);
  if (!task) return;
  const plan = planDrop(task.id, task.labels, overId, tasks, store.labelBundles);
  if (plan.type === 'join') {
    store.setLabelBundles(joinBundle(store.labelBundles, plan.bundleId, task.id));
    if (!task.labels.includes(plan.labelId)) {
      store.updateTask(task.id, { labels: [...task.labels, plan.labelId] });
    }
  } else if (plan.type === 'bundle') {
    store.setLabelBundles(bundlePair(store.labelBundles, plan.labelId, task.id, overId, uid()));
  } else if (plan.detach) {
    store.setLabelBundles(detachTask(store.labelBundles, task.id));
  }

  const landingId = parseBundleDropId(overId) ? memberId(store.labelBundles, overId, tasks, task.id) : overId;
  const target = targetOf(landingId, tasks);
  if (!target) return;
  if (target.dayKey === 'gedaan') {
    if (!task.done) store.toggleDone(task.id);
    return;
  }
  if (task.done) store.updateTask(task.id, { done: false, completedAt: null });
  const daypart = isBoardDayKey(target.dayKey) ? null : target.daypart;
  store.moveTask(task.id, target.dayKey, daypart, target.index, target.weekOf);
}
