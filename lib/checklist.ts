import type { ChecklistItem } from '@/lib/types';
import { RANK_STEP, uid } from '@/lib/utils';

const idCache = new Map<string, string>();
const pendingRepair = new Set<string>();
const repairAttempts = new Map<string, number>();

/** Hoe vaak we een id-reparatie opnieuw proberen als de server nog geen id's heeft. */
export const CHECKLIST_REPAIR_ATTEMPTS = 3;

export function resetChecklistRepairState(): void {
  idCache.clear();
  pendingRepair.clear();
  repairAttempts.clear();
}

export function checklistRepairsPending(): ReadonlySet<string> {
  return pendingRepair;
}

export function markChecklistRepair(taskId: string): void {
  if (!taskId) return;
  pendingRepair.add(taskId);
}

export function clearChecklistRepair(taskId: string): void {
  pendingRepair.delete(taskId);
  repairAttempts.delete(taskId);
}

/**
 * Ids die nu weggeschreven mogen worden. Een dirty rij slaan we over: die
 * write stuurt de checklist uit de store al mee. Na `maxAttempts` stoppen we,
 * zodat een blijvend conflict de wachtrij niet blijft vullen.
 */
export function claimChecklistRepairs(dirty: ReadonlySet<string>, maxAttempts: number): string[] {
  const ids: string[] = [];
  for (const id of pendingRepair) {
    if (dirty.has(id)) continue;
    const nextAttempt = (repairAttempts.get(id) ?? 0) + 1;
    repairAttempts.set(id, nextAttempt);
    if (nextAttempt > maxAttempts) {
      pendingRepair.delete(id);
      continue;
    }
    ids.push(id);
  }
  return ids;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id.length > 0 ? id : null;
}

function readRank(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return null;
}

export interface RepairChecklistOptions {
  taskId: string;
  idFactory?: () => string;
  /** Zet uit als de aanroeper zelf opslaat en de wachtrij niet mag aanraken. */
  track?: boolean;
  /**
   * Alleen voor een serverrij: een al geldige checklist haalt de taak uit de
   * reparatiewachtrij. Een reparatie in het geheugen mag die markering niet
   * wissen zolang de server de id's nog niet heeft.
   */
  clearWhenHealthy?: boolean;
}

/**
 * Geeft elk checklist-item een unieke id en een rank.
 * Bestaande id's blijven staan. Ontbreekt de id, dan blijft de gegenereerde id
 * stabiel voor dezelfde taak, positie en tekst zolang deze pagina open is.
 */
export function repairChecklist(
  raw: unknown,
  options: RepairChecklistOptions,
): { items: ChecklistItem[]; changed: boolean } {
  const idFactory = options.idFactory ?? uid;
  if (!Array.isArray(raw)) {
    if (options.track !== false && options.clearWhenHealthy) clearChecklistRepair(options.taskId);
    return { items: [], changed: false };
  }

  const seen = new Set<string>();
  let changed = false;
  const items: ChecklistItem[] = [];

  for (const entry of raw) {
    if (!isRecord(entry)) {
      changed = true;
      continue;
    }

    const index = items.length;
    const text = typeof entry.text === 'string' ? entry.text : '';
    if (entry.text !== text) changed = true;
    const done = entry.done === true;
    if (entry.done !== done) changed = true;

    const rawId = typeof entry.id === 'string' ? entry.id : null;
    const explicit = readId(entry.id);
    if (explicit && rawId !== explicit) changed = true;

    const cacheKey = `${options.taskId}\0${index}\0${text}`;
    let id: string;
    if (explicit && !seen.has(explicit)) {
      id = explicit;
      idCache.set(cacheKey, id);
    } else {
      changed = true;
      id = idCache.get(cacheKey) ?? idFactory();
      idCache.set(cacheKey, id);
    }
    seen.add(id);

    const parsedRank = readRank(entry.rank);
    const rank = parsedRank ?? (index + 1) * RANK_STEP;
    if (parsedRank === null || entry.rank !== rank) changed = true;

    items.push({ id, text, done, rank });
  }

  if (options.track !== false && changed) markChecklistRepair(options.taskId);
  else if (options.track !== false && options.clearWhenHealthy && !changed) clearChecklistRepair(options.taskId);

  return { items, changed };
}

export function repairTaskChecklists<T extends { id: string; checklist: ChecklistItem[] }>(
  tasks: readonly T[],
): { tasks: T[]; changed: boolean } {
  let changed = false;
  const next = tasks.map((task) => {
    const repaired = repairChecklist(task.checklist, { taskId: task.id });
    if (!repaired.changed) return task;
    changed = true;
    return { ...task, checklist: repaired.items };
  });
  return { tasks: changed ? next : (tasks as T[]), changed };
}

/** Alleen een echte id telt. Een lege id mag niet élk item in bewerkmodus zetten. */
export function checklistItemIsEditing(itemId: string | undefined, editingId: string | null): boolean {
  return typeof itemId === 'string' && itemId.length > 0 && editingId === itemId;
}

function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}

/** Nieuwe volgorde met hernummerde ranks. `null` als er niets te verplaatsen is. */
export function reorderChecklist(
  items: readonly ChecklistItem[],
  activeId: string,
  overId: string,
  hideDone: boolean,
): ChecklistItem[] | null {
  if (!activeId || !overId || activeId === overId) return null;
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const visible = hideDone ? sorted.filter((item) => !item.done) : sorted;
  const oldIndex = visible.findIndex((item) => item.id === activeId);
  const newIndex = visible.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) return null;

  const moved = moveItem(visible, oldIndex, newIndex);
  let next: ChecklistItem[];
  if (!hideDone) {
    next = moved;
  } else {
    let cursor = 0;
    next = sorted.map((item) => {
      if (item.done) return item;
      const replacement = moved[cursor];
      cursor += 1;
      return replacement ?? item;
    });
  }
  return next.map((item, index) => ({ ...item, rank: (index + 1) * RANK_STEP }));
}
