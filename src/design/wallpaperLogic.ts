/** Pure math for the animated particle wallpaper (F-12). The canvas component only draws what this returns. */
export interface Particle { x: number; y: number; vx: number; vy: number }

/** Small seeded random generator so tests are repeatable (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fewer particles on small screens and never more than 90, so phones stay smooth. */
export function particleCount(width: number, height: number): number {
  const n = Math.round((width * height) / 18000);
  return Math.max(12, Math.min(90, n));
}

export function createParticles(count: number, width: number, height: number, rng: () => number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: rng() * width, y: rng() * height,
    vx: (rng() - 0.5) * 0.4, vy: (rng() - 0.5) * 0.4,
  }));
}

/** Move particles by dt (in 60fps frames) and wrap at the edges. Returns a new array. */
export function stepParticles(ps: Particle[], width: number, height: number, dt: number): Particle[] {
  const d = Math.min(Math.max(dt, 0), 4); // a long pause (hidden tab) never makes particles jump
  return ps.map((p) => {
    let x = p.x + p.vx * d; let y = p.y + p.vy * d;
    if (x < 0) x += width; else if (x > width) x -= width;
    if (y < 0) y += height; else if (y > height) y -= height;
    return { ...p, x, y };
  });
}

/** Pairs closer than maxDist, with an opacity that fades with distance (0..1). */
export function linkPairs(ps: Particle[], maxDist: number): Array<{ a: number; b: number; alpha: number }> {
  const out: Array<{ a: number; b: number; alpha: number }> = [];
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]!;
    for (let j = i + 1; j < ps.length; j++) {
      const q = ps[j]!;
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (dist < maxDist) out.push({ a: i, b: j, alpha: 1 - dist / maxDist });
    }
  }
  return out;
}

/** The animation runs only when it is visible, allowed and the device is not asked to save power. */
export function shouldAnimateWallpaper(opts: { wallpaper: string; lowPower: boolean; reducedMotion: boolean; pageHidden: boolean }): boolean {
  return opts.wallpaper === 'particles' && !opts.lowPower && !opts.reducedMotion && !opts.pageHidden;
}
