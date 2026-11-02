import type { StringKey } from '../content/strings.en';

/** Boot sequence logic (F-21). Pure and testable; the UI lives in shell/Boot.tsx. */
export type BootStepId = 'init' | 'vfs' | 'modules' | 'ready';

export interface BootStep { id: BootStepId; key: StringKey; weight: number }

export const BOOT_STEPS: BootStep[] = [
  { id: 'init', key: 'boot.init', weight: 1 },
  { id: 'vfs', key: 'boot.vfs', weight: 2 },
  { id: 'modules', key: 'boot.modules', weight: 2 },
  { id: 'ready', key: 'boot.ready', weight: 1 },
];

export const BOOT_SEEN_KEY = 'sg.bootSeen';
/** First visit: about 2 seconds. Repeat visits: about 0.6 seconds. */
export const FIRST_BOOT_MS = 2000;
export const REPEAT_BOOT_MS = 600;

interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void }

export function hasBootedBefore(storage: KeyValueStore | undefined): boolean {
  try { return storage?.getItem(BOOT_SEEN_KEY) === '1'; } catch { return false; }
}

export function markBooted(storage: KeyValueStore | undefined): void {
  try { storage?.setItem(BOOT_SEEN_KEY, '1'); } catch { /* storage blocked: boot just stays long */ }
}

export const bootDuration = (repeat: boolean, reducedMotion: boolean): number =>
  reducedMotion ? 0 : repeat ? REPEAT_BOOT_MS : FIRST_BOOT_MS;

/**
 * Time (ms from start) at which each step line appears, spread by weight.
 * A step's line is shown only when the real work for it has finished (see `visibleSteps`),
 * so the text never claims something that has not happened.
 */
export function stepSchedule(totalMs: number, steps: BootStep[] = BOOT_STEPS): number[] {
  const total = steps.reduce((a, s) => a + s.weight, 0);
  let acc = 0;
  return steps.map((s) => { const at = Math.round((acc / total) * totalMs); acc += s.weight; return at; });
}

/**
 * Which step lines are visible now: the line's scheduled time has passed AND the real work
 * it describes is done (`done` lists finished step ids). 'init' and 'ready' need no real work
 * except that 'ready' also waits for every earlier step.
 */
export function visibleSteps(elapsedMs: number, schedule: number[], done: ReadonlySet<BootStepId>, steps: BootStep[] = BOOT_STEPS): BootStep[] {
  const out: BootStep[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const due = elapsedMs >= (schedule[i] ?? Infinity);
    const needsWork = step.id === 'vfs' || step.id === 'modules';
    const ready = !needsWork || done.has(step.id);
    if (!due || !ready) break; // keep lines in order; stop at the first one that is not ready
    out.push(step);
  }
  return out;
}

/** The boot screen can close once the time has passed and all real work is finished. */
export const bootFinished = (elapsedMs: number, totalMs: number, done: ReadonlySet<BootStepId>): boolean =>
  elapsedMs >= totalMs && done.has('vfs') && done.has('modules');
