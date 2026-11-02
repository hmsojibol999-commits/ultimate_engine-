import {
  blinkExpression,
  expireExpression,
  expressionForCue,
  idleExpression,
  unblinkExpression,
  type CharacterCue,
  type CharacterExpressionSnapshot,
} from './characterExpressionLogic';

export const IDLE_BLINK_MIN_MS = 4200;
export const IDLE_BLINK_MAX_MS = 6800;
export const IDLE_BLINK_DURATION_MS = 140;

export interface ExpressionScheduler {
  now: () => number;
  random: () => number;
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

const defaultScheduler: ExpressionScheduler = {
  now: () => Date.now(),
  random: () => Math.random(),
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Small event-driven controller. The desktop companion (C-05) starts/stops idle blinking when visible;
 * cue timers continue even while the character is hidden so a later mount sees the current real state.
 */
export class CharacterExpressionController {
  private snapshot: CharacterExpressionSnapshot;
  private readonly listeners = new Set<() => void>();
  private started = false;
  private reducedMotion = false;
  private moodTimer: unknown | null = null;
  private blinkTimer: unknown | null = null;
  private blinkResetTimer: unknown | null = null;

  constructor(private readonly scheduler: ExpressionScheduler = defaultScheduler) {
    this.snapshot = idleExpression(scheduler.now());
  }

  getSnapshot = (): CharacterExpressionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  cue(cue: CharacterCue): void {
    this.clearMoodTimer();
    this.clearBlinkTimers();
    const next = expressionForCue(cue, this.scheduler.now());
    this.publish(next);

    if (next.expiresAt !== null) {
      const expectedExpiry = next.expiresAt;
      this.moodTimer = this.scheduler.setTimeout(() => {
        this.moodTimer = null;
        if (this.snapshot.expiresAt !== expectedExpiry) return;
        this.returnToIdle();
      }, Math.max(0, expectedExpiry - this.scheduler.now()));
    }

    if (next.mood === 'idle') this.scheduleBlink();
  }

  /** Start the idle blink loop only while the character is mounted and motion is allowed. */
  start(reducedMotion = false): void {
    this.started = true;
    this.reducedMotion = reducedMotion;
    const current = expireExpression(this.snapshot, this.scheduler.now());
    if (current !== this.snapshot) this.publish(current);
    if (this.snapshot.blinking) this.publish(unblinkExpression(this.snapshot, this.scheduler.now()));
    this.scheduleBlink();
  }

  setReducedMotion(reducedMotion: boolean): void {
    if (this.reducedMotion === reducedMotion) return;
    this.reducedMotion = reducedMotion;
    if (reducedMotion) {
      this.clearBlinkTimers();
      if (this.snapshot.blinking) this.publish(unblinkExpression(this.snapshot, this.scheduler.now()));
      return;
    }
    this.scheduleBlink();
  }

  /** Stop only idle blinking; temporary real-event reactions still expire normally. */
  stop(): void {
    this.started = false;
    this.clearBlinkTimers();
    if (this.snapshot.blinking) this.publish(unblinkExpression(this.snapshot, this.scheduler.now()));
  }

  private returnToIdle(): void {
    this.clearMoodTimer();
    this.clearBlinkTimers();
    this.publish(idleExpression(this.scheduler.now()));
    this.scheduleBlink();
  }

  private scheduleBlink(): void {
    this.clearBlinkTimers();
    if (!this.started || this.reducedMotion || this.snapshot.mood !== 'idle') return;
    const sample = Math.max(0, Math.min(1, this.scheduler.random()));
    const delay = IDLE_BLINK_MIN_MS + Math.round(sample * (IDLE_BLINK_MAX_MS - IDLE_BLINK_MIN_MS));
    this.blinkTimer = this.scheduler.setTimeout(() => {
      this.blinkTimer = null;
      if (!this.started || this.reducedMotion || this.snapshot.mood !== 'idle') return;
      this.publish(blinkExpression(this.snapshot, this.scheduler.now()));
      this.blinkResetTimer = this.scheduler.setTimeout(() => {
        this.blinkResetTimer = null;
        if (!this.started || this.reducedMotion || this.snapshot.mood !== 'idle') return;
        this.publish(unblinkExpression(this.snapshot, this.scheduler.now()));
        this.scheduleBlink();
      }, IDLE_BLINK_DURATION_MS);
    }, delay);
  }

  private clearMoodTimer(): void {
    if (this.moodTimer === null) return;
    this.scheduler.clearTimeout(this.moodTimer);
    this.moodTimer = null;
  }

  private clearBlinkTimers(): void {
    if (this.blinkTimer !== null) this.scheduler.clearTimeout(this.blinkTimer);
    if (this.blinkResetTimer !== null) this.scheduler.clearTimeout(this.blinkResetTimer);
    this.blinkTimer = null;
    this.blinkResetTimer = null;
  }

  private publish(next: CharacterExpressionSnapshot): void {
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}
