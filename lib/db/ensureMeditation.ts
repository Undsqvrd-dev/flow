'use client';

import { parseISO } from 'date-fns';
import { dayKeyFromDate, todayISO, weekOf } from '@/lib/dates';
import {
  findPersonalLabel,
  PERSONAL_LABEL_COLOR,
  PERSONAL_LABEL_NAME,
  ritualBundleId,
  withRitualPair,
} from '@/lib/labelBundle';
import { MEDITATION_TITLE, meditationRitualKey } from '@/lib/meditation';
import { SPORT_RITUAL_RANK, SPORT_TITLE, sportRitualKey } from '@/lib/sportRitual';
import { setLabelBundleCache } from '@/lib/db/bundleCache';
import { uid } from '@/lib/utils';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { reconcileSportSessions } from '@/stores/useSportStore';
import { applyUpsert } from '@/lib/db/applyRemote';
import { syncEnabled } from '@/lib/db/enabled';
import { rememberTask, taskDirtyIds } from '@/lib/db/liveSync';
import { deleteTask } from '@/lib/db/sync';
import { isRitualSkipped, refreshRitualSkips } from '@/lib/ritualSkip';
import { createClient } from '@/lib/supabase/client';
import { taskFromRow, type TaskRow } from '@/lib/supabase/mappers';
import { useBoardStore } from '@/stores/useBoardStore';

let warned = false;
let warnedRituals = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Zorgt dat de meditatietaak van deze lokale dag bestaat.
 * De database maakt hem hoogstens één keer aan; deze client zet de rij in de store.
 */
export async function ensureTodayMeditation(date = todayISO()): Promise<void> {
  if (!syncEnabled()) return;
  const supabase = createClient();
  const { data, error } = await supabase.rpc('ensure_daily_meditation', { p_date: date });
  if (error) {
    if (!warned) {
      warned = true;
      console.error(
        '[flow meditatie] ensure_daily_meditation mislukt. Draai migratie 006 op de database.',
        error,
      );
    }
    return;
  }
  if (!isRecord(data)) return;
  applyRitualRow(data);
}

function dropSkippedRituals(): void {
  const state = useBoardStore.getState();
  const skipped = state.tasks.filter((task) => isRitualSkipped(task.ritualKey));
  if (skipped.length === 0) return;
  useBoardStore.setState({
    tasks: state.tasks.filter((task) => !isRitualSkipped(task.ritualKey)),
  });
  if (!syncEnabled()) return;
  for (const task of skipped) void deleteTask(task.id).catch(() => {});
}

function applyRitualRow(row: Record<string, unknown>): void {
  const key = typeof row.ritual_key === 'string' ? row.ritual_key : null;
  if (isRitualSkipped(key)) {
    const id = typeof row.id === 'string' ? row.id : null;
    if (id && syncEnabled()) void deleteTask(id).catch(() => {});
    return;
  }
  const task = taskFromRow(row as unknown as TaskRow);
  const state = useBoardStore.getState();
  const next = applyUpsert(state.tasks, task, (item) => item.id, taskDirtyIds());
  if (next === state.tasks) return;
  useBoardStore.setState({ tasks: next });
  rememberTask(task.id, task.updatedAt);
}

/**
 * Mediteren én Dagafsluiting voor deze lokale dag.
 * Bestaat de nieuwe RPC nog niet, dan blijft Mediteren via migratie 006 werken.
 */
export async function ensureTodayRituals(date = todayISO()): Promise<void> {
  try {
    if (!syncEnabled()) return;
    await refreshRitualSkips();
    dropSkippedRituals();
    const supabase = createClient();
    const { data, error } = await supabase.rpc('ensure_daily_rituals', { p_date: date });
    if (error) {
      if (!warnedRituals) {
        warnedRituals = true;
        console.error(
          '[flow rituelen] ensure_daily_rituals mislukt. Draai migratie 007 op de database. Mediteren blijft via 006.',
          error,
        );
      }
      await ensureTodayMeditation(date);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      if (isRecord(row)) applyRitualRow(row);
    }
  } finally {
    ensureLocalSportTask(date);
    ensureSportMeditationBundle(date);
    reconcileSportSessions(useBoardStore.getState().tasks);
  }
}

function ritualTask(date: string, key: string, title: string) {
  const day = parseISO(date);
  const dayKey = dayKeyFromDate(day);
  const week = weekOf(day);
  return useBoardStore.getState().tasks.find(
    (task) => task.ritualKey === key || (task.title === title && task.dayKey === dayKey && task.weekOf === week),
  );
}

/** Sport krijgt Persoonlijk en start in één groep met Mediteren. Een splitsing blijft staan. */
function ensureSportMeditationBundle(date: string): void {
  if (useBoardStore.getState().labelBundles.some((bundle) => bundle.id === ritualBundleId(date))) return;
  const meditation = ritualTask(date, meditationRitualKey(date), MEDITATION_TITLE);
  const sport = ritualTask(date, sportRitualKey(date), SPORT_TITLE);
  if (!meditation || !sport) return;

  let label = findPersonalLabel(useSettingsStore.getState().settings.labels ?? []);
  const labelId = label?.id ?? uid();
  if (!label) {
    const prev = useSettingsStore.getState().settings;
    useSettingsStore.setState({
      settings: {
        ...prev,
        labels: [...prev.labels, { id: labelId, name: PERSONAL_LABEL_NAME, color: PERSONAL_LABEL_COLOR }],
      },
    });
    label = findPersonalLabel(useSettingsStore.getState().settings.labels ?? []);
  }
  if (!label) return;

  const bundles = useBoardStore.getState().labelBundles;
  const seeded = withRitualPair(bundles, date, label.id, meditation.id, sport.id);
  if (seeded === bundles) return;
  setLabelBundleCache(seeded);
  for (const task of [meditation, sport]) {
    if (!task.labels.includes(label.id)) {
      useBoardStore.getState().updateTask(task.id, { labels: [...task.labels, label.id] });
    }
  }
  useBoardStore.getState().setLabelBundles(seeded);
}

/** Zorgt lokaal voor de ochtendtaak, ook als migratie 009 nog niet draait. */
function ensureLocalSportTask(date: string): void {
  const key = sportRitualKey(date);
  const day = parseISO(date);
  const dayKey = dayKeyFromDate(day);
  const week = weekOf(day);
  const tasks = useBoardStore.getState().tasks;
  if (isRitualSkipped(key)) return;
  const exists = tasks.some(
    (task) => task.ritualKey === key || (task.title === SPORT_TITLE && task.dayKey === dayKey && task.weekOf === week),
  );
  if (exists) return;
  useBoardStore.getState().addTask({
    title: SPORT_TITLE,
    dayKey,
    daypart: 'ochtend',
    weekOf: week,
    rank: SPORT_RITUAL_RANK,
    ritualKey: key,
  });
}
