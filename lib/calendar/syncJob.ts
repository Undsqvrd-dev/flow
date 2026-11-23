import { mapGoogleEvent, reconcileCalendar, type MappedCalendarEvent } from '@/lib/calendar/events';
import { listPrimaryEvents, refreshAccessToken } from '@/lib/calendar/google';
import { syncWindow } from '@/lib/calendar/time';
import { createAdminClient } from '@/lib/supabase/admin';

interface ConnectionRow {
  user_id: string;
  refresh_token: string;
}

function toRow(userId: string, event: MappedCalendarEvent) {
  return {
    user_id: userId,
    google_event_id: event.googleEventId,
    title: event.title,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    all_day: event.allDay,
    event_date: event.eventDate,
    end_date: event.endDate,
    location: event.location,
    meet_link: event.meetLink,
    html_link: event.htmlLink,
    status: event.status,
  };
}

export async function syncCalendarUser(userId: string, now = new Date()): Promise<{ upserted: number; deleted: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('calendar_connections')
    .select('user_id, refresh_token')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const connection = data as ConnectionRow | null;
  if (!connection?.refresh_token) throw new Error('Google Agenda is niet gekoppeld.');

  try {
    const window = syncWindow(now);
    const accessToken = await refreshAccessToken(connection.refresh_token);
    const remote = await listPrimaryEvents(accessToken, window.timeMin, window.timeMax);
    const mapped = remote
      .map((event) => mapGoogleEvent(event))
      .filter((event): event is MappedCalendarEvent => event !== null);

    const { data: stored, error: storedError } = await admin
      .from('calendar_events')
      .select('google_event_id, event_date, end_date')
      .eq('user_id', userId);
    if (storedError) throw new Error(storedError.message);

    const plan = reconcileCalendar(
      mapped,
      (stored ?? []).map((row) => ({
        googleEventId: String(row.google_event_id),
        eventDate: String(row.event_date),
        endDate: String(row.end_date),
      })),
      window.fromDate,
      window.toDate,
    );

    if (plan.upsert.length > 0) {
      const { error: upsertError } = await admin
        .from('calendar_events')
        .upsert(plan.upsert.map((event) => toRow(userId, event)), { onConflict: 'user_id,google_event_id' });
      if (upsertError) throw new Error(upsertError.message);
    }

    if (plan.deleteIds.length > 0) {
      const { error: deleteError } = await admin
        .from('calendar_events')
        .delete()
        .eq('user_id', userId)
        .in('google_event_id', plan.deleteIds);
      if (deleteError) throw new Error(deleteError.message);
    }

    await admin
      .from('calendar_connections')
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq('user_id', userId);

    return { upserted: plan.upsert.length, deleted: plan.deleteIds.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synchroniseren mislukt';
    await admin.from('calendar_connections').update({ last_error: message }).eq('user_id', userId);
    throw error;
  }
}

export async function syncAllCalendars(now = new Date()): Promise<{ users: number; failed: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('calendar_connections').select('user_id');
  if (error) throw new Error(error.message);
  let failed = 0;
  for (const row of data ?? []) {
    try {
      await syncCalendarUser(String(row.user_id), now);
    } catch (syncError) {
      failed += 1;
      console.error('[flow agenda] sync mislukt', syncError instanceof Error ? syncError.message : syncError);
    }
  }
  return { users: data?.length ?? 0, failed };
}
