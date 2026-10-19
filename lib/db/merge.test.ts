import { describe, it, expect } from 'vitest';
import { mergeRemoteData, itemsToPush, type MergeableStore } from './merge';
import type { Task, Goal } from '@/lib/types';

function makeTask(id: string, title: string, updatedAt: string): Task {
  return {
    id,
    title,
    description: null,
    dayKey: 'algemeen',
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
    createdAt: '2026-10-12T10:00:00Z',
    updatedAt,
  };
}

function makeGoal(id: string, title: string, updatedAt: string): Goal {
  return {
    id,
    title,
    scope: 'zakelijk',
    horizon: 'jaar',
    color: '#1F9254',
    targetValue: null,
    currentValue: 0,
    unit: null,
    deadline: null,
    active: true,
    rank: 1000,
    updatedAt,
  };
}

function emptyStore(): MergeableStore {
  return {
    tasks: [],
    goals: [],
    values: [],
    focuses: [],
    dayStates: [],
    pomodoroSessions: [],
  };
}

describe('mergeRemoteData', () => {
  it('behoudt remote items die lokaal ontbreken (nieuwe inserts)', () => {
    const local = emptyStore();
    const remote: MergeableStore = {
      ...emptyStore(),
      tasks: [makeTask('task-1', 'Remote taak', '2026-10-12T12:00:00Z')],
    };

    const merged = mergeRemoteData(local, remote);

    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0].title).toBe('Remote taak');
  });

  it('laat een lokale rij die de server niet heeft weg, zodat een delete blijft', () => {
    const local: MergeableStore = {
      ...emptyStore(),
      tasks: [makeTask('task-1', 'Lokaal spook', '2026-10-12T12:00:00Z')],
    };
    const remote = emptyStore();

    const merged = mergeRemoteData(local, remote);

    expect(merged.tasks).toHaveLength(0);
  });

  it('houdt een net aangemaakte lokale rij vast zolang die nog weggeschreven wordt', () => {
    const local: MergeableStore = {
      ...emptyStore(),
      tasks: [makeTask('task-new', 'Nog onderweg', '2026-10-12T12:00:00Z')],
    };

    const merged = mergeRemoteData(local, emptyStore(), { tasks: new Set(['task-new']) });

    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0].title).toBe('Nog onderweg');
  });

  it('gebruikt nieuwste versie bij conflict (remote nieuwer)', () => {
    const local: MergeableStore = {
      ...emptyStore(),
      tasks: [makeTask('task-1', 'Oude lokale titel', '2026-10-12T10:00:00Z')],
    };
    const remote: MergeableStore = {
      ...emptyStore(),
      tasks: [makeTask('task-1', 'Nieuwe remote titel', '2026-10-12T12:00:00Z')],
    };

    const merged = mergeRemoteData(local, remote);

    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0].title).toBe('Nieuwe remote titel');
  });

  it('gebruikt nieuwste versie bij conflict (lokaal nieuwer)', () => {
    const local: MergeableStore = {
      ...emptyStore(),
      tasks: [makeTask('task-1', 'Nieuwe lokale titel', '2026-10-12T14:00:00Z')],
    };
    const remote: MergeableStore = {
      ...emptyStore(),
      tasks: [makeTask('task-1', 'Oude remote titel', '2026-10-12T12:00:00Z')],
    };

    const merged = mergeRemoteData(local, remote);

    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0].title).toBe('Nieuwe lokale titel');
  });

  it('mergt meerdere entiteiten correct', () => {
    const local: MergeableStore = {
      ...emptyStore(),
      tasks: [
        makeTask('task-1', 'Lokaal oud', '2026-10-12T10:00:00Z'),
        makeTask('task-2', 'Alleen lokaal', '2026-10-12T11:00:00Z'),
      ],
      goals: [makeGoal('goal-1', 'Lokaal doel', '2026-10-12T10:00:00Z')],
    };
    const remote: MergeableStore = {
      ...emptyStore(),
      tasks: [
        makeTask('task-1', 'Remote nieuw', '2026-10-12T12:00:00Z'),
        makeTask('task-3', 'Alleen remote', '2026-10-12T13:00:00Z'),
      ],
      goals: [makeGoal('goal-1', 'Remote doel nieuwer', '2026-10-12T14:00:00Z')],
    };

    const merged = mergeRemoteData(local, remote);

    expect(merged.tasks).toHaveLength(2);
    expect(merged.tasks.find((t) => t.id === 'task-1')?.title).toBe('Remote nieuw');
    expect(merged.tasks.find((t) => t.id === 'task-2')).toBeUndefined();
    expect(merged.tasks.find((t) => t.id === 'task-3')?.title).toBe('Alleen remote');

    expect(merged.goals).toHaveLength(1);
    expect(merged.goals[0].title).toBe('Remote doel nieuwer');
  });
});

describe('itemsToPush', () => {
  it('retourneert items die lokaal nieuwer zijn dan remote', () => {
    const merged = [
      makeTask('task-1', 'Lokaal nieuwer', '2026-10-12T14:00:00Z'),
      makeTask('task-2', 'Remote nieuwer (skip)', '2026-10-12T10:00:00Z'),
    ];
    const remote = [
      makeTask('task-1', 'Oude remote', '2026-10-12T12:00:00Z'),
      makeTask('task-2', 'Nieuwere remote', '2026-10-12T12:00:00Z'),
    ];

    const toPush = itemsToPush(merged, remote);

    expect(toPush).toHaveLength(1);
    expect(toPush[0].id).toBe('task-1');
  });

  it('pusht geen lokale rij die de server niet heeft, anders herleeft een delete', () => {
    const merged = [makeTask('task-new', 'Verwijderd op de server', '2026-10-12T14:00:00Z')];
    const remote: Task[] = [];

    const toPush = itemsToPush(merged, remote);

    expect(toPush).toHaveLength(0);
  });

  it('retourneert lege array als alles al gesync is', () => {
    const merged = [makeTask('task-1', 'Zelfde', '2026-10-12T12:00:00Z')];
    const remote = [makeTask('task-1', 'Zelfde', '2026-10-12T14:00:00Z')];

    const toPush = itemsToPush(merged, remote);

    expect(toPush).toHaveLength(0);
  });
});
