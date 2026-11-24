import { createClient } from '@/lib/supabase/client';
import { useCalendarStore, type CalendarEvent } from '@/stores/useCalendarStore';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function calendarEventFromRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id ?? ''),
    googleEventId: String(row.google_event_id ?? ''),
    title: typeof row.title === 'string' ? row.title : '(zonder titel)',
    startsAt: text(row.starts_at),
    endsAt: text(row.ends_at),
    allDay: row.all_day === true,
    eventDate: String(row.event_date ?? ''),
    endDate: String(row.end_date ?? ''),
    location: text(row.location),
    meetLink: text(row.meet_link),
    htmlLink: text(row.html_link),
    status: typeof row.status === 'string' ? row.status : 'confirmed',
    done: row.done === true,
    sortOrder: typeof row.sort_order === 'number'
      ? row.sort_order
      : typeof row.sort_order === 'string' && row.sort_order !== ''
        ? Number(row.sort_order)
        : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
}

function missingTable(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? '';
  return error.code === '42P01' || error.code === 'PGRST205' || /calendar_events/i.test(message);
}

export async function loadCalendarEvents(): Promise<void> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('calendar_events').select('*');
    if (error) {
      if (missingTable(error)) {
        useCalendarStore.setState({ ready: false, unavailable: true, events: [] });
        return;
      }
      console.warn('[flow agenda] ophalen mislukt', error.message);
      return;
    }
    useCalendarStore.setState({
      ready: true,
      unavailable: false,
      events: (data ?? []).map((row) => calendarEventFromRow(row as Record<string, unknown>)),
    });
  } catch (error) {
    console.warn('[flow agenda] ophalen mislukt', error instanceof Error ? error.message : error);
  }
}

const SYNC_STALE_MS = 15 * 60 * 1000;
let calendarSyncing = false;
let lastCalendarSyncAttempt = 0;

export async function syncCalendarIfStale(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (calendarSyncing || Date.now() - lastCalendarSyncAttempt < SYNC_STALE_MS) return;
  calendarSyncing = true;
  lastCalendarSyncAttempt = Date.now();
  try {
    const statusResponse = await fetch('/api/calendar/status');
    const statusText = await statusResponse.text();
    let status: { connected?: boolean; lastSyncAt?: string | null } | null = null;
    try {
      status = statusText ? JSON.parse(statusText) as { connected?: boolean; lastSyncAt?: string | null } : null;
    } catch {
      status = null;
    }
    if (!statusResponse.ok || !status?.connected) return;
    const lastSync = status.lastSyncAt ? Date.parse(status.lastSyncAt) : 0;
    if (lastSync && Date.now() - lastSync < SYNC_STALE_MS) return;
    const syncResponse = await fetch('/api/calendar/sync', { method: 'POST' });
    if (syncResponse.ok) await loadCalendarEvents();
  } catch (error) {
    console.warn('[flow agenda] synchroniseren mislukt', error instanceof Error ? error.message : error);
  } finally {
    calendarSyncing = false;
  }
}

export async function saveCalendarSortOrders(orders: { id: string; sortOrder: number }[]): Promise<void> {
  if (orders.length === 0) return;
  const previous = useCalendarStore.getState().events;
  const nextOrder = new Map(orders.map((order) => [order.id, order.sortOrder]));
  useCalendarStore.setState({
    events: previous.map((event) => (
      nextOrder.has(event.id) ? { ...event, sortOrder: nextOrder.get(event.id) ?? event.sortOrder } : event
    )),
  });
  try {
    const supabase = createClient();
    const results = await Promise.all(orders.map((order) => (
      supabase.from('calendar_events').update({ sort_order: order.sortOrder }).eq('id', order.id)
    )));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  } catch (error) {
    useCalendarStore.setState({ events: previous });
    console.warn('[flow agenda] volgorde opslaan mislukt', error instanceof Error ? error.message : error);
  }
}

export async function toggleCalendarEvent(id: string, done: boolean): Promise<void> {
  const previous = useCalendarStore.getState().events;
  useCalendarStore.setState({
    events: previous.map((event) => (event.id === id ? { ...event, done } : event)),
  });
  try {
    const supabase = createClient();
    const { error } = await supabase.from('calendar_events').update({ done }).eq('id', id);
    if (error) throw error;
  } catch (error) {
    useCalendarStore.setState({ events: previous });
    console.warn('[flow agenda] afvinken mislukt', error instanceof Error ? error.message : error);
  }
}

