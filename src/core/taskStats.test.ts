import { describe, it, expect } from 'vitest';
import { FpsMeter, fpsLevel, formatBytes, percent, readMemory, readStorage, shouldSample } from './taskStats';

describe('FpsMeter', () => {
  it('is null until two frames arrive', () => {
    const m = new FpsMeter();
    expect(m.fps()).toBeNull();
    m.push(0);
    expect(m.fps()).toBeNull();
  });
  it('measures 60 fps from 16.67 ms frames', () => {
    const m = new FpsMeter();
    for (let i = 0; i <= 60; i++) m.push(i * (1000 / 60));
    expect(m.fps()).toBe(60);
  });
  it('measures 30 fps and forgets old frames outside the window', () => {
    const m = new FpsMeter(1000);
    for (let i = 0; i < 20; i++) m.push(i * 8);          // fast burst long ago
    const base = 5000;
    for (let i = 0; i <= 30; i++) m.push(base + i * (1000 / 30));
    expect(m.fps()).toBe(30);
  });
  it('reset clears the meter', () => {
    const m = new FpsMeter();
    m.push(0); m.push(16);
    m.reset();
    expect(m.fps()).toBeNull();
  });
});

describe('fpsLevel', () => {
  it('buckets values and keeps null', () => {
    expect(fpsLevel(null)).toBeNull();
    expect(fpsLevel(60)).toBe('good');
    expect(fpsLevel(50)).toBe('good');
    expect(fpsLevel(49)).toBe('ok');
    expect(fpsLevel(30)).toBe('ok');
    expect(fpsLevel(29)).toBe('low');
  });
});

describe('formatBytes and percent', () => {
  it('formats sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(250 * 1024 * 1024)).toBe('250 MB');
  });
  it('computes clamped percentages and rejects unknown totals', () => {
    expect(percent(50, 200)).toBe(25);
    expect(percent(300, 200)).toBe(100);
    expect(percent(-1, 200)).toBe(0);
    expect(percent(1, 0)).toBeNull();
    expect(percent(NaN, 10)).toBeNull();
  });
});

describe('readMemory and readStorage', () => {
  it('returns null when the browser exposes nothing', () => {
    expect(readMemory(undefined)).toBeNull();
    expect(readMemory({})).toBeNull();
    expect(readMemory({ memory: { usedJSHeapSize: 'x', jsHeapSizeLimit: 5 } })).toBeNull();
    expect(readMemory({ memory: { usedJSHeapSize: 1, jsHeapSizeLimit: 0 } })).toBeNull();
  });
  it('reads Chromium style memory', () => {
    expect(readMemory({ memory: { usedJSHeapSize: 10, jsHeapSizeLimit: 100 } })).toEqual({ used: 10, limit: 100 });
  });
  it('reads storage estimates', () => {
    expect(readStorage(undefined)).toBeNull();
    expect(readStorage({ usage: 1 })).toBeNull();
    expect(readStorage({ usage: 25, quota: 100 })).toEqual({ used: 25, quota: 100, percent: 25 });
  });
});

describe('shouldSample', () => {
  it('measures only while visible', () => {
    expect(shouldSample({ minimized: false, hiddenOnMobile: false, tabHidden: false })).toBe(true);
    expect(shouldSample({ minimized: true, hiddenOnMobile: false, tabHidden: false })).toBe(false);
    expect(shouldSample({ minimized: false, hiddenOnMobile: true, tabHidden: false })).toBe(false);
    expect(shouldSample({ minimized: false, hiddenOnMobile: false, tabHidden: true })).toBe(false);
  });
});
