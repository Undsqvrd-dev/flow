import { describe, expect, it } from 'vitest';
import { applyDelete, applyUpsert } from '@/lib/db/applyRemote';
import { isStaleWrite } from '@/lib/db/conflict';
import type { Task } from '@/lib/types';

function task(id: string, dayKey: Task['dayKey'], updatedAt: string): Task {
  return {
    id,
    title: 'Bellen',
    description: null,
    dayKey,
    daypart: null,
    rank: 1000,
    goalId: null,
    urgent: null,
    important: null,
    estimateMin: null,
    labels: [],
    done: false,
    completedAt: null,
    dueDate: null,
    checklist: [],
    comments: [],
    weekOf: '2026-10-12',
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt,
  };
}

describe('externe wijziging blijft staan', () => {
  const serverAfterSql = '2026-10-12T12:00:00.000Z';
  const openTabBase = '2026-10-12T10:00:00.000Z';

  it('weigert een open tab die day_key terugzet op basis van een oudere versie', () => {
    expect(isStaleWrite(openTabBase, serverAfterSql)).toBe(true);
  });

  it('staat een wijziging toe die op de huidige serverversie is gebaseerd', () => {
    expect(isStaleWrite(serverAfterSql, serverAfterSql)).toBe(false);
  });

  it('toont een externe UPDATE op een open client en bewaart een externe INSERT', () => {
    const openClient = [task('task-1', 'ma', openTabBase)];
    const moved = task('task-1', 'di', serverAfterSql);
    const inserted = task('task-2', 'dump', '2026-10-12T12:05:00.000Z');

    const afterUpdate = applyUpsert(openClient, moved, (item) => item.id, new Set());
    const afterInsert = applyUpsert(afterUpdate, inserted, (item) => item.id, new Set());

    expect(afterInsert.find((item) => item.id === 'task-1')?.dayKey).toBe('di');
    expect(afterInsert.find((item) => item.id === 'task-2')?.dayKey).toBe('dump');
  });

  it('haalt een externe delete uit de open client', () => {
    const openClient = [task('task-1', 'di', serverAfterSql), task('task-2', 'ma', openTabBase)];
    const next = applyDelete(openClient, 'task-2', (item) => item.id);
    expect(next.map((item) => item.id)).toEqual(['task-1']);
  });

  it('overschrijft een edit die nog weggeschreven wordt niet met een echo', () => {
    const editing = [task('task-1', 'wo', '2026-10-12T12:10:00.000Z')];
    const echo = task('task-1', 'di', serverAfterSql);
    const next = applyUpsert(editing, echo, (item) => item.id, new Set(['task-1']));
    expect(next[0]?.dayKey).toBe('wo');
  });
});
