export type WriteResult<T> =
  | { status: 'ok'; server: T }
  | { status: 'conflict'; server: T | null };

/** Wacht even met wegschrijven zodat een reeks toetsaanslagen één verzoek wordt. */
export const TEXT_SYNC_DEBOUNCE_MS = 350;

export interface RowQueue {
  kick: (id: string, baseUpdatedAt: string | null, rollback: () => void) => Promise<void>;
  flush: () => void;
  forget: (id: string) => void;
  isDirty: (id: string) => boolean;
  dirtyIds: () => ReadonlySet<string>;
  remember: (id: string, updatedAt: string) => void;
}

/**
 * Seriële schrijfwachtrij per rij.
 * Een rij blijft dirty vanaf de eerste wijziging tot de laatste snapshot
 * bevestigd is. Realtime en refetch slaan dirty rijen over, zodat een echo
 * van een eerdere toetsaanslag de nieuwere invoer niet terugzet.
 * Een conflict terwijl er nog verder getypt is, neemt alleen de serverklok
 * over en probeert de lokale tekst opnieuw. Is de gebruiker gestopt, dan
 * wint een nieuwere serverrij.
 */
export function createRowQueue<T extends { updatedAt: string }>(options: {
  getCurrent: (id: string) => Promise<T | undefined>;
  write: (item: T, baseUpdatedAt: string | null) => Promise<WriteResult<T>>;
  onAck: (id: string, sentUpdatedAt: string, server: T) => Promise<void>;
  onConflict: (id: string, server: T | null) => Promise<void>;
  debounceMs?: number;
}): RowQueue {
  const debounceMs = options.debounceMs ?? 0;
  const ack = new Map<string, string>();
  const dirty = new Set<string>();
  const inserts = new Set<string>();
  const inflight = new Set<string>();
  const generation = new Map<string, number>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const tails = new Map<string, Promise<void>>();
  const rollbacks = new Map<string, () => void>();
  const waiters = new Map<string, Array<() => void>>();

  function settle(id: string): void {
    const pending = waiters.get(id);
    if (!pending) return;
    waiters.delete(id);
    for (const resolve of pending) resolve();
  }

  function arm(id: string): void {
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        if (inflight.has(id)) return;
        const prev = tails.get(id) ?? Promise.resolve();
        const next = prev.then(() => pump(id), () => pump(id));
        tails.set(id, next);
      }, debounceMs),
    );
  }

  async function pump(id: string): Promise<void> {
    if (inflight.has(id)) return;
    if (!dirty.has(id)) {
      settle(id);
      return;
    }

    const gen = generation.get(id) ?? 0;
    inflight.add(id);
    const inserting = inserts.has(id);

    try {
      const current = await options.getCurrent(id);
      if (!current) {
        inserts.delete(id);
        dirty.delete(id);
        return;
      }

      const base = inserting ? null : (ack.get(id) ?? null);
      const sentUpdatedAt = current.updatedAt;
      const result = await options.write(current, base);
      const typedMore = (generation.get(id) ?? 0) !== gen;

      if (result.status === 'ok') {
        inserts.delete(id);
        ack.set(id, result.server.updatedAt);
        if (!typedMore) {
          await options.onAck(id, sentUpdatedAt, result.server);
          dirty.delete(id);
        }
        return;
      }

      if (typedMore && result.server) {
        ack.set(id, result.server.updatedAt);
        return;
      }

      if (!typedMore) {
        inserts.delete(id);
        dirty.delete(id);
        if (result.server) ack.set(id, result.server.updatedAt);
        else ack.delete(id);
        await options.onConflict(id, result.server);
      }
    } catch (err: unknown) {
      console.error('[flow sync]', err);
      inserts.delete(id);
      dirty.delete(id);
      rollbacks.get(id)?.();
    } finally {
      inflight.delete(id);
      if (dirty.has(id)) arm(id);
      else settle(id);
    }
  }

  return {
    kick(id, baseUpdatedAt, rollback) {
      generation.set(id, (generation.get(id) ?? 0) + 1);
      if (baseUpdatedAt === null) inserts.add(id);
      else if (!ack.has(id)) ack.set(id, baseUpdatedAt);
      rollbacks.set(id, rollback);
      dirty.add(id);
      arm(id);
      return new Promise<void>((resolve) => {
        const pending = waiters.get(id) ?? [];
        pending.push(resolve);
        waiters.set(id, pending);
      });
    },
    flush() {
      for (const id of [...dirty]) {
        const timer = timers.get(id);
        if (timer) {
          clearTimeout(timer);
          timers.delete(id);
        }
        if (inflight.has(id)) continue;
        const prev = tails.get(id) ?? Promise.resolve();
        const next = prev.then(() => pump(id), () => pump(id));
        tails.set(id, next);
      }
    },
    forget(id) {
      const timer = timers.get(id);
      if (timer) clearTimeout(timer);
      timers.delete(id);
      dirty.delete(id);
      inserts.delete(id);
      generation.delete(id);
      if (!inflight.has(id)) settle(id);
    },
    isDirty(id) {
      return dirty.has(id) || inflight.has(id);
    },
    dirtyIds() {
      if (inflight.size === 0) return dirty;
      const ids = new Set(dirty);
      for (const id of inflight) ids.add(id);
      return ids;
    },
    remember(id, updatedAt) {
      if (!dirty.has(id) && !inserts.has(id)) ack.set(id, updatedAt);
    },
  };
}
