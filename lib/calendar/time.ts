export const AGENDA_TIME_ZONE = 'Europe/Amsterdam';

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function addISODays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function zonedDateISO(instant: Date, timeZone = AGENDA_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return asUtc - instant.getTime();
}

/** Middernacht van een kalenderdag in `timeZone`, als UTC-instant. */
export function zonedMidnightUtc(dateISO: string, timeZone = AGENDA_TIME_ZONE): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = timeZoneOffsetMs(new Date(utcMidnight), timeZone);
  let utc = utcMidnight - offset;
  const offsetAt = timeZoneOffsetMs(new Date(utc), timeZone);
  if (offsetAt !== offset) utc = utcMidnight - offsetAt;
  return new Date(utc);
}

export interface SyncWindow {
  fromDate: string;
  toDate: string;
  timeMin: string;
  timeMax: string;
}

/** Deze week en volgende week, maandag 00:00 t/m de maandag er na (exclusief). */
export function syncWindow(now: Date, timeZone = AGENDA_TIME_ZONE): SyncWindow {
  const today = zonedDateISO(now, timeZone);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  const index = WEEKDAY_INDEX[weekday] ?? 0;
  const fromDate = addISODays(today, -index);
  const toDate = addISODays(fromDate, 14);
  return {
    fromDate,
    toDate,
    timeMin: zonedMidnightUtc(fromDate, timeZone).toISOString(),
    timeMax: zonedMidnightUtc(toDate, timeZone).toISOString(),
  };
}

export function rangesOverlap(start: string, end: string, from: string, to: string): boolean {
  return start < to && from < end;
}
