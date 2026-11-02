// Pure helpers for the Task manager (F-23). Real measurements only: nothing here invents a number.
// Anything the browser does not expose returns null, and the UI says "not available" instead of faking it.

export type FpsLevel = 'good' | 'ok' | 'low';

/** Rolling frames-per-second meter. Feed it requestAnimationFrame timestamps (ms). */
export class FpsMeter {
  private stamps: number[] = [];
  constructor(private windowMs = 1000) {}

  push(now: number): void {
    this.stamps.push(now);
    const cut = now - this.windowMs;
    while (this.stamps.length > 2 && (this.stamps[0] ?? now) < cut) this.stamps.shift();
  }

  /** Frames per second over the window, or null until at least two frames were seen. */
  fps(): number | null {
    const n = this.stamps.length;
    if (n < 2) return null;
    const span = (this.stamps[n - 1] ?? 0) - (this.stamps[0] ?? 0);
    if (span <= 0) return null;
    return Math.round(((n - 1) / span) * 1000);
  }

  reset(): void { this.stamps = []; }
}

export function fpsLevel(fps: number | null): FpsLevel | null {
  if (fps === null) return null;
  if (fps >= 50) return 'good';
  if (fps >= 30) return 'ok';
  return 'low';
}

/** 1536 -> "1.5 KB". Uses 1024 steps. Negative or non-finite input becomes "0 B". */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${i === 0 ? Math.round(v) : v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

/** Whole-number percentage clamped to 0..100. Returns null when the total is unknown or zero. */
export function percent(used: number, total: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}

export interface MemoryInfo { used: number; limit: number }

/** JS heap size, only on browsers that expose performance.memory (Chromium). Otherwise null. */
export function readMemory(perf: unknown): MemoryInfo | null {
  const m = (perf as { memory?: { usedJSHeapSize?: unknown; jsHeapSizeLimit?: unknown } } | null | undefined)?.memory;
  if (!m || typeof m.usedJSHeapSize !== 'number' || typeof m.jsHeapSizeLimit !== 'number') return null;
  if (!(m.jsHeapSizeLimit > 0)) return null;
  return { used: m.usedJSHeapSize, limit: m.jsHeapSizeLimit };
}

export interface StorageInfo { used: number; quota: number; percent: number | null }

/** From navigator.storage.estimate(). Null when the browser gave no usable numbers. */
export function readStorage(est: { usage?: unknown; quota?: unknown } | null | undefined): StorageInfo | null {
  if (!est || typeof est.usage !== 'number' || typeof est.quota !== 'number') return null;
  return { used: est.usage, quota: est.quota, percent: percent(est.usage, est.quota) };
}

/** True when the app should keep measuring: its window is visible and the tab is in the foreground. */
export function shouldSample(opts: { minimized: boolean; hiddenOnMobile: boolean; tabHidden: boolean }): boolean {
  return !opts.minimized && !opts.hiddenOnMobile && !opts.tabHidden;
}
