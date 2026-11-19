import { repairChecklist } from '@/lib/checklist';
import { syncEnabled } from '@/lib/db/enabled';
import { createClient } from '@/lib/supabase/client';
import { dayKeyFromDate, todayISO } from '@/lib/dates';
import { parseISO } from 'date-fns';
import {
  activeWeekdays,
  CLOSING_CHECKLIST,
  CLOSING_TIME_NOTE,
  isDaypart,
  markRecurringSeeded,
  openCardsOutsideSchedule,
  parseRitualKey,
  preferredPersonalLabelId,
  recurringSeedSeen,
  sortWeekdays,
  WEEKDAYS,
  type RecurringSchedule,
  type RecurringTask,
} from '@/lib/recurring';
import { useBoardStore } from '@/stores/useBoardStore';
import { useRecurringStore } from '@/stores/useRecurringStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { BoardDayKey, ChecklistItem, Daypart } from '@/lib/types';

const ALL_DAYS = [...WEEKDAYS];

function isMissing(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? '';
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || error.code === 'PGRST202'
    || /recurring_tasks|drop_stale_recurring_cards|schema cache/i.test(message);
}

function asSchedule(value: unknown): RecurringSchedule {
  if (value === 'weekdays' || value === 'times_per_week' || value === 'daily') return value;
  return 'daily';
}

export function recurringFromRow(row: Record<string, unknown>): RecurringTask {
  const id = typeof row.id === 'string' ? row.id : '';
  const checklist = repairChecklist(row.checklist, { taskId: id, track: false }).items;
  const labelIds = Array.isArray(row.label_ids)
    ? row.label_ids.filter((id): id is string => typeof id === 'string')
    : [];
  const weekdays = Array.isArray(row.weekdays) ? sortWeekdays(row.weekdays.filter((day): day is string => typeof day === 'string')) : [];
  const daypart = typeof row.daypart === 'string' && isDaypart(row.daypart) ? row.daypart : null;
  return {
    id,
    title: typeof row.title === 'string' ? row.title : '',
    description: typeof row.description === 'string' ? row.description : '',
    checklist,
    labelIds,
    daypart,
    estimateMin: typeof row.estimate_min === 'number' ? row.estimate_min : null,
    streak: row.streak === true,
    schedule: asSchedule(row.schedule),
    weekdays,
    timesPerWeek: typeof row.times_per_week === 'number' ? row.times_per_week : null,
    rank: typeof row.rank === 'number' ? row.rank : 1000,
    ritualPrefix: typeof row.ritual_prefix === 'string' ? row.ritual_prefix : id,
    paused: row.paused === true,
    builtin: row.builtin === true,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
}

function toRow(task: RecurringTask, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title.trim(),
    description: task.description.trim() ? task.description.trim() : null,
    checklist: task.checklist,
    label_ids: task.labelIds,
    daypart: task.daypart,
    estimate_min: task.estimateMin,
    streak: task.streak,
    schedule: task.schedule,
    weekdays: task.schedule === 'daily' ? ALL_DAYS : sortWeekdays(task.weekdays),
    times_per_week: task.schedule === 'times_per_week' ? task.timesPerWeek : null,
    rank: task.rank,
    ritual_prefix: task.ritualPrefix,
    paused: task.paused,
    builtin: task.builtin,
  };
}

export async function refreshRecurringTasks(): Promise<void> {
  if (!syncEnabled()) {
    if (useRecurringStore.getState().status === 'ready') return;
    useRecurringStore.setState({ status: 'unavailable', items: [] });
    return;
  }
  let supabase;
  try {
    supabase = createClient();
  } catch (error) {
    console.warn('[flow routines] geen cloud-client', error instanceof Error ? error.message : error);
    if (useRecurringStore.getState().status !== 'ready') {
      useRecurringStore.setState({ status: 'unavailable', items: [] });
    }
    return;
  }
  const { data, error } = await supabase.from('recurring_tasks').select('*').order('rank', { ascending: true });
  if (error) {
    if (isMissing(error)) useRecurringStore.setState({ status: 'unavailable', items: [] });
    else console.warn('[flow routines] ophalen mislukt', error.message);
    return;
  }
  const items = (data ?? []).map((row) => recurringFromRow(row as Record<string, unknown>));
  if (items.length > 0) markRecurringSeeded();
  useRecurringStore.setState({ status: 'ready', items });
}

