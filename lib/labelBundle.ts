import type { LabelDef } from '@/lib/types';

/** Groep kaarten die via hetzelfde label aan elkaar hangen. */
export interface LabelBundle {
  id: string;
  labelId: string;
  taskIds: string[];
}

export const PERSONAL_LABEL_NAME = 'Persoonlijk';
/** Alleen gebruikt als het label nog niet bestaat. Staat in het labelpalet. */
export const PERSONAL_LABEL_COLOR = '#7C3AED';

export function ritualBundleId(dateISO: string): string {
  return `ritual:${dateISO}`;
}

export function isRitualBundleId(id: string): boolean {
  return /^ritual:\d{4}-\d{2}-\d{2}$/.test(id);
}

export function findPersonalLabel(labels: readonly LabelDef[]): LabelDef | undefined {
  return labels.find((label) => label.name.trim().toLowerCase() === PERSONAL_LABEL_NAME.toLowerCase());
}

/** Eerste gedeelde label-id, in de volgorde van de gesleepte kaart. */
export function sharedLabelId(active: readonly string[], over: readonly string[]): string | null {
  return active.find((id) => over.includes(id)) ?? null;
}

export function tint(hex: string, alpha: number): string {
  const raw = hex.trim();
  if (!raw.startsWith('#')) return hex;
  let h = raw.slice(1);
  if (h.length === 3) h = h.split('').map((char) => char + char).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function sameLabelBundles(a: readonly LabelBundle[], b: readonly LabelBundle[]): boolean {
  return (
    a.length === b.length &&
    a.every((bundle, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        bundle.id === other.id &&
        bundle.labelId === other.labelId &&
        bundle.taskIds.length === other.taskIds.length &&
        bundle.taskIds.every((id, taskIndex) => id === other.taskIds[taskIndex])
      );
    })
  );
}

export function parseLabelBundles(value: unknown): LabelBundle[] {
  if (!Array.isArray(value)) return [];
  const bundles: LabelBundle[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { id?: unknown; labelId?: unknown; taskIds?: unknown };
    if (typeof row.id !== 'string' || typeof row.labelId !== 'string' || !Array.isArray(row.taskIds)) continue;
    const taskIds = row.taskIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    bundles.push({ id: row.id, labelId: row.labelId, taskIds });
  }
  return bundles;
}

function keepBundle(bundle: LabelBundle): boolean {
  return bundle.taskIds.length >= 2 || isRitualBundleId(bundle.id);
}

/**
 * Sleept één kaart bij een andere met hetzelfde label.
 * De doelgroep neemt de kaart op; de rest van de oude groep blijft staan.
 */
export function bundlePair(
  bundles: readonly LabelBundle[],
  labelId: string,
  sourceId: string,
  targetId: string,
  newId: string,
): LabelBundle[] {
  if (sourceId === targetId) return [...bundles];
  const targetBundle = bundles.find((bundle) => bundle.labelId === labelId && bundle.taskIds.includes(targetId));
  const ids = new Set<string>(targetBundle?.taskIds ?? [targetId]);
  ids.add(sourceId);
  ids.add(targetId);
  const keepId = targetBundle?.id ?? newId;

  const next: LabelBundle[] = [];
  for (const bundle of bundles) {
    if (bundle === targetBundle) continue;
    const taskIds = bundle.taskIds.filter((id) => !ids.has(id));
    if (keepBundle({ ...bundle, taskIds })) next.push({ ...bundle, taskIds });
  }
  next.push({ id: keepId, labelId, taskIds: [...ids] });
  return next;
}

/** Haalt één kaart uit zijn groep. Een rituele groep blijft als markering staan. */
export function detachTask(bundles: readonly LabelBundle[], taskId: string): LabelBundle[] {
  return bundles.flatMap((bundle) => {
    if (!bundle.taskIds.includes(taskId)) return [bundle];
    const taskIds = bundle.taskIds.filter((id) => id !== taskId);
    return keepBundle({ ...bundle, taskIds }) ? [{ ...bundle, taskIds }] : [];
  });
}

/**
 * Sport en Mediteren van deze dag één keer groeperen.
 * Bestaat de rituele groep al, dan blijft een handmatige splitsing staan.
 */
export function withRitualPair(
  bundles: readonly LabelBundle[],
  dateISO: string,
  labelId: string,
  meditationId: string,
  sportId: string,
): LabelBundle[] {
  const id = ritualBundleId(dateISO);
  if (bundles.some((bundle) => bundle.id === id)) return bundles as LabelBundle[];
  if (bundles.some((bundle) => bundle.taskIds.includes(meditationId) && bundle.taskIds.includes(sportId))) {
    return [...bundles, { id, labelId, taskIds: [] }];
  }
  return bundlePair(bundles, labelId, sportId, meditationId, id);
}

