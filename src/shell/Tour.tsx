import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useT } from '../core/i18n';
import { useTour } from '../core/tour';
import { TOUR_STEPS, isLastStep, nextIndex, prevIndex, spotlightRect, tooltipPosition, type Rect } from '../design/tourLogic';

const PAD = 6;
const TIP_H = 200; // height estimate used only for placement

/** Guided tour (F-22): dims the screen, lights up one control at a time, explains it. Skippable with the button or Esc. */
export function Tour() {
  const active = useTour((s) => s.active);
  return active ? <TourRun /> : null;
}

function TourRun() {
  const { t } = useT();
  const stop = useTour((s) => s.stop);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [target, setTarget] = useState<Rect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[index]!;
  const last = isLastStep(index, TOUR_STEPS.length);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const measure = useCallback(() => {
    setView({ w: window.innerWidth, h: window.innerHeight });
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    const b = el?.getBoundingClientRect();
    // A missing or hidden control never breaks the tour: the card is simply centered.
    setTarget(b && b.width > 0 && b.height > 0 ? spotlightRect({ x: b.left, y: b.top, w: b.width, h: b.height }, PAD, window.innerWidth, window.innerHeight) : null);
  }, [step.target]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); };
  }, [measure]);
  useEffect(() => { nextRef.current?.focus(); }, [index]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); stop(); return; }
    if (e.key === 'ArrowRight') setIndex((i) => nextIndex(i, TOUR_STEPS.length));
    if (e.key === 'ArrowLeft') setIndex((i) => prevIndex(i));
    if (e.key === 'Tab') { // keep focus inside the card
      const items = Array.from(cardRef.current?.querySelectorAll<HTMLElement>('button') ?? []);
      const first = items[0]; const lastEl = items[items.length - 1];
      if (!first || !lastEl) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  };

  const tipW = Math.min(340, view.w - 24);
  const pos = tooltipPosition(target, { w: tipW, h: TIP_H }, view.w, view.h);
  const ease = reduce ? 'none' : 'all 200ms ease';

  return (
    <div onKeyDown={onKeyDown} style={{ position: 'fixed', inset: 0, zIndex: 150000 }}>
      {/* Spotlight: a transparent box with a huge shadow dims everything else. It also swallows clicks. */}
      {target
        ? <div aria-hidden style={{ position: 'absolute', left: target.x, top: target.y, width: target.w, height: target.h, borderRadius: 'var(--r-2)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7), var(--glow)', border: '1px solid var(--accent)', transition: ease }} />
        : <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0 }} />
      <div ref={cardRef} role="dialog" aria-modal="true" aria-label={t('tour.label')} aria-labelledby="sg-tour-title"
        className="sg-glass"
        style={{ position: 'absolute', left: pos.x, top: pos.y, width: tipW, boxSizing: 'border-box', padding: 'var(--sp-4)', borderRadius: 'var(--r-3)', display: 'grid', gap: 'var(--sp-3)', transition: ease }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t('tour.step', { n: index + 1, total: TOUR_STEPS.length })}</div>
        <h2 id="sg-tour-title" style={{ margin: 0, fontSize: 17 }}>{t(step.title)}</h2>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{t(step.body)}</p>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button className="sg-btn" onClick={stop}>{t('tour.skip')}</button>
          <span style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            {index > 0 && <button className="sg-btn" onClick={() => setIndex(prevIndex(index))}>{t('tour.back')}</button>}
            <button ref={nextRef} className="sg-btn" onClick={() => (last ? stop() : setIndex(nextIndex(index, TOUR_STEPS.length)))}>{last ? t('tour.done') : t('tour.next')}</button>
          </span>
        </div>
      </div>
    </div>
  );
}
