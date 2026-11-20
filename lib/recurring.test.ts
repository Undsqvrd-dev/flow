import { describe, expect, it } from 'vitest';
import {
  activeWeekdays,
  openCardsOutsideSchedule,
  routineRunsOn,
  scheduleLabel,
  shouldEnsureLocalSport,
  spreadWeekdays,
} from '@/lib/recurring';

describe('schema van een routine', () => {
  it('spreidt N keer per week over vaste dagen', () => {
    expect(spreadWeekdays(1)).toEqual(['wo']);
    expect(spreadWeekdays(3)).toEqual(['ma', 'wo', 'vr']);
    expect(spreadWeekdays(5)).toEqual(['ma', 'di', 'wo', 'do', 'vr']);
    expect(spreadWeekdays(7)).toEqual(['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']);
  });

  it('beschrijft het schema in het Nederlands', () => {
    expect(scheduleLabel({ schedule: 'daily', weekdays: [], timesPerWeek: null })).toBe('Elke dag');
    expect(scheduleLabel({ schedule: 'weekdays', weekdays: ['do'], timesPerWeek: null })).toBe('Elke donderdag');
    expect(scheduleLabel({
      schedule: 'weekdays',
      weekdays: ['ma', 'do'],
      timesPerWeek: null,
    })).toBe('Elke maandag en donderdag');
    expect(scheduleLabel({
      schedule: 'times_per_week',
      weekdays: ['ma', 'wo', 'vr'],
      timesPerWeek: 3,
    })).toBe('3x per week (ma, wo, vr)');
  });

  it('laat een dagelijkse routine op elke datum lopen', () => {
    const daily = { schedule: 'daily' as const, weekdays: [] as const };
    expect(routineRunsOn(daily, '2026-11-19')).toBe(true);
    expect(activeWeekdays({ schedule: 'weekdays', weekdays: ['do', 'ma'] })).toEqual(['ma', 'do']);
  });
});

describe('open kaarten buiten het schema', () => {
  const tasks = [
    { id: 'done-past', done: true, ritualKey: 'sport:2026-11-16' },
    { id: 'open-past', done: false, ritualKey: 'sport:2026-11-17' },
    { id: 'done-today', done: true, ritualKey: 'sport:2026-11-19' },
    { id: 'open-today', done: false, ritualKey: 'sport:2026-11-19' },
    { id: 'open-future', done: false, ritualKey: 'sport:2026-11-20' },
    { id: 'open-match', done: false, ritualKey: 'sport:2026-11-23' },
    { id: 'other', done: false, ritualKey: 'mediteren:2026-11-20' },
  ];

  it('houdt afgevinkte en oudere kaarten en haalt open kaarten van vandaag en later weg', () => {
    expect(openCardsOutsideSchedule(tasks, 'sport', ['ma'], '2026-11-19').sort()).toEqual([
      'open-future',
      'open-today',
    ]);
  });

  it('laat een open kaart staan die nog op een gekozen dag valt', () => {
    expect(openCardsOutsideSchedule(tasks, 'sport', ['ma', 'vr'], '2026-11-19')).toEqual([
      'open-today',
    ]);
  });

  it('maakt geen lokale sporttaak als de routine weg of gepauzeerd is', () => {
    expect(shouldEnsureLocalSport('idle', [], '2026-11-19')).toBe(true);
    expect(shouldEnsureLocalSport('unavailable', [], '2026-11-19')).toBe(true);
    expect(shouldEnsureLocalSport('ready', [], '2026-11-19')).toBe(false);
    expect(shouldEnsureLocalSport('ready', [{
      ritualPrefix: 'sport',
      paused: true,
      schedule: 'daily',
      weekdays: [],
    }], '2026-11-19')).toBe(false);
    expect(shouldEnsureLocalSport('ready', [{
      ritualPrefix: 'sport',
      paused: false,
      schedule: 'weekdays',
      weekdays: ['do'],
    }], '2026-11-19')).toBe(true);
  });
});
