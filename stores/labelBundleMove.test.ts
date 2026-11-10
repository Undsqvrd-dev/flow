import { beforeEach, describe, expect, it } from 'vitest';
import type { Task } from '@/lib/types';
import { useBoardStore } from './useBoardStore';

const stamp = '2026-10-19T06:00:00.000Z';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'dayKey' | 'rank'>): Task {
  return {
    title: partial.id,
    description: null,
    daypart: null,
    goalId: null,
    urgent: null,
    important: null,
    estimateMin: null,
    labels: ['lbl-persoonlijk'],
    done: false,
    completedAt: null,
    dueDate: null,
    checklist: [{ id: 'step-1', text: 'blijft', done: false, rank: 1000 }],
    comments: [],
    weekOf: '2026-10-19',
    createdAt: stamp,
    updatedAt: stamp,
    ritualKey: partial.id === 'mediteren' ? 'mediteren:2026-10-19' : null,
    ...partial,
  };
}

describe('moveLabelBundle', () => {
  beforeEach(() => {
    useBoardStore.setState({
      tasks: [
        task({ id: 'mediteren', dayKey: 'ma', rank: 1000 }),
        task({ id: 'mail', dayKey: 'ma', rank: 2000, labels: [] }),
        task({ id: 'sport', dayKey: 'ma', rank: 3000 }),
        task({ id: 'di-taak', dayKey: 'di', rank: 1000, labels: [], checklist: [] }),
      ],
      labelBundles: [{ id: 'b1', labelId: 'lbl-persoonlijk', taskIds: ['mediteren', 'sport'] }],
    });
  });

  it('zet het blok vóór een kaart en bewaart checklist-ids en ritual_key', () => {
    useBoardStore.getState().moveLabelBundle('b1', {
      dayKey: 'ma',
      daypart: null,
      weekOf: '2026-10-19',
      beforeId: 'mail',
      atStart: false,
    });
    const tasks = useBoardStore.getState().tasks;
    const order = tasks
      .filter((item) => item.dayKey === 'ma' && !item.done)
      .sort((a, b) => a.rank - b.rank)
      .map((item) => item.id);
    expect(order).toEqual(['mediteren', 'sport', 'mail']);
    const mediteren = tasks.find((item) => item.id === 'mediteren');
    expect(mediteren?.checklist.map((item) => item.id)).toEqual(['step-1']);
    expect(mediteren?.ritualKey).toBe('mediteren:2026-10-19');
    expect(useBoardStore.getState().labelBundles[0]?.taskIds).toEqual(['mediteren', 'sport']);
  });

  it('verhuist elke open taak naar de andere dag', () => {
    useBoardStore.getState().moveLabelBundle('b1', {
      dayKey: 'di',
      daypart: null,
      weekOf: '2026-10-19',
      beforeId: null,
      atStart: false,
    });
    const tasks = useBoardStore.getState().tasks;
    const moved = tasks.filter((item) => item.id === 'mediteren' || item.id === 'sport');
    expect(moved.map((item) => item.dayKey)).toEqual(['di', 'di']);
    expect(moved.map((item) => item.weekOf)).toEqual(['2026-10-19', '2026-10-19']);
    expect(tasks.find((item) => item.id === 'mail')?.dayKey).toBe('ma');
    expect(tasks.find((item) => item.id === 'di-taak')?.rank).toBeLessThan(
      tasks.find((item) => item.id === 'mediteren')!.rank,
    );
  });

  it('laat een bundel die al op die plek staat met rust', () => {
    useBoardStore.setState({
      tasks: [
        task({ id: 'mail', dayKey: 'ma', rank: 1000, labels: [] }),
        task({ id: 'mediteren', dayKey: 'ma', rank: 2000 }),
        task({ id: 'sport', dayKey: 'ma', rank: 3000 }),
      ],
    });
    const before = useBoardStore.getState().tasks.map((item) => item.updatedAt);
    useBoardStore.getState().moveLabelBundle('b1', {
      dayKey: 'ma',
      daypart: null,
      weekOf: '2026-10-19',
      beforeId: null,
      atStart: false,
    });
    expect(useBoardStore.getState().tasks.map((item) => item.updatedAt)).toEqual(before);
  });
});
