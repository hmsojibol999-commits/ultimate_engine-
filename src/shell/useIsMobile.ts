import { useSyncExternalStore } from 'react';

const Q = '(max-width: 767px)';
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(Q);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
/** True below 768px: windows become full-screen cards with a bottom app switcher. */
export const useIsMobile = (): boolean => useSyncExternalStore(subscribe, () => window.matchMedia(Q).matches, () => false);

/** Horizontal swipe detector for switching apps on phones. Returns pointer handlers. */
export function swipeHandlers(onLeft: () => void, onRight: () => void, threshold = 60) {
  let startX = 0, startY = 0, active = false;
  return {
    onPointerDown: (e: React.PointerEvent) => { startX = e.clientX; startY = e.clientY; active = true; },
    onPointerUp: (e: React.PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? onLeft : onRight)();
    },
    onPointerCancel: () => { active = false; },
  };
}
