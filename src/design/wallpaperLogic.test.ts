import { describe, it, expect } from 'vitest';
import { createParticles, linkPairs, makeRng, particleCount, shouldAnimateWallpaper, stepParticles } from './wallpaperLogic';

describe('wallpaper logic', () => {
  it('seeded random is repeatable and within 0..1', () => {
    const a = makeRng(7); const b = makeRng(7);
    const xs = [a(), a(), a()]; const ys = [b(), b(), b()];
    expect(xs).toEqual(ys);
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true);
  });
  it('limits particle count between 12 and 90', () => {
    expect(particleCount(360, 640)).toBe(13);
    expect(particleCount(100, 100)).toBe(12);
    expect(particleCount(3840, 2160)).toBe(90);
  });
  it('creates particles inside the area', () => {
    const ps = createParticles(30, 400, 300, makeRng(1));
    expect(ps.length).toBe(30);
    expect(ps.every((p) => p.x >= 0 && p.x <= 400 && p.y >= 0 && p.y <= 300)).toBe(true);
  });
  it('wraps at the edges and caps a long pause', () => {
    const out = stepParticles([{ x: 399, y: 1, vx: 1, vy: -1 }], 400, 300, 2);
    expect(out[0]!.x).toBeCloseTo(1); expect(out[0]!.y).toBeCloseTo(299);
    const jump = stepParticles([{ x: 10, y: 10, vx: 1, vy: 0 }], 400, 300, 9999);
    expect(jump[0]!.x).toBeCloseTo(14);
  });
  it('links only close pairs and fades with distance', () => {
    const pairs = linkPairs([{ x: 0, y: 0, vx: 0, vy: 0 }, { x: 30, y: 0, vx: 0, vy: 0 }, { x: 500, y: 0, vx: 0, vy: 0 }], 100);
    expect(pairs.length).toBe(1);
    expect(pairs[0]!.alpha).toBeCloseTo(0.7);
  });
  it('animates only for particles, not low power, not reduced motion, visible page', () => {
    const base = { wallpaper: 'particles', lowPower: false, reducedMotion: false, pageHidden: false };
    expect(shouldAnimateWallpaper(base)).toBe(true);
    expect(shouldAnimateWallpaper({ ...base, wallpaper: 'grid' })).toBe(false);
    expect(shouldAnimateWallpaper({ ...base, lowPower: true })).toBe(false);
    expect(shouldAnimateWallpaper({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldAnimateWallpaper({ ...base, pageHidden: true })).toBe(false);
  });
});
