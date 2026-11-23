import { NextResponse } from 'next/server';
import { currentUserId } from '@/lib/calendar/http';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  const admin = createAdminClient();
  const events = await admin.from('calendar_events').delete().eq('user_id', userId);
  if (events.error) return NextResponse.json({ error: events.error.message }, { status: 500 });
  const connection = await admin.from('calendar_connections').delete().eq('user_id', userId);
  if (connection.error) return NextResponse.json({ error: connection.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
