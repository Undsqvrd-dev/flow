import { describe, expect, it } from 'vitest';
import { createRowQueue } from '@/lib/db/rowQueue';

describe('schrijfwachtrij', () => {
  it('stuurt de tweede edit met de serverversie van de eerste, niet met een verse timestamp', async () => {
    const bases: Array<string | null> = [];
    let current = { id: 'task-1', updatedAt: '2026-10-12T10:00:00.000Z', dayKey: 'wo' };

    const queue = createRowQueue({
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

  it('vervangt een geweigerde schrijfactie door de nieuwere serverrij', async () => {
    let current = { id: 'task-1', updatedAt: '2026-10-12T11:00:00.000Z', dayKey: 'ma' };
    const server = { id: 'task-1', updatedAt: '2026-10-12T12:00:00.000Z', dayKey: 'di' };

    const queue = createRowQueue({
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
});
