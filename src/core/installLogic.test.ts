import { describe, it, expect } from 'vitest';
import { installState, isIos, toOutcome } from './installLogic';

describe('installState', () => {
  it('already installed wins over everything', () => {
    expect(installState({ hasPrompt: true, standalone: true, ios: true })).toBe('installed');
  });
  it('offers the real prompt when the browser gave one', () => {
    expect(installState({ hasPrompt: true, standalone: false, ios: false })).toBe('promptable');
  });
  it('shows the manual iOS steps only when there is no prompt', () => {
    expect(installState({ hasPrompt: false, standalone: false, ios: true })).toBe('ios');
  });
  it('is honest when nothing is available (for example Firefox on desktop)', () => {
    expect(installState({ hasPrompt: false, standalone: false, ios: false })).toBe('unsupported');
  });
});

describe('isIos', () => {
  it('detects iPhone, iPad and iPod', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) iPod', 5)).toBe(true);
  });
  it('detects iPadOS that pretends to be a Mac, but not a real Mac', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
  });
  it('is false for Android and Windows', () => {
    expect(isIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe(false);
    expect(isIos('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe(false);
  });
});

describe('toOutcome', () => {
  it('maps the browser choice', () => {
    expect(toOutcome('accepted')).toBe('accepted');
    expect(toOutcome('dismissed')).toBe('dismissed');
    expect(toOutcome(undefined)).toBe('dismissed');
    expect(toOutcome('something else')).toBe('dismissed');
  });
});
