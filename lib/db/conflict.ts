/** Ontbrekende lokale timestamps zijn ouder dan elke serverversie, zodat de server wint. */
export const UNKNOWN_UPDATED_AT = '1970-01-01T00:00:00.000Z';

export function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Een schrijfactie is verouderd wanneer de versie waarop zij is gebaseerd
 * strikt ouder is dan de rij die nu op de server staat.
 * Gelijk is toegestaan: dat is precies de versie die de client net gelezen heeft.
 */
export function isStaleWrite(baseUpdatedAt: string, serverUpdatedAt: string): boolean {
  return timestampMs(baseUpdatedAt) < timestampMs(serverUpdatedAt);
}
