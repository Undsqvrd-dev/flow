import { describe, expect, it } from 'vitest';
import { dayKeyFromDate, weekOf } from '@/lib/dates';
import {
  meditationDate,
  meditationRitualKey,
  meditationStreak,
  shiftISO,
} from '@/lib/meditation';
import { taskFromRow, taskToRow, type TaskRow } from '@/lib/supabase/mappers';
import type { Task } from '@/lib/types';

const TODAY = '2026-10-19';

function med(date: string, done: boolean): Pick<Task, 'ritualKey' | 'done'> {
  return { ritualKey: meditationRitualKey(date), done };
}

function taskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    title: 'Mediteren',
    description: null,
    day_key: 'ma',
    daypart: null,
    rank: 0,
    goal_id: null,
    urgent: null,
    important: null,
    estimate_min: null,
    labels: [],
    done: false,
    completed_at: null,
    due_date: null,
    checklist: [],
    comments: [],
    from_previous_week: false,
    week_of: '2026-10-19',
    created_at: '2026-10-19T06:00:00.000Z',
    updated_at: '2026-10-19T06:00:00.000Z',
    ...overrides,
  };
}

describe('meditatie', () => {
  it('laat een open vandaag de streak van gisteren staan', () => {
    const stats = meditationStreak(
      [med('2026-10-17', true), med('2026-10-18', true), med(TODAY, false)],
      TODAY,
    );
    expect(stats).toEqual({ current: 2, longest: 2 });
  });

  it('telt vandaag mee zodra de taak afgevinkt is', () => {
    const stats = meditationStreak(
      [med('2026-10-18', true), med(TODAY, true)],
      TODAY,
    );
    expect(stats.current).toBe(2);
  });

  it('breekt de huidige reeks op een gemiste dag en onthoudt de langste', () => {
    const stats = meditationStreak(
      [
        med('2026-10-01', true),
        med('2026-10-02', true),
        med('2026-10-03', true),
        med('2026-10-04', true),
        med('2026-10-05', true),
        med('2026-10-18', true),
        med(TODAY, false),
      ],
      TODAY,
    );
    expect(stats).toEqual({ current: 1, longest: 5 });
  });

  it('negeert andere taken, toekomstige dagen en een meditatie zonder ritueel', () => {
    const stats = meditationStreak(
      [
        { ritualKey: null, done: true },
        { ritualKey: 'mediteren:geen-datum', done: true },
        med(shiftISO(TODAY, 1), true),
        med('2026-10-18', true),
      ],
      TODAY,
    );
    expect(meditationDate({ ritualKey: null })).toBeNull();
    expect(stats).toEqual({ current: 1, longest: 1 });
  });

  it('bewaart ritual_key in de sync-rij en laat hem weg als de taak er geen heeft', () => {
    const loaded = taskFromRow(taskRow({ ritual_key: meditationRitualKey(TODAY) }));
    expect(loaded.ritualKey).toBe('mediteren:2026-10-19');
    expect(loaded.updatedAt).toBe('2026-10-19T06:00:00.000Z');
    expect(taskToRow(loaded).ritual_key).toBe('mediteren:2026-10-19');

    const plain = taskFromRow(taskRow());
    expect(plain.ritualKey).toBeNull();
    expect(taskToRow(plain)).not.toHaveProperty('ritual_key');
  });

  it('legt vandaag op dezelfde dagkolom en week als de andere taken', () => {
    const monday = new Date(2026, 9, 19);
    const wednesday = new Date(2026, 9, 21);
    expect(dayKeyFromDate(monday)).toBe('ma');
    expect(weekOf(monday)).toBe('2026-10-19');
    expect(dayKeyFromDate(wednesday)).toBe('wo');
    expect(weekOf(wednesday)).toBe('2026-10-19');
    expect(meditationRitualKey('2026-10-21')).toBe('mediteren:2026-10-21');
  });
});
