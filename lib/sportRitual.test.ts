import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planSportSessionSync, sportDate, sportRitualKey, SPORT_RITUAL_NOTE } from '@/lib/sportRitual';

describe('sportritueel', () => {
  it('herkent alleen een sportdatum', () => {
    expect(sportDate({ ritualKey: sportRitualKey('2026-11-09') })).toBe('2026-11-09');
    expect(sportDate({ ritualKey: 'mediteren:2026-11-09' })).toBeNull();
    expect(sportDate({ ritualKey: null })).toBeNull();
  });

  it('maakt een sessie bij afvinken en haalt die weg bij uitvinken', () => {
    const tasks = [{ ritualKey: sportRitualKey('2026-11-09'), done: true }];
    const added = planSportSessionSync(tasks, []);
    expect(added.addDates).toEqual(['2026-11-09']);

    const removed = planSportSessionSync(
      [{ ritualKey: sportRitualKey('2026-11-09'), done: false }],
      [{ id: 's1', date: '2026-11-09', note: SPORT_RITUAL_NOTE }],
    );
    expect(removed.removeIds).toEqual(['s1']);
    expect(removed.addDates).toEqual([]);
  });

  it('laat een handmatige sessie staan', () => {
    const plan = planSportSessionSync(
      [{ ritualKey: sportRitualKey('2026-11-09'), done: false }],
      [{ id: 'hand', date: '2026-11-09', note: null }],
    );
    expect(plan.removeIds).toEqual([]);
  });

  it('staat in migratie 009 als ochtendtaak naast de bestaande rituelen', () => {
    const sql = readFileSync('supabase/migrations/009_daily_sport.sql', 'utf8');
    expect(sql).toContain('sport:');
    expect(sql).toContain("'Sport'");
    expect(sql).toContain("'ochtend'");
    expect(sql).toContain('ensure_daily_meditation(p_date)');
    expect(sql).toContain('dagafsluiting:');
  });
});
