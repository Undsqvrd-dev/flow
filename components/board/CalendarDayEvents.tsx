'use client';

import { Calendar } from 'lucide-react';
import { eventsOnDate } from '@/lib/calendar/events';
import { toggleCalendarEvent } from '@/lib/calendar/client';
import type { CalendarEvent } from '@/stores/useCalendarStore';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { cn } from '@/lib/utils';

function clock(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function timeLabel(event: CalendarEvent): string {
  if (event.allDay) return 'Hele dag';
  const start = clock(event.startsAt);
  const end = clock(event.endsAt);
  if (start && end) return `${start}–${end}`;
  return start ?? 'Afspraak';
}

function CalendarEventCard({ event }: { event: CalendarEvent }) {
  const href = event.htmlLink || event.meetLink;
  return (
    <article
      className={cn(
        'rounded-card border border-amber/40 bg-amber/10 px-2.5 py-2',
        event.done && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={event.done}
          onChange={() => void toggleCalendarEvent(event.id, !event.done)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-(--amber)"
          aria-label="Afspraak afvinken"
        />
        <Calendar size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={cn('text-[13px] font-medium leading-snug text-txt', event.done && 'text-muted line-through')}>
            {event.title}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-txt-2">{timeLabel(event)}</p>
          {event.location && <p className="truncate text-[11px] text-muted">{event.location}</p>}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[11px] font-medium text-amber hover:underline"
            >
              Open in Google Agenda
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function CalendarDayEvents({ dateISO }: { dateISO: string }) {
  const events = useCalendarStore((state) => state.events);
  const items = eventsOnDate(events, dateISO);
  if (items.length === 0) return null;
  const allDay = items.filter((event) => event.allDay).sort((a, b) => a.title.localeCompare(b.title, 'nl'));
  const timed = items
    .filter((event) => !event.allDay)
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));

  return (
    <div className="flex flex-col gap-1.5">
      {allDay.length > 0 && (
        <>
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-amber">Hele dag</p>
          {allDay.map((event) => <CalendarEventCard key={`${event.id}:${dateISO}`} event={event} />)}
        </>
      )}
      {timed.map((event) => <CalendarEventCard key={event.id} event={event} />)}
    </div>
  );
}
