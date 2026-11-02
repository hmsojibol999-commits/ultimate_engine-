/** Low-power auto-suggestion (F-04). Pure and testable; App.tsx shows the one-time notice. */
export const LOW_POWER_SUGGESTED_KEY = 'sg.lowPowerSuggested';
export const LOW_POWER_SUGGEST_DELAY_MS = 4000;

interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Real device signals only: 2 GB RAM or less, or 2 CPU cores or fewer. Unknown values never count as slow. */
export function isSlowDevice(nav: { deviceMemory?: number; hardwareConcurrency?: number } | undefined): boolean {
  if (!nav) return false;
  const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2;
  return lowMem || lowCpu;
}

/** True once per device: slow device, Low-power still off, never suggested before. Blocked storage means "no", so we never nag on every load. */
export function shouldShowLowPowerSuggestion(opts: { slow: boolean; lowPower: boolean; store: KeyValueStore | undefined }): boolean {
  if (!opts.slow || opts.lowPower || !opts.store) return false;
  try { return opts.store.getItem(LOW_POWER_SUGGESTED_KEY) === null; } catch { return false; }
}

export function markLowPowerSuggested(store: KeyValueStore | undefined): void {
  try { store?.setItem(LOW_POWER_SUGGESTED_KEY, '1'); } catch { /* storage blocked: nothing to do */ }
}
