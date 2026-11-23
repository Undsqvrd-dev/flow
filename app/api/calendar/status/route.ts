import { NextResponse } from 'next/server';
import { currentUserId } from '@/lib/calendar/http';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ connected: false }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('calendar_connection_status');
  if (error) {
    const missing = error.code === 'PGRST202' || error.code === '42883' || /calendar_connection_status/i.test(error.message);
    if (missing) return NextResponse.json({ connected: false, unavailable: true });
    return NextResponse.json({ connected: false, error: error.message }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    email: row.google_email ?? null,
    connectedAt: row.connected_at ?? null,
    lastSyncAt: row.last_sync_at ?? null,
    lastError: row.last_error ?? null,
  });
}
