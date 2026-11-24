import { isClosingRitual } from '@/lib/closing';
import { boardEventsOnDate } from '@/lib/calendar/events';

export const AGENDA_DRAG_PREFIX = 'agenda:';

export function agendaDragId(eventId: string): string {
  return `${AGENDA_DRAG_PREFIX}${eventId}`;
}

export function parseAgendaDragId(id: string): string | null {
  return id.startsWith(AGENDA_DRAG_PREFIX) ? id.slice(AGENDA_DRAG_PREFIX.length) : null;
}

export interface MixedTask {
  id: string;
  rank: number;
  ritualKey?: string | null;
}

export interface MixedEvent {
  id: string;
  allDay: boolean;
  startsAt: string | null;
  sortOrder: number | null;
  title: string;
  eventDate: string;
  endDate: string;
  status: string;
}

export type DayCard<T extends MixedTask = MixedTask, E extends MixedEvent = MixedEvent> =
  | { kind: 'task'; id: string; task: T }
  | { kind: 'event'; id: string; event: E };

function byTime<E extends MixedEvent>(a: E, b: E): number {
  const start = (a.startsAt ?? '').localeCompare(b.startsAt ?? '');
  if (start !== 0) return start;
  return a.title.localeCompare(b.title, 'nl');
}

function isClosingCard<T extends MixedTask>(card: DayCard<T>): boolean {
  return card.kind === 'task' && isClosingRitual(card.task);
}

/** Hele-dag bovenaan, los van de sleepbare lijst. */
export function allDayOnDate<E extends MixedEvent>(events: readonly E[], dateISO: string): E[] {
  return boardEventsOnDate(events, dateISO)
    .filter((event) => event.allDay)
    .sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}

/**
 * Sleepbare kaarten van één dag.
 * Zonder handmatige positie staan afspraken op tijd, vóór de taken.
 * Een gevulde sortOrder deelt de schaal met task.rank.
 * Dagafsluiting blijft achteraan.
 */
export function mixedDayCards<T extends MixedTask, E extends MixedEvent>(
  tasks: readonly T[],
  events: readonly E[],
): DayCard<T, E>[] {
  const timed = events.filter((event) => !event.allDay);
  const loose = timed.filter((event) => event.sortOrder == null).sort(byTime);
  const pinned = timed.filter((event) => event.sortOrder != null);
  const closing = tasks.filter((task) => isClosingRitual(task));
  const normal = tasks.filter((task) => !isClosingRitual(task));
  const ranked: { rank: number; card: DayCard<T, E> }[] = [
    ...normal.map((task) => ({
      rank: task.rank,
      card: { kind: 'task' as const, id: task.id, task },
    })),
    ...pinned.map((event) => ({
      rank: event.sortOrder ?? 0,
      card: { kind: 'event' as const, id: agendaDragId(event.id), event },
    })),
  ];
  ranked.sort((a, b) => a.rank - b.rank || (a.card.kind === 'event' ? -1 : 1));

  return [
    ...loose.map((event) => ({ kind: 'event' as const, id: agendaDragId(event.id), event })),
    ...ranked.map((row) => row.card),
    ...closing.map((task) => ({ kind: 'task' as const, id: task.id, task })),
  ];
}

function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function sameOrder<T extends MixedTask, E extends MixedEvent>(
  left: readonly DayCard<T, E>[],
  right: readonly DayCard<T, E>[],
): boolean {
  return left.length === right.length && left.every((card, index) => card.id === right[index]?.id);
}

function withClosingLast<T extends MixedTask, E extends MixedEvent>(
  cards: readonly DayCard<T, E>[],
): DayCard<T, E>[] {
  return [
    ...cards.filter((card) => !isClosingCard(card)),
    ...cards.filter((card) => isClosingCard(card)),
  ];
}

/** Herorden binnen de dag. Een id van een andere dag geeft null. */
export function reorderDayCards<T extends MixedTask, E extends MixedEvent>(
  cards: readonly DayCard<T, E>[],
  activeId: string,
  overId: string,
): DayCard<T, E>[] | null {
  const body = cards.filter((card) => !isClosingCard(card));
  const from = body.findIndex((card) => card.id === activeId);
  if (from < 0) return null;
  const overIsClosing = cards.some((card) => card.id === overId && isClosingCard(card));
  const to = overIsClosing ? body.length - 1 : body.findIndex((card) => card.id === overId);
  if (to < 0 || to === from) return null;
  const next = withClosingLast([...arrayMove(body, from, to), ...cards.filter((card) => isClosingCard(card))]);
  return sameOrder(cards, next) ? null : next;
}

/** Zet een kaart (ook van een andere dag) op een plek in deze dag. */
export function insertDayCard<T extends MixedTask, E extends MixedEvent>(
  cards: readonly DayCard<T, E>[],
  card: DayCard<T, E>,
  overId: string | null,
): DayCard<T, E>[] | null {
  const body = cards.filter((item) => !isClosingCard(item) && item.id !== card.id);
  const closing = cards.filter((item) => isClosingCard(item) && item.id !== card.id);
  const nextBody = [...body];
  if (!overId) nextBody.push(card);
  else {
    const index = nextBody.findIndex((item) => item.id === overId);
    nextBody.splice(index < 0 ? nextBody.length : index, 0, card);
  }
  const next = isClosingCard(card) ? [...nextBody, card, ...closing] : [...nextBody, ...closing];
  return sameOrder(cards, next) ? null : next;
}

export function ranksForOrder<T extends MixedTask, E extends MixedEvent>(
  cards: readonly DayCard<T, E>[],
): { tasks: { id: string; rank: number }[]; events: { id: string; sortOrder: number }[] } {
  const tasks: { id: string; rank: number }[] = [];
  const events: { id: string; sortOrder: number }[] = [];
  cards.forEach((card, index) => {
    const rank = (index + 1) * 1000;
    if (card.kind === 'task') tasks.push({ id: card.task.id, rank });
    else events.push({ id: card.event.id, sortOrder: rank });
  });
  return { tasks, events };
}
