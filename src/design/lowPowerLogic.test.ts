import { describe, it, expect } from 'vitest';
import { LOW_POWER_SUGGESTED_KEY, isSlowDevice, markLowPowerSuggested, shouldShowLowPowerSuggestion } from './lowPowerLogic';

const memoryStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
};

describe('isSlowDevice', () => {
  it('flags 2 GB or less memory, or 2 cores or fewer', () => {
    expect(isSlowDevice({ deviceMemory: 2, hardwareConcurrency: 8 })).toBe(true);
    expect(isSlowDevice({ deviceMemory: 8, hardwareConcurrency: 2 })).toBe(true);
    expect(isSlowDevice({ deviceMemory: 4, hardwareConcurrency: 4 })).toBe(false);
  });
  it('never calls a device slow from missing data', () => {
    expect(isSlowDevice({})).toBe(false);
    expect(isSlowDevice(undefined)).toBe(false);
  });
});

describe('shouldShowLowPowerSuggestion', () => {
  it('shows once on a slow device, then never again', () => {
    const store = memoryStore();
    expect(shouldShowLowPowerSuggestion({ slow: true, lowPower: false, store })).toBe(true);
    markLowPowerSuggested(store);
    expect(store.getItem(LOW_POWER_SUGGESTED_KEY)).toBe('1');
    expect(shouldShowLowPowerSuggestion({ slow: true, lowPower: false, store })).toBe(false);
  });
  it('stays quiet on a fast device or when Low-power is already on', () => {
    expect(shouldShowLowPowerSuggestion({ slow: false, lowPower: false, store: memoryStore() })).toBe(false);
    expect(shouldShowLowPowerSuggestion({ slow: true, lowPower: true, store: memoryStore() })).toBe(false);
  });
  it('treats missing or blocked storage as already suggested', () => {
    expect(shouldShowLowPowerSuggestion({ slow: true, lowPower: false, store: undefined })).toBe(false);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(shouldShowLowPowerSuggestion({ slow: true, lowPower: false, store: broken })).toBe(false);
    expect(() => markLowPowerSuggested(broken)).not.toThrow();
  });
});
