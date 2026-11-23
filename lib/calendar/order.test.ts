import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  agendaDragId,
  insertDayCard,
  mixedDayCards,
  ranksForOrder,
  reorderDayCards,
  type MixedEvent,
  type MixedTask,
} from '@/lib/calendar/order';

function task(id: string, rank: number, ritualKey: string | null = null): MixedTask {
  return { id, rank, ritualKey };
}

function event(partial: Partial<MixedEvent> & Pick<MixedEvent, 'id'>): MixedEvent {
  return {
    title: partial.id,
    allDay: false,
    startsAt: '2026-11-19T09:00:00.000Z',
    sortOrder: null,
    eventDate: '2026-11-19',
    endDate: '2026-11-20',
    status: 'confirmed',
    ...partial,
  };
}

describe('volgorde van taken en afspraken', () => {
  it('zet afspraken zonder positie op tijd vóór de taken', () => {
    const cards = mixedDayCards(
      [task('later', 1000), task('eerder', 2000)],
      [
        event({ id: 'middag', startsAt: '2026-11-19T13:00:00.000Z' }),
        event({ id: 'ochtend', startsAt: '2026-11-19T08:00:00.000Z' }),
      ],
    );
    expect(cards.map((card) => card.id)).toEqual([
      agendaDragId('ochtend'),
      agendaDragId('middag'),
      'later',
      'eerder',
    ]);
  });

  it('zet een handmatige positie tussen de taken en laat hele-dag erbuiten', () => {
    const cards = mixedDayCards(
      [task('a', 1000), task('b', 3000)],
      [
        event({ id: 'dag', allDay: true, startsAt: null }),
        event({ id: 'ertussen', sortOrder: 2000, startsAt: '2026-11-19T15:00:00.000Z' }),
      ],
    );
    expect(cards.map((card) => card.id)).toEqual(['a', agendaDragId('ertussen'), 'b']);
  });

  it('houdt dagafsluiting achteraan', () => {
    const cards = mixedDayCards(
      [task('slot', 10, 'dagafsluiting:2026-11-19'), task('werk', 1000)],
      [event({ id: 'call', sortOrder: 50 })],
    );
    expect(cards.map((card) => card.id)).toEqual([agendaDragId('call'), 'werk', 'slot']);
  });

  it('herordent een afspraak binnen de dag en geeft iedereen een positie', () => {
    const cards = mixedDayCards(
      [task('a', 1000), task('b', 2000)],
      [event({ id: 'call', startsAt: '2026-11-19T09:00:00.000Z' })],
    );
    const next = reorderDayCards(cards, agendaDragId('call'), 'b');
    expect(next?.map((card) => card.id)).toEqual(['a', 'b', agendaDragId('call')]);
    expect(ranksForOrder(next ?? []).events).toEqual([{ id: 'call', sortOrder: 3000 }]);
    expect(ranksForOrder(next ?? []).tasks.map((item) => item.rank)).toEqual([1000, 2000]);
  });

  it('zet een kaart die op de dagafsluiting landt ervóór', () => {
    const cards = mixedDayCards(
      [task('slot', 1, 'dagafsluiting:2026-11-19'), task('werk', 1000), task('extra', 3000)],
      [event({ id: 'call', sortOrder: 2000 })],
    );
    const next = reorderDayCards(cards, 'werk', 'slot');
    expect(next?.map((card) => card.id)).toEqual([
      agendaDragId('call'),
      'extra',
      'werk',
      'slot',
    ]);
  });

  it('weigert een afspraak naar een kaart buiten deze dag', () => {
    const cards = mixedDayCards([task('a', 1000)], [event({ id: 'call' })]);
    expect(reorderDayCards(cards, agendaDragId('call'), 'andere-dag')).toBeNull();
  });

  it('zet een taak van een andere dag tussen de afspraken', () => {
    const cards = mixedDayCards(
      [task('blijft', 1000)],
      [event({ id: 'call', sortOrder: 2000 })],
    );
    const incoming = { kind: 'task' as const, id: 'bezoek', task: task('bezoek', 9000) };
    const next = insertDayCard(cards, incoming, agendaDragId('call'));
    expect(next?.map((card) => card.id)).toEqual(['blijft', 'bezoek', agendaDragId('call')]);
  });
});

describe('positie overleeft de sync', () => {
  it('schrijft sort_order niet mee in de Google-upsert en laat de client hem wel wijzigen', () => {
    const sync = readFileSync('lib/calendar/syncJob.ts', 'utf8');
    const upsert = sync.slice(sync.indexOf('function toRow'), sync.indexOf('export async function syncCalendarUser'));
    expect(upsert).not.toContain('sort_order');
    const sql = readFileSync('supabase/migrations/015_calendar_sort_order.sql', 'utf8');
    expect(sql).toContain('add column if not exists sort_order');
    expect(sql).not.toContain('NEW.sort_order := OLD.sort_order');
    expect(sql).toContain('NEW.title := OLD.title');
    expect(sql).not.toMatch(/drop table tasks/i);
  });
});
