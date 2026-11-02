import { useEffect, useRef } from 'react';
import { useSettings } from '../core/settings';
import { createParticles, linkPairs, makeRng, particleCount, shouldAnimateWallpaper, stepParticles, type Particle } from './wallpaperLogic';

const BASE = 'radial-gradient(ellipse at 50% 30%, var(--bg-2), var(--bg-0) 70%)';
const GRID = `linear-gradient(var(--border) 1px, transparent 1px) 0 0 / 48px 48px, linear-gradient(90deg, var(--border) 1px, transparent 1px) 0 0 / 48px 48px, ${BASE}`;

/** Desktop wallpaper (F-12): grid, animated particles or plain. Low-power mode hides it through CSS and stops the animation here. */
export function Wallpaper() {
  const wallpaper = useSettings((s) => s.wallpaper);
  const lowPower = useSettings((s) => s.lowPower);
  const theme = useSettings((s) => s.theme);
  return (
    <div aria-hidden className="sg-wallpaper-canvas" style={{ position: 'absolute', inset: 0, background: wallpaper === 'grid' ? GRID : BASE, opacity: 0.8 }}>
      {wallpaper === 'particles' && !lowPower && <ParticleCanvas theme={theme} />}
    </div>
  );
}

function ParticleCanvas({ theme }: { theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    const parent = canvas?.parentElement;
    if (!canvas || !ctx || !parent) return;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rng = makeRng(20261102);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00f3ff';
    let w = 0; let h = 0; let ps: Particle[] = []; let raf = 0; let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // capped so phones stay smooth
      w = parent.clientWidth; h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr)); canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ps = createParticles(particleCount(w, h), w, h, rng);
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = accent; ctx.fillStyle = accent;
      for (const l of linkPairs(ps, 120)) {
        const a = ps[l.a]; const b = ps[l.b];
        if (!a || !b) continue;
        ctx.globalAlpha = l.alpha * 0.35;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 0.8;
      for (const p of ps) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill(); }
    };
    const frame = (now: number) => {
      const dt = last ? (now - last) / 16.67 : 1; last = now;
      ps = stepParticles(ps, w, h, dt); draw();
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      const animate = shouldAnimateWallpaper({ wallpaper: 'particles', lowPower: false, reducedMotion: motionQuery.matches, pageHidden: document.hidden });
      if (animate) raf = requestAnimationFrame(frame); else draw(); // reduced motion: one still frame
    };

    resize(); sync();
    const ro = new ResizeObserver(() => { resize(); sync(); });
    ro.observe(parent);
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motionQuery.removeEventListener('change', sync);
    };
  }, [theme]); // theme change re-reads the accent colour
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
