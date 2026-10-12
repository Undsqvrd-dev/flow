import { createClient } from '@/lib/supabase/client';
import type { WriteResult } from '@/lib/db/rowQueue';

type SyncTable =
  | 'tasks'
  | 'goals'
  | 'flow_values'
  | 'focus'
  | 'sport_sessions'
  | 'day_states'
  | 'pomodoro_sessions';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(error: unknown): string | null {
  if (!isRecord(error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

function errorMessage(error: unknown): string {
  if (!isRecord(error)) return 'Schrijven naar Supabase mislukt';
  return typeof error.message === 'string' ? error.message : 'Schrijven naar Supabase mislukt';
}

/**
 * Schrijf één rij.
 * - `baseUpdatedAt === null`: insert (nieuwe lokale rij).
 * - anders: update alleen als `updated_at` op de server niet nieuwer is dan de
 *   versie die deze client kende. Ontbreekt de rij, dan insert of verwijder
 *   lokaal, afhankelijk van `ifMissing`.
 */
export async function writeVersioned<T>(args: {
  table: SyncTable;
  key: 'id' | 'date';
  id: string;
  row: Record<string, unknown>;
  baseUpdatedAt: string | null;
  ifMissing: 'insert' | 'remove';
  parse: (row: Record<string, unknown>) => T;
}): Promise<WriteResult<T>> {
  const supabase = createClient();

  if (args.baseUpdatedAt === null) {
    const inserted = await supabase.from(args.table).insert(args.row).select('*').maybeSingle();
    if (!inserted.error && isRecord(inserted.data)) {
      return { status: 'ok', server: args.parse(inserted.data) };
    }
    if (inserted.error && errorCode(inserted.error) !== '23505') {
      throw new Error(errorMessage(inserted.error));
    }
  }

  const base = args.baseUpdatedAt ?? (typeof args.row.updated_at === 'string' ? args.row.updated_at : null);
  if (!base) {
    throw new Error(`Geen updated_at voor ${args.table}/${args.id}`);
  }

  const updated = await supabase
    .from(args.table)
    .update(args.row)
    .eq(args.key, args.id)
    .lte('updated_at', base)
    .select('*');

  if (updated.error) throw new Error(errorMessage(updated.error));

  const written = Array.isArray(updated.data) ? updated.data.find(isRecord) : undefined;
  if (written) return { status: 'ok', server: args.parse(written) };

  const current = await supabase.from(args.table).select('*').eq(args.key, args.id).maybeSingle();
  if (current.error) throw new Error(errorMessage(current.error));

  if (isRecord(current.data)) {
    return { status: 'conflict', server: args.parse(current.data) };
  }

  if (args.baseUpdatedAt === null || args.ifMissing === 'insert') {
    const created = await supabase.from(args.table).insert(args.row).select('*').maybeSingle();
    if (created.error) throw new Error(errorMessage(created.error));
    if (!isRecord(created.data)) throw new Error(`Insert in ${args.table} gaf geen rij terug`);
    return { status: 'ok', server: args.parse(created.data) };
  }

  return { status: 'conflict', server: null };
}
