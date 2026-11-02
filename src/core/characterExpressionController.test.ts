import { describe, it, expect } from 'vitest';
import {
  CharacterExpressionController,
  IDLE_BLINK_DURATION_MS,
  IDLE_BLINK_MAX_MS,
  IDLE_BLINK_MIN_MS,
  type ExpressionScheduler,
} from './characterExpressionController';

class FakeScheduler implements ExpressionScheduler {
  time = 0;
  randomValue = 0.5;
  private seq = 0;
  private tasks = new Map<number, { at: number; callback: () => void }>();

  now = (): number => this.time;
  random = (): number => this.randomValue;
  setTimeout = (callback: () => void, delayMs: number): unknown => {
    const id = ++this.seq;
    this.tasks.set(id, { at: this.time + delayMs, callback });
    return id;
  };
  clearTimeout = (handle: unknown): void => { this.tasks.delete(handle as number); };

  get delays(): number[] { return [...this.tasks.values()].map((t) => t.at - this.time); }

  advance(ms: number): void {
    const end = this.time + ms;
    while (true) {
      const next = [...this.tasks.entries()]
        .filter(([, task]) => task.at <= end)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      const [id, task] = next;
      this.time = task.at;
      this.tasks.delete(id);
      task.callback();
    }
    this.time = end;
  }
}

describe('CharacterExpressionController event reactions', () => {
  it('shows the latest event and returns short reactions to idle', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.cue('error');
    expect(controller.getSnapshot().mood).toBe('worried');
    clock.advance(500);
    controller.cue('success');
    expect(controller.getSnapshot().mood).toBe('proud');
    clock.advance(2100);
    expect(controller.getSnapshot().mood).toBe('idle');
  });

  it('does not let an old timeout clear a newer reaction', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.cue('app-opened');
    clock.advance(200);
    controller.cue('error');
    clock.advance(1200);
    expect(controller.getSnapshot().mood).toBe('worried');
    clock.advance(1400);
    expect(controller.getSnapshot().mood).toBe('idle');
  });

  it('keeps thinking indefinitely until a later cue replaces it', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.cue('thinking');
    clock.advance(60000);
    expect(controller.getSnapshot().mood).toBe('thinking');
    controller.cue('answered');
    expect(controller.getSnapshot().mood).toBe('happy');
  });

  it('notifies subscribers when the expression changes', () => {
    const controller = new CharacterExpressionController(new FakeScheduler());
    let updates = 0;
    const off = controller.subscribe(() => { updates += 1; });
    controller.cue('success');
    off();
    controller.cue('idle');
    expect(updates).toBe(1);
  });
});

describe('CharacterExpressionController idle blinking', () => {
  it('blinks on an irregular idle interval and restores the eyes', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.start();
    expect(clock.delays[0]).toBeGreaterThanOrEqual(IDLE_BLINK_MIN_MS);
    expect(clock.delays[0]).toBeLessThanOrEqual(IDLE_BLINK_MAX_MS);
    clock.advance(clock.delays[0]!);
    expect(controller.getSnapshot().blinking).toBe(true);
    expect(controller.getSnapshot().face.eyes).toBe('blink');
    clock.advance(IDLE_BLINK_DURATION_MS);
    expect(controller.getSnapshot().blinking).toBe(false);
    expect(controller.getSnapshot().face.eyes).toBe('open');
    expect(clock.delays.length).toBe(1);
  });

  it('pauses blinking during reactions and resumes after they expire', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.start();
    controller.cue('success');
    expect(controller.getSnapshot().mood).toBe('proud');
    clock.advance(2100);
    expect(controller.getSnapshot().mood).toBe('idle');
    expect(clock.delays).toHaveLength(1);
    expect(clock.delays[0]).toBeGreaterThanOrEqual(IDLE_BLINK_MIN_MS);
    expect(clock.delays[0]).toBeLessThanOrEqual(IDLE_BLINK_MAX_MS);
  });

  it('does not blink when reduced motion is active', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.start(true);
    expect(clock.delays).toHaveLength(0);
    clock.advance(20000);
    expect(controller.getSnapshot().blinking).toBe(false);
  });

  it('stops a current blink when reduced motion becomes active and resumes when disabled', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.start();
    clock.advance(clock.delays[0]!);
    expect(controller.getSnapshot().blinking).toBe(true);
    controller.setReducedMotion(true);
    expect(controller.getSnapshot().blinking).toBe(false);
    expect(clock.delays).toHaveLength(0);
    controller.setReducedMotion(false);
    expect(clock.delays[0]).toBeGreaterThanOrEqual(IDLE_BLINK_MIN_MS);
    expect(clock.delays[0]).toBeLessThanOrEqual(IDLE_BLINK_MAX_MS);
  });

  it('stops idle blinking when unmounted but keeps reaction expiry alive', () => {
    const clock = new FakeScheduler();
    const controller = new CharacterExpressionController(clock);
    controller.start();
    controller.cue('error');
    controller.stop();
    clock.advance(2600);
    expect(controller.getSnapshot().mood).toBe('idle');
    expect(clock.delays).toHaveLength(0);
  });

  it('starts no earlier than the minimum interval when the random source is out of range', () => {
    const clock = new FakeScheduler();
    clock.randomValue = -3;
    const controller = new CharacterExpressionController(clock);
    controller.start();
    expect(clock.delays[0]).toBe(IDLE_BLINK_MIN_MS);
    clock.randomValue = 8;
    clock.advance(IDLE_BLINK_MIN_MS + IDLE_BLINK_DURATION_MS);
    expect(clock.delays[0]).toBe(IDLE_BLINK_MAX_MS);
  });
});
