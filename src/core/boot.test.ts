import { describe, it, expect } from 'vitest';
import { BOOT_STEPS, bootDuration, bootFinished, hasBootedBefore, markBooted, stepSchedule, visibleSteps, type BootStepId } from './boot';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe('boot', () => {
  it('is shorter on repeat visits and instant under reduced motion', () => {
    expect(bootDuration(false, false)).toBe(2000);
    expect(bootDuration(true, false)).toBe(600);
    expect(bootDuration(false, true)).toBe(0);
  });
  it('remembers a finished boot and survives blocked storage', () => {
    const s = mem();
    expect(hasBootedBefore(s)).toBe(false);
    markBooted(s);
    expect(hasBootedBefore(s)).toBe(true);
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(hasBootedBefore(bad)).toBe(false);
    expect(() => markBooted(bad)).not.toThrow();
    expect(hasBootedBefore(undefined)).toBe(false);
  });
  it('spreads step times by weight, starting at 0 and strictly increasing', () => {
    const sch = stepSchedule(2000);
    expect(sch).toEqual([0, 333, 1000, 1667]);
    expect(stepSchedule(0)).toEqual([0, 0, 0, 0]);
  });
  it('does not show a step whose real work has not finished', () => {
    const sch = stepSchedule(2000);
    const none = new Set<BootStepId>();
    expect(visibleSteps(5000, sch, none).map((s) => s.id)).toEqual(['init']);
    expect(visibleSteps(5000, sch, new Set<BootStepId>(['vfs'])).map((s) => s.id)).toEqual(['init', 'vfs']);
    expect(visibleSteps(5000, sch, new Set<BootStepId>(['vfs', 'modules'])).map((s) => s.id)).toEqual(['init', 'vfs', 'modules', 'ready']);
  });
  it('shows steps only when their time has come', () => {
    const sch = stepSchedule(2000);
    const all = new Set<BootStepId>(['vfs', 'modules']);
    expect(visibleSteps(0, sch, all).length).toBe(1);
    expect(visibleSteps(400, sch, all).length).toBe(2);
    expect(visibleSteps(2000, sch, all).length).toBe(BOOT_STEPS.length);
  });
  it('finishes only when time is up and real work is done', () => {
    const all = new Set<BootStepId>(['vfs', 'modules']);
    expect(bootFinished(2000, 2000, all)).toBe(true);
    expect(bootFinished(1999, 2000, all)).toBe(false);
    expect(bootFinished(9999, 2000, new Set<BootStepId>(['vfs']))).toBe(false);
  });
});
