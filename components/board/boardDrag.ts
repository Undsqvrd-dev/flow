import { pointerWithin, rectIntersection, type CollisionDetection } from '@dnd-kit/core';
import type { DayKey, Daypart, Task } from '@/lib/types';
import { isBoardDayKey } from '@/lib/dates';
import {
  bundlePair,
  detachTask,
  joinBundle,
  parseBundleDropId,
  parseLabelBundleDragId,
  planDrop,
  type LabelBundle,
} from '@/lib/labelBundle';
import { parseQuickWinDragId } from '@/lib/quickWinDrag';
import { uid } from '@/lib/utils';
import { openTasksFor, openTasksForDay, quickWinsForDay, useBoardStore } from '@/stores/useBoardStore';
import { parseSectionId } from '@/lib/sectionDrop';

export type ActiveDrag =
  | { type: 'task'; task: Task }
  | { type: 'quickwin'; dayKey: DayKey; weekOf: string; tasks: Task[] }
  | { type: 'label-bundle'; bundle: LabelBundle; tasks: Task[] };

export type LabelBundleDrop =
  | { type: 'skip' }
  | { type: 'done' }
  | {
      type: 'place';
      dayKey: DayKey;
      daypart: Daypart | null;
      weekOf: string;
      beforeId: string | null;
      atStart: boolean;
    };

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

/** Waar een gesleepte labelbundel landt. Eigen kop of eigen kaart: niet verplaatsen. */
export function resolveLabelBundleDrop(
  bundleId: string,
  overId: string,
  tasks: readonly Task[],
  bundles: readonly LabelBundle[],
): LabelBundleDrop {
  if (parseLabelBundleDragId(overId) === bundleId || parseBundleDropId(overId) === bundleId) {
    return { type: 'skip' };
  }
  const bundle = bundles.find((item) => item.id === bundleId);
  const moving = new Set(
    tasks.filter((task) => bundle?.taskIds.includes(task.id) && !task.done).map((task) => task.id),
  );
  if (moving.has(overId)) return { type: 'skip' };

  const otherBundleId = parseLabelBundleDragId(overId) ?? parseBundleDropId(overId);
  let landingId = overId;
  if (otherBundleId) {
    const other = bundles.find((item) => item.id === otherBundleId);
    const anchor = tasks
      .filter((task) => other?.taskIds.includes(task.id) && !task.done && !moving.has(task.id))
      .sort((a, b) => a.rank - b.rank)[0];
    if (!anchor) return { type: 'skip' };
    landingId = anchor.id;
  }

  const section = parseSectionId(landingId);
  if (section) {
    if (section.dayKey === 'gedaan') return { type: 'done' };
    return {
      type: 'place',
      dayKey: section.dayKey,
      daypart: isBoardDayKey(section.dayKey) ? null : section.daypart,
      weekOf: section.weekOf,
      beforeId: null,
      atStart: false,
    };
  }
  const quickWin = parseQuickWinDragId(landingId);
  if (quickWin) {
    if (quickWin.dayKey === 'gedaan') return { type: 'skip' };
    return {
      type: 'place',
      dayKey: quickWin.dayKey,
      daypart: null,
      weekOf: quickWin.weekOf,
      beforeId: null,
      atStart: true,
    };
  }
  const overTask = tasks.find((task) => task.id === landingId);
  if (!overTask) return { type: 'skip' };
  const host = bundles.find((item) => item.id !== bundleId && item.taskIds.includes(overTask.id));
  const anchor = host
    ? tasks
        .filter((task) => host.taskIds.includes(task.id) && !task.done && !moving.has(task.id))
        .sort((a, b) => a.rank - b.rank)[0]
    : overTask;
  if (!anchor) return { type: 'skip' };
  return {
    type: 'place',
    dayKey: anchor.dayKey,
    daypart: isBoardDayKey(anchor.dayKey) ? null : anchor.daypart,
    weekOf: anchor.weekOf,
    beforeId: anchor.id,
    atStart: false,
  };
}

/**
 * Een labelblok is hoger dan één kaart. De standaard overlap-meting kiest dan
 * de hele kolom, ook als de aanwijzer op een kaart staat. Voor een blok telt
 * het kleinste doel onder de aanwijzer; losse kaarten blijven op overlap.
 */
export const boardCollision: CollisionDetection = (args) => {
  if (parseLabelBundleDragId(String(args.active.id))) {
    const hits = pointerWithin(args);
    if (hits.length > 0) {
      const areaOf = (id: string | number) => {
        const rect = args.droppableRects.get(id);
        return rect ? rect.width * rect.height : Number.POSITIVE_INFINITY;
      };
      return [...hits].sort((a, b) => areaOf(a.id) - areaOf(b.id));
    }
  }
  return rectIntersection(args);
};

export function dragOverlay(
  activeId: string,
  tasks: Task[],
  threshold: number,
  bundles: readonly LabelBundle[] = [],
): ActiveDrag | null {
  const qw = parseQuickWinDragId(activeId);
  if (qw) {
    return {
      type: 'quickwin',
      dayKey: qw.dayKey,
      weekOf: qw.weekOf,
      tasks: quickWinsForDay(tasks, qw.dayKey, threshold, qw.weekOf),
    };
  }
  const bundleId = parseLabelBundleDragId(activeId);
  if (bundleId) {
    const bundle = bundles.find((item) => item.id === bundleId);
    if (!bundle) return null;
    const members = tasks
      .filter((task) => bundle.taskIds.includes(task.id) && !task.done)
      .sort((a, b) => a.rank - b.rank);
    return { type: 'label-bundle', bundle, tasks: members };
  }
  const task = tasks.find((item) => item.id === activeId);
  return task ? { type: 'task', task } : null;
}

export function finishBoardDrop(activeId: string, overId: string, tasks: Task[], drag: ActiveDrag | null): void {
  const store = useBoardStore.getState();
  const draggedBundle = parseLabelBundleDragId(activeId);
  if (draggedBundle) {
    const drop = resolveLabelBundleDrop(draggedBundle, overId, tasks, store.labelBundles);
    if (drop.type === 'done') store.completeLabelBundle(draggedBundle);
    else if (drop.type === 'place') store.moveLabelBundle(draggedBundle, drop);
    return;
  }
  const qw = parseQuickWinDragId(activeId);
  if (qw) {
    const target = targetOf(overId, tasks);
    if (!target || target.dayKey === 'gedaan') return;
    store.moveQuickWinBundle(qw.dayKey, qw.weekOf, target.dayKey, target.weekOf);
    return;
  }

  const task = tasks.find((item) => item.id === activeId) ?? (drag?.type === 'task' ? drag.task : null);
  if (!task) return;
  const overTask = tasks.find((item) => item.id === overId);
  const plan = planDrop(task.id, task.labels, overId, tasks, store.labelBundles);
  // Afgeronde kaarten staan alleen in Gedaan; daar ontstaat geen nieuwe bundel.
  const keepLoose = overTask?.done === true;
  if (!keepLoose && plan.type === 'join') {
    store.setLabelBundles(joinBundle(store.labelBundles, plan.bundleId, task.id));
    if (!task.labels.includes(plan.labelId)) {
      store.updateTask(task.id, { labels: [...task.labels, plan.labelId] });
    }
  } else if (!keepLoose && plan.type === 'bundle') {
    store.setLabelBundles(bundlePair(store.labelBundles, plan.labelId, task.id, overId, uid()));
  } else if (plan.type === 'move' && plan.detach) {
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
