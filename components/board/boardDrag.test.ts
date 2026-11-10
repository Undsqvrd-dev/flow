import { describe, expect, it } from 'vitest';
import type { Task } from '@/lib/types';
import { resolveLabelBundleDrop } from './boardDrag';
import { sectionId } from '@/lib/sectionDrop';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: partial.id,
    description: null,
    dayKey: 'ma',
    daypart: null,
    rank: 1000,
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
    createdAt: '2026-10-19T06:00:00.000Z',
    updatedAt: '2026-10-19T06:00:00.000Z',
    ...partial,
  };
}

const bundles = [{ id: 'b1', labelId: 'lbl-persoonlijk', taskIds: ['mediteren', 'sport'] }];

describe('resolveLabelBundleDrop', () => {
  const tasks = [
    task({ id: 'mediteren', rank: 1000 }),
    task({ id: 'mail', rank: 2000, labels: [] }),
    task({ id: 'sport', rank: 3000 }),
    task({ id: 'di-taak', dayKey: 'di', weekOf: '2026-10-19', rank: 1000, labels: [] }),
  ];

  it('laat een sleep op de eigen kop of een eigen kaart liggen', () => {
    expect(resolveLabelBundleDrop('b1', 'lbm:b1', tasks, bundles).type).toBe('skip');
    expect(resolveLabelBundleDrop('b1', 'lb:b1', tasks, bundles).type).toBe('skip');
    expect(resolveLabelBundleDrop('b1', 'sport', tasks, bundles).type).toBe('skip');
  });

  it('zet het blok vóór een andere kaart, of achteraan een andere dag', () => {
    expect(resolveLabelBundleDrop('b1', 'mail', tasks, bundles)).toMatchObject({
      type: 'place',
      dayKey: 'ma',
      beforeId: 'mail',
      atStart: false,
    });
    expect(resolveLabelBundleDrop('b1', sectionId('di', null, '2026-10-19'), tasks, bundles)).toMatchObject({
      type: 'place',
      dayKey: 'di',
      weekOf: '2026-10-19',
      beforeId: null,
      atStart: false,
    });
  });

  it('landt vóór het eerste lid van een andere bundel', () => {
    const extra = [
      ...tasks,
      task({ id: 'bel', rank: 4000, labels: ['lbl-werk'] }),
      task({ id: 'mail2', rank: 5000, labels: ['lbl-werk'] }),
    ];
    const groups = [
      ...bundles,
      { id: 'b2', labelId: 'lbl-werk', taskIds: ['bel', 'mail2'] },
    ];
    expect(resolveLabelBundleDrop('b1', 'mail2', extra, groups)).toMatchObject({
      type: 'place',
      beforeId: 'bel',
    });
    expect(resolveLabelBundleDrop('b1', 'lb:b2', extra, groups)).toMatchObject({
      type: 'place',
      beforeId: 'bel',
    });
  });

  it('vinkt het blok af als het op Gedaan valt', () => {
    expect(resolveLabelBundleDrop('b1', sectionId('gedaan', null, '2026-10-19'), tasks, bundles)).toEqual({
      type: 'done',
    });
  });
});
