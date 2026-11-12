import { syncEnabled } from '@/lib/db/enabled';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'flow-ritual-skips';

let skips = new Set<string>();
let loaded = false;
let warned = false;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const key of parsed) {
      if (typeof key === 'string' && key.length > 0) skips.add(key);
    }
  } catch {
    // Een kapotte lokale lijst mag het bord niet blokkeren.
  }
}

function persist(): void {
  loaded = true;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify([...skips]));
  } catch {
    // Opslag kan dichtzitten; de set in geheugen blijft gelden.
  }
}

function warnOnce(error: { message?: string; code?: string }): void {
  if (warned || error.code === '23505') return;
  warned = true;
  console.warn(
    '[flow rituelen] ritual_skips niet beschikbaar. Draai migratie 012 als die er nog niet staat.',
    error.message ?? error,
  );
}

export function isRitualSkipped(key: string | null | undefined): boolean {
  if (!key) return false;
  ensureLoaded();
  return skips.has(key);
}

export function rememberRitualSkip(key: string): void {
  ensureLoaded();
  skips.add(key);
  persist();
}

export function forgetRitualSkip(key: string): void {
  ensureLoaded();
  skips.delete(key);
  persist();
}

/** Vervangt de set. Bedoeld voor tests. */
export function setRitualSkips(keys: readonly string[]): void {
  skips = new Set(keys);
  persist();
}

export async function refreshRitualSkips(): Promise<void> {
  ensureLoaded();
  if (!syncEnabled()) return;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('ritual_skips').select('ritual_key');
    if (error) {
      warnOnce(error);
      return;
    }
    for (const row of data ?? []) {
      const key = row.ritual_key;
      if (typeof key === 'string' && key.length > 0) skips.add(key);
    }
    persist();
  } catch (error) {
    warnOnce(error instanceof Error ? error : { message: 'ritual_skips ophalen mislukt' });
  }
}

/** Onthoudt de skip lokaal en, als de tabel er al is, ook op de server. */
export async function recordRitualSkip(key: string): Promise<void> {
  rememberRitualSkip(key);
  if (!syncEnabled()) return;
  try {
    const supabase = createClient();
    const { error } = await supabase.from('ritual_skips').insert({ ritual_key: key });
    if (error) warnOnce(error);
  } catch (error) {
    warnOnce(error instanceof Error ? error : { message: 'ritual_skips schrijven mislukt' });
  }
}
