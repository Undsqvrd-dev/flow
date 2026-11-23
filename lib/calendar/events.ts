import { addISODays, rangesOverlap, zonedDateISO, AGENDA_TIME_ZONE } from '@/lib/calendar/time';

export interface GoogleCalendarEvent {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
}

export interface MappedCalendarEvent {
  googleEventId: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  eventDate: string;
  endDate: string;
  location: string | null;
  meetLink: string | null;
  htmlLink: string | null;
  status: string;
}

export interface StoredCalendarRef {
  googleEventId: string;
  eventDate: string;
  endDate: string;
}

function meetLink(event: GoogleCalendarEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const video = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video' && entry.uri);
  return video?.uri ?? null;
}

export function mapGoogleEvent(
  event: GoogleCalendarEvent,
  timeZone = AGENDA_TIME_ZONE,
): MappedCalendarEvent | null {
  if (!event.id || event.status === 'cancelled') return null;
  const start = event.start ?? {};
  const end = event.end ?? {};
  const allDay = Boolean(start.date && !start.dateTime);
  const base = {
    googleEventId: event.id,
    title: event.summary?.trim() || '(zonder titel)',
    location: event.location?.trim() || null,
    meetLink: meetLink(event),
    htmlLink: event.htmlLink ?? null,
    status: event.status || 'confirmed',
  };

  if (allDay && start.date) {
    return {
      ...base,
      allDay: true,
      startsAt: null,
      endsAt: null,
      eventDate: start.date,
      endDate: end.date ?? addISODays(start.date, 1),
    };
  }

  if (!start.dateTime) return null;
  const eventDate = zonedDateISO(new Date(start.dateTime), timeZone);
  return {
    ...base,
    allDay: false,
    startsAt: new Date(start.dateTime).toISOString(),
    endsAt: end.dateTime ? new Date(end.dateTime).toISOString() : null,
    eventDate,
    endDate: addISODays(eventDate, 1),
  };
}

export function reconcileCalendar(
  mapped: readonly MappedCalendarEvent[],
  stored: readonly StoredCalendarRef[],
  fromDate: string,
  toDate: string,
): { upsert: MappedCalendarEvent[]; deleteIds: string[] } {
  const keep = new Set(mapped.map((event) => event.googleEventId));
  const deleteIds = stored
    .filter((event) => rangesOverlap(event.eventDate, event.endDate, fromDate, toDate) && !keep.has(event.googleEventId))
    .map((event) => event.googleEventId);
  return { upsert: [...mapped], deleteIds };
}

export function eventsOnDate<T extends { eventDate: string; endDate: string; status: string }>(
  events: readonly T[],
  dateISO: string,
): T[] {
  return events.filter(
    (event) => event.status !== 'cancelled' && event.eventDate <= dateISO && dateISO < event.endDate,
  );
}
