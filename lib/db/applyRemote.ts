import { timestampMs } from '@/lib/db/conflict';

export function applyUpsert<T extends { updatedAt: string }>(
  items: T[],
  incoming: T,
  getId: (item: T) => string,
  dirtyIds: ReadonlySet<string>,
): T[] {
  const id = getId(incoming);
  if (dirtyIds.has(id)) return items;

  const index = items.findIndex((item) => getId(item) === id);
  if (index === -1) return [...items, incoming];

  if (timestampMs(incoming.updatedAt) <= timestampMs(items[index].updatedAt)) return items;

  const next = items.slice();
  next[index] = incoming;
  return next;
}

export function applyDelete<T>(
  items: T[],
  id: string,
  getId: (item: T) => string,
): T[] {
  if (!id) return items;
  return items.filter((item) => getId(item) !== id);
}
