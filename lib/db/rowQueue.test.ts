import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyUpsert } from '@/lib/db/applyRemote';
import { createRowQueue } from '@/lib/db/rowQueue';

interface Draft {
  id: string;
  title: string;
  updatedAt: string;
}

describe('schrijfwachtrij', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stuurt de tweede edit met de serverversie van de eerste, niet met een verse timestamp', async () => {
    const bases: Array<string | null> = [];
    let current = { id: 'task-1', updatedAt: '2026-10-12T10:00:00.000Z', dayKey: 'wo' };

    const queue = createRowQueue({
      debounceMs: 0,
      getCurrent: async () => current,
      write: async (item, baseUpdatedAt) => {
        bases.push(baseUpdatedAt);
        const serverUpdatedAt =
          baseUpdatedAt === null ? '2026-10-12T10:00:01.000Z' : '2026-10-12T10:00:02.000Z';
        return { status: 'ok', server: { ...item, updatedAt: serverUpdatedAt } };
      },
      onAck: async (_id, sentUpdatedAt, server) => {
        if (current.updatedAt === sentUpdatedAt) {
          current = { ...current, updatedAt: server.updatedAt };
        }
      },
      onConflict: async () => {},
    });

    const first = queue.kick('task-1', '2026-10-12T09:00:00.000Z', () => {});
    current = { ...current, updatedAt: '2026-10-12T10:00:00.500Z', dayKey: 'do' };
    const second = queue.kick('task-1', '2026-10-12T10:00:00.500Z', () => {});
    await first;
    await second;

    expect(bases[0]).toBe('2026-10-12T09:00:00.000Z');
    expect(bases.at(-1)).not.toBe('2026-10-12T10:00:00.500Z');
    expect(current.dayKey).toBe('do');
  });

  it('vervangt een geweigerde schrijfactie door de nieuwere serverrij als er niet meer getypt wordt', async () => {
    let current = { id: 'task-1', updatedAt: '2026-10-12T11:00:00.000Z', dayKey: 'ma' };
    const server = { id: 'task-1', updatedAt: '2026-10-12T12:00:00.000Z', dayKey: 'di' };

    const queue = createRowQueue({
      debounceMs: 0,
      getCurrent: async () => current,
      write: async () => ({ status: 'conflict', server }),
      onAck: async () => {},
      onConflict: async (_id, row) => {
        if (row) current = row;
      },
    });

    await queue.kick('task-1', '2026-10-12T10:00:00.000Z', () => {});

    expect(current.dayKey).toBe('di');
    expect(current.updatedAt).toBe('2026-10-12T12:00:00.000Z');
  });

  it('bundelt snel typen tot één schrijfactie met de volledige tekst', async () => {
    vi.useFakeTimers();
    let current: Draft = { id: 'task-1', title: '', updatedAt: 't0' };
    const sent: string[] = [];

    const queue = createRowQueue<Draft>({
      debounceMs: 300,
      getCurrent: async () => current,
      write: async (item) => {
        sent.push(item.title);
        return { status: 'ok', server: { ...item, updatedAt: 'server-1' } };
      },
      onAck: async (_id, sentUpdatedAt, server) => {
        if (current.updatedAt === sentUpdatedAt) {
          current = { ...current, updatedAt: server.updatedAt };
        }
      },
      onConflict: async () => {},
    });

    current = { id: 'task-1', title: 'a', updatedAt: 't1' };
    const first = queue.kick('task-1', 't0', () => {});
    current = { id: 'task-1', title: 'ab', updatedAt: 't2' };
    const second = queue.kick('task-1', 't1', () => {});
    current = { id: 'task-1', title: 'abc', updatedAt: 't3' };
    const third = queue.kick('task-1', 't2', () => {});

    await vi.advanceTimersByTimeAsync(299);
    expect(sent).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([first, second, third]);

    expect(sent).toEqual(['abc']);
    expect(current.title).toBe('abc');
  });

  it('laat een server-echo een eerdere tekst niet terugzetten terwijl er door getypt wordt', async () => {
    let current: Draft = { id: 'task-1', title: 'a', updatedAt: 't1' };
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sent: string[] = [];
    let echoTitle = '';
    let started = false;

    const queue = createRowQueue<Draft>({
      debounceMs: 0,
      getCurrent: async () => current,
      write: async (item) => {
        sent.push(item.title);
        if (!started) {
          started = true;
          current = { id: 'task-1', title: 'abc', updatedAt: 't3' };
          void queue.kick('task-1', 't2', () => {});
          const echoed = applyUpsert(
            [current],
            { id: 'task-1', title: 'a', updatedAt: 'server-nieuw' },
            (row) => row.id,
            queue.dirtyIds(),
          );
          echoTitle = echoed[0]?.title ?? '';
          await gate;
        }
        return { status: 'ok', server: { ...item, updatedAt: `server-${sent.length}` } };
      },
      onAck: async (_id, sentUpdatedAt, server) => {
        if (current.updatedAt === sentUpdatedAt) {
          current = { ...current, updatedAt: server.updatedAt };
        }
      },
      onConflict: async (_id, server) => {
        if (server) current = server;
      },
    });

    const done = queue.kick('task-1', 't0', () => {});
    await vi.waitFor(() => {
      expect(started).toBe(true);
    });
    release();
    await done;

    expect(echoTitle).toBe('abc');
    expect(current.title).toBe('abc');
    expect(sent.at(-1)).toBe('abc');
  });

  it('negeert een geweigerde schrijfactie zolang de tekst nog langer wordt', async () => {
    let current: Draft = { id: 'task-1', title: 'a', updatedAt: 't1' };
    const sent: string[] = [];
    let conflicts = 0;

    const queue = createRowQueue<Draft>({
      debounceMs: 0,
      getCurrent: async () => current,
      write: async (item) => {
        if (sent.length === 0) {
          sent.push(item.title);
          current = { id: 'task-1', title: 'abc', updatedAt: 't3' };
          void queue.kick('task-1', 't2', () => {});
          return {
            status: 'conflict',
            server: { id: 'task-1', title: 'a', updatedAt: 'server-1' },
          };
        }
        sent.push(item.title);
        return { status: 'ok', server: { ...item, updatedAt: 'server-2' } };
      },
      onAck: async (_id, sentUpdatedAt, server) => {
        if (current.updatedAt === sentUpdatedAt) {
          current = { ...current, updatedAt: server.updatedAt };
        }
      },
      onConflict: async (_id, server) => {
        conflicts += 1;
        if (server) current = server;
      },
    });

    await queue.kick('task-1', 't0', () => {});

    expect(conflicts).toBe(0);
    expect(current.title).toBe('abc');
    expect(sent).toEqual(['a', 'abc']);
  });
});
