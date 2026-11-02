import type { StringKey } from '../content/strings.en';

/** Guided tour logic (F-22). Pure and testable; the UI lives in shell/Tour.tsx. */
export interface TourStep { id: string; target: string | null; title: StringKey; body: StringKey }
export interface Rect { x: number; y: number; w: number; h: number }

/** `target` is the value of a data-tour attribute in the shell; null means a centered card with no spotlight. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', target: null, title: 'tour.welcome.title', body: 'tour.welcome.body' },
  { id: 'start', target: 'start', title: 'tour.start.title', body: 'tour.start.body' },
  { id: 'search', target: 'search', title: 'tour.search.title', body: 'tour.search.body' },
  { id: 'palette', target: 'palette', title: 'tour.palette.title', body: 'tour.palette.body' },
  { id: 'notifications', target: 'notifications', title: 'tour.notifications.title', body: 'tour.notifications.body' },
  { id: 'language', target: 'language', title: 'tour.language.title', body: 'tour.language.body' },
  { id: 'finish', target: null, title: 'tour.finish.title', body: 'tour.finish.body' },
];

export const TOUR_SEEN_KEY = 'sg.tourSeen';
export const TOUR_START_DELAY_MS = 500;

interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** First visit only. Blocked storage counts as "seen" so the tour never nags on every reload. */
export function shouldAutoStartTour(store: KeyValueStore | undefined): boolean {
  if (!store) return false;
  try { return store.getItem(TOUR_SEEN_KEY) === null; } catch { return false; }
}

export function markTourSeen(store: KeyValueStore | undefined): void {
  try { store?.setItem(TOUR_SEEN_KEY, '1'); } catch { /* storage blocked: nothing to do */ }
}

export const isLastStep = (index: number, total: number): boolean => index >= total - 1;
export const nextIndex = (index: number, total: number): number => Math.min(Math.max(index, 0) + 1, total - 1);
export const prevIndex = (index: number): number => Math.max(index - 1, 0);

/** Grows the target rect by `pad` and keeps it inside the viewport. */
export function spotlightRect(r: Rect, pad: number, vw: number, vh: number): Rect {
  const x = Math.max(0, r.x - pad);
  const y = Math.max(0, r.y - pad);
  const right = Math.min(vw, r.x + r.w + pad);
  const bottom = Math.min(vh, r.y + r.h + pad);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

/** Top-left corner for the tip card: centered with no target; otherwise above the target when it sits in the lower half, else below. Always inside the viewport. */
export function tooltipPosition(target: Rect | null, tip: { w: number; h: number }, vw: number, vh: number, margin = 12): { x: number; y: number } {
  const clampX = (x: number) => Math.min(Math.max(margin, x), Math.max(margin, vw - tip.w - margin));
  const clampY = (y: number) => Math.min(Math.max(margin, y), Math.max(margin, vh - tip.h - margin));
  if (!target) return { x: clampX((vw - tip.w) / 2), y: clampY((vh - tip.h) / 2) };
  const centerX = target.x + target.w / 2 - tip.w / 2;
  const inLowerHalf = target.y + target.h / 2 > vh / 2;
  const y = inLowerHalf ? target.y - tip.h - margin : target.y + target.h + margin;
  return { x: clampX(centerX), y: clampY(y) };
}
