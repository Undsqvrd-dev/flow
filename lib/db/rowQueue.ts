export type WriteResult<T> =
  | { status: 'ok'; server: T }
  | { status: 'conflict'; server: T | null };

export interface RowQueue {
  kick: (id: string, baseUpdatedAt: string | null, rollback: () => void) => Promise<void>;
  forget: (id: string) => void;
  isDirty: (id: string) => boolean;
  dirtyIds: () => ReadonlySet<string>;
  remember: (id: string, updatedAt: string) => void;
}

/**
 * Seriële schrijfwachtrij per rij. Elke flush stuurt de laatste lokale staat
 * en de laatst bekende serverversie, zodat een tweede edit niet als stale
 * wordt geweigerd nadat de eerste net `updated_at` op de server heeft verzet.
 */
export function createRowQueue<T extends { updatedAt: string }>(options: {
  getCurrent: (id: string) => Promise<T | undefined>;
  write: (item: T, baseUpdatedAt: string | null) => Promise<WriteResult<T>>;
  onAck: (id: string, sentUpdatedAt: string, server: T) => Promise<void>;
  onConflict: (id: string, server: T | null) => Promise<void>;
}): RowQueue {
  const ack = new Map<string, string>();
  const dirty = new Set<string>();
  const inserts = new Set<string>();
  const tails = new Map<string, Promise<void>>();
  const rollbacks = new Map<string, () => void>();

  async function pump(id: string): Promise<void> {
    if (!dirty.has(id)) return;
    dirty.delete(id);

    const inserting = inserts.has(id);
    const current = await options.getCurrent(id);
    if (!current) {
      inserts.delete(id);
      return;
    }

    const base = inserting ? null : (ack.get(id) ?? null);
    const sentUpdatedAt = current.updatedAt;

    try {
      const result = await options.write(current, base);
      if (result.status === 'ok') {
        inserts.delete(id);
        ack.set(id, result.server.updatedAt);
        await options.onAck(id, sentUpdatedAt, result.server);
        if (dirty.has(id)) await pump(id);
        return;
      }

      inserts.delete(id);
      dirty.delete(id);
      if (result.server) ack.set(id, result.server.updatedAt);
      else ack.delete(id);
      await options.onConflict(id, result.server);
    } catch (err: unknown) {
      console.error('[flow sync]', err);
      inserts.delete(id);
      dirty.delete(id);
      rollbacks.get(id)?.();
    }
  }

  return {
    kick(id, baseUpdatedAt, rollback) {
      if (baseUpdatedAt === null) inserts.add(id);
      else if (!ack.has(id)) ack.set(id, baseUpdatedAt);
      rollbacks.set(id, rollback);
      dirty.add(id);
      const prev = tails.get(id) ?? Promise.resolve();
      const next = prev.then(() => pump(id), () => pump(id));
      tails.set(id, next);
      return next;
    },
    forget(id) {
      dirty.delete(id);
      inserts.delete(id);
    },
    isDirty(id) {
      return dirty.has(id);
    },
    dirtyIds() {
      return dirty;
    },
    remember(id, updatedAt) {
      if (!inserts.has(id)) ack.set(id, updatedAt);
    },
  };
}
