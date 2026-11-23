import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { skipsAuth, googleAuthUrl } from '@/lib/calendar/authPaths';
import { eventsOnDate, mapGoogleEvent, reconcileCalendar } from '@/lib/calendar/events';
import { syncWindow } from '@/lib/calendar/time';

describe('agendavenster', () => {
  it('pakt deze en volgende week vanaf maandag in Amsterdam', () => {
    const window = syncWindow(new Date('2026-11-19T12:00:00.000Z'));
    expect(window.fromDate).toBe('2026-11-16');
    expect(window.toDate).toBe('2026-11-30');
    expect(window.timeMin).toBe('2026-11-15T23:00:00.000Z');
    expect(window.timeMax).toBe('2026-11-29T23:00:00.000Z');
  });
});

describe('Google-afspraak naar bordrij', () => {
  it('zet een afspraak met tijd op de Amsterdamse dag', () => {
    const mapped = mapGoogleEvent({
      id: 'evt-1',
      status: 'confirmed',
      summary: '  Standup ',
      location: 'Kantoor',
      htmlLink: 'https://calendar.google.com/event?eid=1',
      hangoutLink: 'https://meet.google.com/abc',
      start: { dateTime: '2026-11-19T09:00:00+01:00' },
      end: { dateTime: '2026-11-19T09:30:00+01:00' },
    });
    expect(mapped).toMatchObject({
      googleEventId: 'evt-1',
      title: 'Standup',
      allDay: false,
      eventDate: '2026-11-19',
      endDate: '2026-11-20',
      location: 'Kantoor',
      meetLink: 'https://meet.google.com/abc',
    });
    expect(mapped).not.toHaveProperty('dayKey');
  });

  it('spreidt een hele-dag-afspraak over de Google-dagen', () => {
    const mapped = mapGoogleEvent({
      id: 'day',
      summary: 'Vrij',
      start: { date: '2026-11-18' },
      end: { date: '2026-11-20' },
    });
    expect(mapped).toMatchObject({ allDay: true, eventDate: '2026-11-18', endDate: '2026-11-20' });
    expect(eventsOnDate(mapped ? [mapped] : [], '2026-11-18')).toHaveLength(1);
    expect(eventsOnDate(mapped ? [mapped] : [], '2026-11-19')).toHaveLength(1);
    expect(eventsOnDate(mapped ? [mapped] : [], '2026-11-20')).toHaveLength(0);
  });

  it('slaat afgezegde afspraken over', () => {
    expect(mapGoogleEvent({ id: 'gone', status: 'cancelled', start: { date: '2026-11-19' } })).toBeNull();
  });
});

describe('syncplan', () => {
  const window = { from: '2026-11-16', to: '2026-11-30' };

  it('werkt een verplaatste afspraak bij en verwijdert wat uit het venster is', () => {
    const mapped = mapGoogleEvent({
      id: 'move',
      summary: 'Later',
      start: { dateTime: '2026-11-20T15:00:00+01:00' },
      end: { dateTime: '2026-11-20T16:00:00+01:00' },
    });
    const plan = reconcileCalendar(
      mapped ? [mapped] : [],
      [
        { googleEventId: 'move', eventDate: '2026-11-18', endDate: '2026-11-19' },
        { googleEventId: 'cancel', eventDate: '2026-11-19', endDate: '2026-11-20' },
        { googleEventId: 'oud', eventDate: '2026-10-01', endDate: '2026-10-02' },
      ],
      window.from,
      window.to,
    );
    expect(plan.upsert.map((event) => event.googleEventId)).toEqual(['move']);
    expect(plan.upsert[0]?.eventDate).toBe('2026-11-20');
    expect(plan.deleteIds).toEqual(['cancel']);
  });
});

describe('oauth en migratie', () => {
  it('vraagt alleen leesrechten en de hint voor Steijn', () => {
    const url = new URL(googleAuthUrl({
      clientId: 'client',
      redirectUri: 'https://flow-ecru-three.vercel.app/api/calendar/callback',
      state: 'abc',
      loginHint: 'steijn@facilityfinder.nl',
    }));
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar.readonly');
    expect(url.searchParams.get('scope')).not.toContain('calendar.events');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('login_hint')).toBe('steijn@facilityfinder.nl');
  });

  it('laat de cron zonder sessie door en houdt het token van de client weg', () => {
    expect(skipsAuth('/api/cron/calendar')).toBe(true);
    expect(skipsAuth('/api/calendar/sync')).toBe(false);
    const sql = readFileSync('supabase/migrations/014_google_calendar.sql', 'utf8');
    expect(sql).toContain('calendar_connections');
    expect(sql).toContain('revoke all on table calendar_connections from public, anon, authenticated');
    expect(sql).toContain('calendar_events_lock_content');
    expect(sql).not.toMatch(/drop table tasks/i);
    expect(sql).toContain('refresh_token');
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: { path: string; schedule: string }[] };
    expect(vercel.crons).toEqual([{ path: '/api/cron/calendar', schedule: '0 6 * * *' }]);
  });
});
