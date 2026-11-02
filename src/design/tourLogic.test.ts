import { describe, it, expect } from 'vitest';
import { en } from '../content/strings.en';
import { bn } from '../content/strings.bn';
import { TOUR_STEPS, TOUR_SEEN_KEY, shouldAutoStartTour, markTourSeen, nextIndex, prevIndex, isLastStep, spotlightRect, tooltipPosition } from './tourLogic';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('tour steps', () => {
  it('start and end with a centered card, and use unique ids', () => {
    expect(TOUR_STEPS[0]!.target).toBeNull();
    expect(TOUR_STEPS[TOUR_STEPS.length - 1]!.target).toBeNull();
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
  });
  it('have text in both languages', () => {
    for (const s of TOUR_STEPS) {
      expect(en[s.title]).toBeTruthy(); expect(bn[s.title]).toBeTruthy();
      expect(en[s.body]).toBeTruthy(); expect(bn[s.body]).toBeTruthy();
    }
  });
});

describe('auto start', () => {
  it('runs once, then never again', () => {
    const s = memory();
    expect(shouldAutoStartTour(s)).toBe(true);
    markTourSeen(s);
    expect(s.getItem(TOUR_SEEN_KEY)).toBe('1');
    expect(shouldAutoStartTour(s)).toBe(false);
  });
  it('does not start when storage is missing or throws', () => {
    expect(shouldAutoStartTour(undefined)).toBe(false);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(shouldAutoStartTour(broken)).toBe(false);
    expect(() => markTourSeen(broken)).not.toThrow();
  });
});

describe('step navigation', () => {
  it('stays inside the list', () => {
    expect(nextIndex(0, 7)).toBe(1);
    expect(nextIndex(6, 7)).toBe(6);
    expect(prevIndex(0)).toBe(0);
    expect(prevIndex(3)).toBe(2);
    expect(isLastStep(6, 7)).toBe(true);
    expect(isLastStep(5, 7)).toBe(false);
  });
});

describe('spotlight and tooltip placement', () => {
  it('spotlight is padded and clamped to the screen', () => {
    expect(spotlightRect({ x: 2, y: 2, w: 40, h: 40 }, 6, 360, 640)).toEqual({ x: 0, y: 0, w: 48, h: 48 });
    expect(spotlightRect({ x: 340, y: 600, w: 40, h: 40 }, 6, 360, 640)).toEqual({ x: 334, y: 594, w: 26, h: 46 });
  });
  it('centers the card when there is no target', () => {
    expect(tooltipPosition(null, { w: 300, h: 200 }, 400, 800)).toEqual({ x: 50, y: 300 });
  });
  it('puts the card above a target in the lower half, below one in the upper half', () => {
    const tip = { w: 300, h: 180 };
    const low = tooltipPosition({ x: 20, y: 740, w: 44, h: 44 }, tip, 400, 800);
    expect(low.y).toBeLessThan(740);
    const high = tooltipPosition({ x: 20, y: 20, w: 44, h: 44 }, tip, 400, 800);
    expect(high.y).toBeGreaterThan(64);
  });
  it('never leaves the viewport, even on a tiny screen', () => {
    const p = tooltipPosition({ x: 330, y: 600, w: 40, h: 40 }, { w: 336, h: 190 }, 360, 640);
    expect(p.x).toBeGreaterThanOrEqual(12);
    expect(p.x + 336).toBeLessThanOrEqual(360 - 12 + 0.0001);
    expect(p.y).toBeGreaterThanOrEqual(12);
  });
});
