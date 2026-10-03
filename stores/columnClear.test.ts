import { describe, expect, it } from 'vitest';
import type { Task } from '../lib/types';
import { weekOf } from '../lib/dates';
import { tasksClearedByColumn } from './useBoardStore';

const week = weekOf(new Date(2026, 9, 1, 12));
const completedAt = new Date(2026, 9, 1, 12).toISOString();

function task(partial: Partial<Task> & Pick<Task, 'id' | 'dayKey'>): Task {
  return {
    title: partial.id,
    description: null,
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
    weekOf: week,
    createdAt: completedAt,
    updatedAt: completedAt,
    ...partial,
  };
}

describe('tasksClearedByColumn', () => {
  const tasks = [
    task({ id: 'open-ma', dayKey: 'ma' }),
    task({ id: 'done-ma', dayKey: 'ma', done: true, completedAt }),
    task({ id: 'other-week', dayKey: 'ma', weekOf: '2026-09-21' }),
    task({ id: 'imported-gedaan', dayKey: 'gedaan', done: true, completedAt }),
  ];

  it('verwijdert open taken van die dag, niet afgeronde of een andere week', () => {
    expect(tasksClearedByColumn(tasks, 'ma', week).map((t) => t.id)).toEqual(['open-ma']);
  });

  it('leegt Gedaan: afgeronde taken van die week, ongeacht dayKey', () => {
    expect(tasksClearedByColumn(tasks, 'gedaan', week).map((t) => t.id).sort()).toEqual([
      'done-ma',
      'imported-gedaan',
    ]);
  });
});