function builtinPayload(userId: string, labelId: string | null) {
  const labels = labelId ? [labelId] : [];
  const base = {
    user_id: userId,
    label_ids: labels,
    schedule: 'daily' as const,
    weekdays: ALL_DAYS,
    times_per_week: null,
    paused: false,
    builtin: true,
    description: null as string | null,
    checklist: [] as ChecklistItem[],
    daypart: null as Daypart | null,
    estimate_min: null as number | null,
  };
  return [
    { ...base, title: 'Mediteren', streak: true, rank: 0, ritual_prefix: 'mediteren' },
    { ...base, title: 'Sport', streak: false, rank: 1, ritual_prefix: 'sport', daypart: 'ochtend' as const },
    {
      ...base,
      title: 'Dagafsluiting',
      description: CLOSING_TIME_NOTE,
      checklist: CLOSING_CHECKLIST,
      streak: false,
      rank: 2000000000,
      ritual_prefix: 'dagafsluiting',
      estimate_min: 5,
    },
  ];
}

/** Vult de drie bestaande rituelen één keer aan als de tabel nog leeg is. */
export async function ensureBuiltinRecurring(): Promise<void> {
  await refreshRecurringTasks();
  const state = useRecurringStore.getState();
  if (state.status !== 'ready' || state.items.length > 0 || recurringSeedSeen()) return;

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const labelId = preferredPersonalLabelId(useSettingsStore.getState().settings.labels ?? []);
  const { error } = await supabase.from('recurring_tasks').upsert(
    builtinPayload(userId, labelId),
    { onConflict: 'user_id,ritual_prefix', ignoreDuplicates: true },
  );
  if (error) {
    if (isMissing(error)) useRecurringStore.setState({ status: 'unavailable', items: [] });
    else console.warn('[flow routines] seed mislukt', error.message);
    return;
  }
  markRecurringSeeded();
  await refreshRecurringTasks();
}

export function dropLocalStaleCards(date = todayISO()): void {
  const { status, items } = useRecurringStore.getState();
  if (status !== 'ready') return;
  const tasks = useBoardStore.getState().tasks;
  const ids = items.flatMap((item) => openCardsOutsideSchedule(
    tasks,
    item.ritualPrefix,
    item.paused ? [] : activeWeekdays(item),
    date,
  ));
  if (ids.length === 0) return;
  const drop = new Set(ids);
  useBoardStore.setState((state) => ({
    tasks: state.tasks.filter((task) => !drop.has(task.id)),
  }));
}

function applyTemplateToOpenCards(task: RecurringTask, date: string): void {
  if (task.paused) return;
  const days = new Set(activeWeekdays(task));
  const description = task.description.trim() ? task.description.trim() : null;
  for (const item of useBoardStore.getState().tasks) {
    const parsed = parseRitualKey(item.ritualKey);
    if (!parsed || parsed.prefix !== task.ritualPrefix || item.done || parsed.date < date) continue;
    if (!days.has(dayKeyFromDate(parseISO(parsed.date)))) continue;
    useBoardStore.getState().updateTask(item.id, {
      title: task.title.trim(),
      description,
      labels: [...task.labelIds],
      daypart: task.daypart,
      estimateMin: task.estimateMin,
    });
  }
}

async function dropServerCards(prefix: string, weekdays: readonly BoardDayKey[], date: string): Promise<boolean> {
  if (!syncEnabled()) return false;
  const supabase = createClient();
  const { error } = await supabase.rpc('drop_stale_recurring_cards', {
    p_prefix: prefix,
    p_from: date,
    p_weekdays: [...weekdays],
  });
  if (error) {
    if (!isMissing(error)) console.warn('[flow routines] opschonen mislukt', error.message);
    return false;
  }
  return true;
}

export async function saveRecurringTask(task: RecurringTask): Promise<void> {
  if (!syncEnabled()) throw new Error('Cloud-sync staat uit.');
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Niet ingelogd.');
  const { error } = await supabase.from('recurring_tasks').upsert(toRow(task, userId), { onConflict: 'id' });
  if (error) throw new Error(error.message);
  markRecurringSeeded();
  await refreshRecurringTasks();
  const saved = useRecurringStore.getState().items.find((item) => item.id === task.id) ?? task;
  const cleared = await dropServerCards(
    saved.ritualPrefix,
    saved.paused ? [] : activeWeekdays(saved),
    todayISO(),
  );
  if (cleared) dropLocalStaleCards();
  applyTemplateToOpenCards(saved, todayISO());
}

export async function deleteRecurringTask(task: RecurringTask): Promise<void> {
  if (!syncEnabled()) throw new Error('Cloud-sync staat uit.');
  const date = todayISO();
  const cleared = await dropServerCards(task.ritualPrefix, [], date);
  const supabase = createClient();
  const { error } = await supabase.from('recurring_tasks').delete().eq('id', task.id);
  if (error) throw new Error(error.message);
  markRecurringSeeded();
  useRecurringStore.setState((state) => ({
    items: state.items.filter((item) => item.id !== task.id),
  }));
  if (cleared) {
    const ids = openCardsOutsideSchedule(useBoardStore.getState().tasks, task.ritualPrefix, [], date);
    const drop = new Set(ids);
    useBoardStore.setState((state) => ({
      tasks: state.tasks.filter((item) => !drop.has(item.id)),
    }));
  }
}
