'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import { useSortable, type useSortable as UseSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Trash2 } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { allDayOnDate, agendaDragId } from '@/lib/calendar/order';
import { dismissCalendarEvent, toggleCalendarEvent } from '@/lib/calendar/client';
import { deleteMenuStep } from '@/lib/cardMenu';
import { ContextMenuItem, ContextMenuSurface } from '@/components/ui/context-menu';
import type { CalendarEvent } from '@/stores/useCalendarStore';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { cn, isMobileViewport } from '@/lib/utils';

type Drag = Pick<ReturnType<typeof UseSortable>, 'attributes' | 'listeners' | 'setNodeRef' | 'transform' | 'transition' | 'isDragging'>;

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

function stopDrag(event: SyntheticEvent) {
  event.stopPropagation();
}

function AgendaCardBody({ event, drag }: { event: CalendarEvent; drag: Drag | null }) {
  const href = event.htmlLink || event.meetLink;
  const [leaving, setLeaving] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  function checkOff() {
    if (leaving || event.done) return;
    setLeaving(true);
    window.setTimeout(() => void toggleCalendarEvent(event.id, true), 160);
  }

  return (
    <div className={cn('transition-all duration-150', leaving && 'pointer-events-none scale-[0.98] opacity-0')}>
    <article
      ref={drag?.setNodeRef}
      style={drag ? { transform: CSS.Transform.toString(drag.transform), transition: drag.transition } : undefined}
      {...(drag?.attributes as DraggableAttributes | undefined)}
      {...drag?.listeners}
      onContextMenu={(native) => {
        native.preventDefault();
        native.stopPropagation();
        if (isMobileViewport()) return;
        setMenu({ x: native.clientX, y: native.clientY });
      }}
      className={cn(
        'rounded-card border border-amber/40 bg-amber/10 px-2.5 py-2',
        event.done && 'opacity-60',
        drag && 'cursor-grab touch-none active:cursor-grabbing',
        drag?.isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={event.done || leaving}
          onPointerDown={stopDrag}
          onClick={stopDrag}
          onChange={checkOff}
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
              onPointerDown={stopDrag}
              onClick={stopDrag}
              className="mt-1 inline-block text-[11px] font-medium text-amber hover:underline"
            >
              Open in Google Agenda
            </a>
          )}
        </div>
      </div>
    </article>
    {menu && (
      <AgendaContextMenu
        x={menu.x}
        y={menu.y}
        onClose={() => setMenu(null)}
        onDismiss={() => void dismissCalendarEvent(event.id)}
      />
    )}
    </div>
  );
}

function AgendaContextMenu({
  x,
  y,
  onClose,
  onDismiss,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <ContextMenuSurface x={x} y={y} onClose={onClose}>
      <ContextMenuItem
        danger
        onSelect={() => {
          const step = deleteMenuStep(confirmDelete);
          if (!step.remove) {
            setConfirmDelete(true);
            return;
          }
          onDismiss();
          onClose();
        }}
      >
        <Trash2 size={14} strokeWidth={1.75} />
        {confirmDelete ? 'Zeker weten?' : 'Verwijderen'}
      </ContextMenuItem>
    </ContextMenuSurface>
  );
}

export function CalendarEventCard({ event, sortable = false }: { event: CalendarEvent; sortable?: boolean }) {
  if (!sortable) return <AgendaCardBody event={event} drag={null} />;
  return <SortableAgendaCard event={event} />;
}

function SortableAgendaCard({ event }: { event: CalendarEvent }) {
  const drag = useSortable({ id: agendaDragId(event.id) });
  return <AgendaCardBody event={event} drag={drag} />;
}

export function AllDayEvents({ dateISO }: { dateISO: string }) {
  const events = useCalendarStore((state) => state.events);
  const items = allDayOnDate(events, dateISO);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-amber">Hele dag</p>
      {items.map((event) => <CalendarEventCard key={`${event.id}:${dateISO}`} event={event} />)}
    </div>
  );
}
