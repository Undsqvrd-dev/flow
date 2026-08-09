let ready = false;

export function markSyncReady(value: boolean): void {
  ready = value;
}

/** Sync pas na geslaagde bootstrap (remote geladen of gemigreerd). */
export function syncEnabled(): boolean {
  return ready;
}