export type TaskBlock<T extends { id: string }> =
  | { kind: 'task'; task: T }
  | { kind: 'bundle'; bundle: LabelBundle; tasks: T[] };

/** Zet leden van één groep bij elkaar, op de plek van het eerste lid. */
export function blocksForTasks<T extends { id: string }>(
  tasks: readonly T[],
  bundles: readonly LabelBundle[],
): TaskBlock<T>[] {
  const present = new Set(tasks.map((task) => task.id));
  const consumed = new Set<string>();
  const blocks: TaskBlock<T>[] = [];

  for (const task of tasks) {
    if (consumed.has(task.id)) continue;
    const bundle = bundles.find((item) => {
      if (!item.taskIds.includes(task.id)) return false;
      return item.taskIds.filter((id) => present.has(id)).length >= 2;
    });
    if (!bundle) {
      blocks.push({ kind: 'task', task });
      continue;
    }
    const members = tasks.filter((item) => bundle.taskIds.includes(item.id));
    for (const member of members) consumed.add(member.id);
    blocks.push({ kind: 'bundle', bundle, tasks: members });
  }
  return blocks;
}

export function bundleDropId(bundleId: string): string {
  return `lb:${bundleId}`;
}

export function parseBundleDropId(id: string): string | null {
  return id.startsWith('lb:') && !id.startsWith('lbm:') ? id.slice(3) : null;
}

/** Sleep-id van een heel labelblok, los van de drop-zone `lb:`. */
export function labelBundleDragId(bundleId: string): string {
  return `lbm:${bundleId}`;
}

export function parseLabelBundleDragId(id: string): string | null {
  return id.startsWith('lbm:') ? id.slice(4) : null;
}

/**
 * Zet een blok taken op één plek in een kolom.
 * `siblingIds` is de kolom zonder het blok. `beforeId` null = achteraan.
 */
export function spliceBundle(
  siblingIds: readonly string[],
  movingIds: readonly string[],
  beforeId: string | null,
): string[] {
  const rest = siblingIds.filter((id) => !movingIds.includes(id));
  let index = rest.length;
  if (beforeId) {
    const at = rest.indexOf(beforeId);
    if (at >= 0) index = at;
  }
  const next = [...rest];
  next.splice(index, 0, ...movingIds);
  return next;
}

/** Voegt één kaart toe aan een bestaand blok en haalt haar uit een andere groep. */
export function joinBundle(
  bundles: readonly LabelBundle[],
  bundleId: string,
  taskId: string,
): LabelBundle[] {
  const host = bundles.find((bundle) => bundle.id === bundleId);
  if (!host || host.taskIds.includes(taskId)) return [...bundles];
  const taskIds = [...host.taskIds, taskId];
  const next: LabelBundle[] = [];
  for (const bundle of bundles) {
    if (bundle.id === host.id) continue;
    const remaining = bundle.taskIds.filter((id) => id !== taskId);
    if (keepBundle({ ...bundle, taskIds: remaining })) next.push({ ...bundle, taskIds: remaining });
  }
  next.push({ ...host, taskIds });
  return next;
}

function hostBundle(bundles: readonly LabelBundle[], taskId: string): LabelBundle | undefined {
  return bundles.find((bundle) => bundle.taskIds.includes(taskId) && bundle.taskIds.length >= 2);
}

export type DropPlan =
  | { type: 'bundle'; labelId: string }
  | { type: 'join'; bundleId: string; labelId: string }
  | { type: 'move'; detach: boolean };

export function planDrop(
  activeId: string,
  activeLabels: readonly string[],
  overId: string,
  tasks: readonly { id: string; labels: readonly string[] }[],
  bundles: readonly LabelBundle[],
): DropPlan {
  if (activeId === overId) return { type: 'move', detach: false };

  const droppedOnBundle = parseBundleDropId(overId);
  const host = droppedOnBundle
    ? bundles.find((bundle) => bundle.id === droppedOnBundle)
    : hostBundle(bundles, tasks.find((task) => task.id === overId)?.id ?? '');
  if (host && host.taskIds.length >= 2 && !host.taskIds.includes(activeId)) {
    return { type: 'join', bundleId: host.id, labelId: host.labelId };
  }

  const over = tasks.find((task) => task.id === overId);
  if (over) {
    const labelId = sharedLabelId(activeLabels, over.labels);
    if (labelId) return { type: 'bundle', labelId };
    const together = bundles.some(
      (bundle) => bundle.taskIds.includes(activeId) && bundle.taskIds.includes(over.id),
    );
    if (together) return { type: 'move', detach: false };
  }
  const grouped = bundles.some((bundle) => bundle.taskIds.includes(activeId) && bundle.taskIds.length >= 2);
  return { type: 'move', detach: grouped };
}
