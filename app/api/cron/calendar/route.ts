import { NextResponse } from 'next/server';
import { syncAllCalendars } from '@/lib/calendar/syncJob';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get('authorization');
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Onbevoegd' }, { status: 401 });
  }
  try {
    const result = await syncAllCalendars();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cron mislukt';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
