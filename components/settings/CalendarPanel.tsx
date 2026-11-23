'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadCalendarEvents } from '@/lib/calendar/client';

interface CalendarStatus {
  connected: boolean;
  unavailable?: boolean;
  email?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
  error?: string;
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function CalendarPanel() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch('/api/calendar/status');
    const text = await response.text();
    let body: CalendarStatus | null = null;
    try {
      body = text ? JSON.parse(text) as CalendarStatus : null;
    } catch {
      body = null;
    }
    if (response.status === 401) {
      setStatus({ connected: false });
      return;
    }
    if (!response.ok || !body) {
      setStatus({ connected: false, error: 'Status ophalen mislukt' });
      return;
    }
    setStatus(body);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('agenda') === 'gekoppeld') setMessage('Google Agenda is gekoppeld.');
    if (params.get('agenda') === 'fout') setMessage(params.get('reden') || 'Koppelen mislukt.');
    void refresh();
  }, []);

  async function syncNow() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/calendar/sync', { method: 'POST' });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Synchroniseren mislukt');
      await loadCalendarEvents();
      await refresh();
      setMessage('Agenda bijgewerkt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Synchroniseren mislukt');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/calendar/disconnect', { method: 'POST' });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Ontkoppelen mislukt');
      await loadCalendarEvents();
      await refresh();
      setMessage('Google Agenda is ontkoppeld.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ontkoppelen mislukt');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-4">Google Agenda</p>
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-txt-2">
          <Calendar size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber" />
          <span>
            {status?.connected
              ? `Gekoppeld als ${status.email ?? 'je Google-account'}. Afspraken van deze en volgende week komen alleen-lezen op het bord.`
              : 'Nog niet gekoppeld. Flow leest alleen de primaire agenda van steijn@facilityfinder.nl.'}
          </span>
        </p>
        {status?.lastSyncAt && (
          <p className="text-[12px] text-muted">Laatst gesynchroniseerd: {formatWhen(status.lastSyncAt)}</p>
        )}
        {status?.unavailable && (
          <p className="text-[12px] text-muted">De agendatabel ontbreekt nog. Draai migratie 014.</p>
        )}
        {(status?.lastError || status?.error) && (
          <p className="text-[12.5px] text-red">{status.lastError || status.error}</p>
        )}
        {message && <p className="text-[12.5px] text-txt-2">{message}</p>}
        <div className="flex flex-wrap gap-2">
          {status?.connected ? (
            <>
              <Button variant="primary" size="sm" disabled={busy} onClick={() => void syncNow()}>
                Nu synchroniseren
              </Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => void disconnect()}>
                Ontkoppelen
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => { window.location.href = '/api/calendar/connect'; }}>
              Koppel Google Agenda
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
