'use client';

import { todayISO } from '@/lib/dates';
import { applyUpsert } from '@/lib/db/applyRemote';
import { syncEnabled } from '@/lib/db/enabled';
import { rememberTask, taskDirtyIds } from '@/lib/db/liveSync';
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

function applyRitualRow(row: Record<string, unknown>): void {
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
  if (!syncEnabled()) return;
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
}
