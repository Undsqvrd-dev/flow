import { afterEach, describe, expect, it } from 'vitest';
import {
  CHECKLIST_REPAIR_ATTEMPTS,
  checklistItemIsEditing,
  checklistRepairsPending,
  claimChecklistRepairs,
  repairChecklist,
  reorderChecklist,
  resetChecklistRepairState,
} from '@/lib/checklist';
import { isStaleWrite } from '@/lib/db/conflict';
import { taskFromRow, type TaskRow } from '@/lib/supabase/mappers';
import type { ChecklistItem } from '@/lib/types';

function ids(prefix = 'id') {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

function rawItems() {
  return [
    { text: 'Daan doorlezen', done: false },
    { text: 'Dennis doorlezen', done: false },
    { text: 'Hans doorlezen', done: true },
  ];
}

function row(checklist: unknown, updatedAt = '2026-10-12T10:00:00.000Z'): TaskRow {
  return {
    id: 'task-1',
    title: 'Opvolgen',
    description: null,
    day_key: 'ma',
    daypart: null,
    rank: 1000,
    goal_id: null,
    urgent: null,
    important: null,
    estimate_min: null,
    labels: [],
    done: false,
    completed_at: null,
    due_date: null,
    checklist: checklist as TaskRow['checklist'],
    comments: [],
    from_previous_week: false,
    week_of: '2026-10-12',
    created_at: '2026-10-12T08:00:00.000Z',
    updated_at: updatedAt,
  };
}

describe('checklist zonder id', () => {
  afterEach(() => {
    resetChecklistRepairState();
  });

  it('geeft elk item een eigen id en rank, stabiel bij een tweede keer laden', () => {
    const first = repairChecklist(rawItems(), { taskId: 'task-1', idFactory: ids(), track: false });
    const second = repairChecklist(rawItems(), {
      taskId: 'task-1',
      idFactory: () => {
        throw new Error('id werd opnieuw gegenereerd');
      },
      track: false,
    });

    expect(new Set(first.items.map((item) => item.id)).size).toBe(3);
    expect(first.items.map((item) => item.rank)).toEqual([1000, 2000, 3000]);
    expect(second.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(true);
  });

  it('laat bestaande id\'s en ranks staan en splitst een dubbele id', () => {
    const { items, changed } = repairChecklist(
      [
        { id: 'a', text: 'Eerste', done: false, rank: 1000 },
        { id: 'a', text: 'Tweede', done: true, rank: 2500 },
      ],
      { taskId: 'task-1', idFactory: ids(), track: false },
    );

    expect(changed).toBe(true);
    expect(items[0]).toMatchObject({ id: 'a', text: 'Eerste', rank: 1000 });
    expect(items[1].id).not.toBe('a');
    expect(items[1]).toMatchObject({ text: 'Tweede', done: true, rank: 2500 });
  });

  it('overschrijft bij een ontbrekende id de tekst van elk item, en na reparatie maar van één', () => {
    const broken = rawItems() as ChecklistItem[];
    const editingId = broken[0].id;
    const overwritten = broken.map((item) => (item.id === editingId ? { ...item, text: 'Alles hetzelfde' } : item));
    expect(overwritten.every((item) => item.text === 'Alles hetzelfde')).toBe(true);

    const repaired = repairChecklist(rawItems(), { taskId: 'task-1', idFactory: ids(), track: false }).items;
    const edited = repaired.map((item) =>
      item.id === repaired[0].id ? { ...item, text: 'Alleen de eerste' } : item,
    );
    expect(edited.map((item) => item.text)).toEqual([
      'Alleen de eerste',
      'Dennis doorlezen',
      'Hans doorlezen',
    ]);
    expect(repaired.filter((item) => checklistItemIsEditing(item.id, repaired[0].id))).toHaveLength(1);
    expect(broken.filter((item) => checklistItemIsEditing(item.id, editingId))).toHaveLength(0);
  });

  it('versleept één item zonder de andere teksten te mengen', () => {
    const items = repairChecklist(rawItems(), { taskId: 'task-1', idFactory: ids(), track: false }).items;
    const moved = reorderChecklist(items, items[2].id, items[0].id, false);

    expect(moved).not.toBeNull();
    expect(moved!.map((item) => item.text)).toEqual([
      'Hans doorlezen',
      'Daan doorlezen',
      'Dennis doorlezen',
    ]);
    expect(moved!.map((item) => item.id)).toEqual([items[2].id, items[0].id, items[1].id]);
    expect(moved!.map((item) => item.rank)).toEqual([1000, 2000, 3000]);
  });

  it('bewaart de serverversie, zodat een nieuwere rij de reparatie nog kan weigeren', () => {
    const loaded = taskFromRow(row(rawItems()));

    expect(loaded.checklist).toHaveLength(3);
    expect(new Set(loaded.checklist.map((item) => item.id)).size).toBe(3);
    expect(loaded.updatedAt).toBe('2026-10-12T10:00:00.000Z');
    expect(checklistRepairsPending().has('task-1')).toBe(true);
    expect(isStaleWrite(loaded.updatedAt, '2026-10-12T12:00:00.000Z')).toBe(true);

    const stored = repairChecklist(loaded.checklist, { taskId: loaded.id });
    expect(stored.changed).toBe(false);
    expect(checklistRepairsPending().has('task-1')).toBe(true);

    taskFromRow(row(loaded.checklist, '2026-10-12T12:00:00.000Z'));
    expect(checklistRepairsPending().has('task-1')).toBe(false);
  });

  it('schrijft een reparatie niet weg zolang dezelfde taak al onderweg is', () => {
    repairChecklist(rawItems(), { taskId: 'task-1', idFactory: ids() });
    expect(claimChecklistRepairs(new Set(['task-1']), CHECKLIST_REPAIR_ATTEMPTS)).toEqual([]);
    expect(checklistRepairsPending().has('task-1')).toBe(true);

    expect(claimChecklistRepairs(new Set(), CHECKLIST_REPAIR_ATTEMPTS)).toEqual(['task-1']);
    expect(claimChecklistRepairs(new Set(), CHECKLIST_REPAIR_ATTEMPTS)).toEqual(['task-1']);
    expect(claimChecklistRepairs(new Set(), CHECKLIST_REPAIR_ATTEMPTS)).toEqual(['task-1']);
    expect(claimChecklistRepairs(new Set(), CHECKLIST_REPAIR_ATTEMPTS)).toEqual([]);
    expect(checklistRepairsPending().has('task-1')).toBe(false);
  });
});
