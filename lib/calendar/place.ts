import { format, parseISO } from 'date-fns';
import { saveCalendarSortOrders } from '@/lib/calendar/client';
import { eventsOnDate } from '@/lib/calendar/events';
import {
  insertDayCard,
  mixedDayCards,
  parseAgendaDragId,
  ranksForOrder,
  reorderDayCards,
  type DayCard,
} from '@/lib/calendar/order';
import { dateForDayKey, dayKeyFromDate, isBoardDayKey, weekOf } from '@/lib/dates';
import { bundlePair, detachTask, joinBundle, planDrop } from '@/lib/labelBundle';
import { parseQuickWinDragId } from '@/lib/quickWinDrag';
import { parseSectionId } from '@/lib/sectionDrop';
import { uid } from '@/lib/utils';
import { useBoardStore, isQuickWin, isQuickWinBundled, openTasksForDate } from '@/stores/useBoardStore';
import { useCalendarStore, type CalendarEvent } from '@/stores/useCalendarStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import type { Task } from '@/lib/types';

function dateISOFromParts(dayKey: string, columnWeek: string): string | null {
  if (!isBoardDayKey(dayKey)) return null;
  const date = dateForDayKey(dayKey, columnWeek);
  return date ? format(date, 'yyyy-MM-dd') : null;
}

function taskDate(task: Task): string | null {
  return dateISOFromParts(task.dayKey, task.weekOf);
}

function tasksOnDate(dateISO: string): Task[] {
  const tasks = useBoardStore.getState().tasks;
  const threshold = useSettingsStore.getState().settings.quickWinThresholdMin;
  const date = parseISO(dateISO);
  const bundled = isQuickWinBundled(
    useBoardStore.getState().quickWinBundles,
    dayKeyFromDate(date),
    weekOf(date),
  );
  const section = openTasksForDate(tasks, dateISO);
  return bundled ? section.filter((task) => !isQuickWin(task, threshold)) : section;
}

function timedOnDate(dateISO: string): CalendarEvent[] {
  return eventsOnDate(useCalendarStore.getState().events, dateISO).filter((event) => !event.allDay);
}

function cardsOnDate(dateISO: string): DayCard<Task, CalendarEvent>[] {
  return mixedDayCards(tasksOnDate(dateISO), timedOnDate(dateISO));
}

function commit(dateISO: string, cards: DayCard<Task, CalendarEvent>[]): void {
  const date = parseISO(dateISO);
  const dayKey = dayKeyFromDate(date);
  const columnWeek = weekOf(date);
  const current = new Map(useBoardStore.getState().tasks.map((task) => [task.id, task]));
  const { tasks, events } = ranksForOrder(cards);
  useBoardStore.getState().placeTasks(tasks.map((item) => {
    const task = current.get(item.id);
    const moved = Boolean(task) && (task?.dayKey !== dayKey || task?.weekOf !== columnWeek);
    return moved ? { ...item, dayKey, weekOf: columnWeek } : { id: item.id, rank: item.rank };
  }));
  const known = new Map(useCalendarStore.getState().events.map((event) => [event.id, event.sortOrder]));
  void saveCalendarSortOrders(events.filter((event) => known.get(event.id) !== event.sortOrder));
}

function rememberLabels(task: Task, overId: string, tasks: readonly Task[]): void {
  const store = useBoardStore.getState();
  const overTask = tasks.find((item) => item.id === overId);
  const plan = planDrop(task.id, task.labels, overId, tasks, store.labelBundles);
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
}

function placeTask(task: Task, dateISO: string, overId: string | null): boolean {
  const cards = cardsOnDate(dateISO);
  const card = { kind: 'task' as const, id: task.id, task };
  const next = cards.some((item) => item.id === task.id) && overId
    ? reorderDayCards(cards, task.id, overId)
    : insertDayCard(cards, card, overId);
  if (!next) return true;
  if (overId && !parseAgendaDragId(overId)) rememberLabels(task, overId, useBoardStore.getState().tasks);
  commit(dateISO, next);
  return true;
}

/**
 * Sleep van of tussen afspraken. `true` betekent: deze drop is afgehandeld
 * (ook als de afspraak op haar dag blijft). `false`: gewone taak-sleep.
 */
export function tryCalendarReorder(activeId: string, overId: string, tasks: readonly Task[]): boolean {
  if (!useUiStore.getState().showAppointments) return false;

  const activeEventId = parseAgendaDragId(activeId);
  if (activeEventId) {
    const event = useCalendarStore.getState().events.find((item) => item.id === activeEventId);
    if (!event || event.allDay) return true;
    const dateISO = event.eventDate;
    const cards = cardsOnDate(dateISO);
    const section = parseSectionId(overId);
    const sectionDate = section ? dateISOFromParts(section.dayKey, section.weekOf) : null;
    const quickWin = parseQuickWinDragId(overId);
    const quickWinDate = quickWin ? dateISOFromParts(quickWin.dayKey, quickWin.weekOf) : null;
    if (sectionDate && sectionDate !== dateISO) return true;
    if (quickWinDate && quickWinDate !== dateISO) return true;
    if (sectionDate === dateISO) {
      const card = cards.find((item) => item.id === activeId);
      const next = card ? insertDayCard(cards, card, null) : null;
      if (next) commit(dateISO, next);
      return true;
    }
    if (quickWinDate === dateISO) {
      const card = cards.find((item) => item.id === activeId);
      const anchor = cards.find((item) => item.kind === 'event' || item.task.ritualKey === null || !item.task.ritualKey?.startsWith('dagafsluiting:'));
      const next = card ? insertDayCard(cards, card, anchor?.id ?? null) : null;
      if (next) commit(dateISO, next);
      return true;
    }
    const overEventId = parseAgendaDragId(overId);
    if (overEventId) {
      const overEvent = useCalendarStore.getState().events.find((item) => item.id === overEventId);
      if (!overEvent || overEvent.allDay || overEvent.eventDate !== dateISO) return true;
    } else if (!cards.some((item) => item.id === overId)) {
      return true;
    }
    const next = reorderDayCards(cards, activeId, overId);
    if (next) commit(dateISO, next);
    return true;
  }

  const task = tasks.find((item) => item.id === activeId);
  if (!task || task.done) return false;

  const overEventId = parseAgendaDragId(overId);
  if (overEventId) {
    const overEvent = useCalendarStore.getState().events.find((item) => item.id === overEventId);
    if (!overEvent || overEvent.allDay) return false;
    if (timedOnDate(overEvent.eventDate).length === 0) return false;
    return placeTask(task, overEvent.eventDate, overId);
  }

  const overTask = tasks.find((item) => item.id === overId);
  if (overTask && !overTask.done) {
    const dateISO = taskDate(overTask);
    if (!dateISO || timedOnDate(dateISO).length === 0) return false;
    return placeTask(task, dateISO, overId);
  }

  const section = parseSectionId(overId);
  if (section) {
    const dateISO = dateISOFromParts(section.dayKey, section.weekOf);
    if (!dateISO || timedOnDate(dateISO).length === 0) return false;
    return placeTask(task, dateISO, null);
  }

  const quickWin = parseQuickWinDragId(overId);
  if (quickWin) {
    const dateISO = dateISOFromParts(quickWin.dayKey, quickWin.weekOf);
    if (!dateISO || timedOnDate(dateISO).length === 0) return false;
    const cards = cardsOnDate(dateISO);
    const anchor = cards.find((item) => !(item.kind === 'task' && item.task.ritualKey?.startsWith('dagafsluiting:')));
    return placeTask(task, dateISO, anchor?.id ?? null);
  }

  return false;
}
