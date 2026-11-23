import { NextResponse } from 'next/server';
import { currentUserId } from '@/lib/calendar/http';
import { syncCalendarUser } from '@/lib/calendar/syncJob';

export const dynamic = 'force-dynamic';

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  try {
    const result = await syncCalendarUser(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synchroniseren mislukt';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
