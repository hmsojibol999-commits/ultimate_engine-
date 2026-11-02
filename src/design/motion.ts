import { isSlowDevice } from './lowPowerLogic';

// Single source of truth for motion (spec section 7). Used by every animated component.
// Animate only transform and opacity.
export const duration = { fast: 0.12, base: 0.22, slow: 0.42 } as const;
export const ease = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export const transition = {
  fast: { duration: duration.fast, ease: ease.out },
  base: { duration: duration.base, ease: ease.out },
  slow: { duration: duration.slow, ease: ease.inOut },
};

/** Variants for window open / close / minimize / restore. */
export const windowVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transition.base },
  minimized: { opacity: 0, scale: 0.9, y: 40, transition: transition.base },
  exit: { opacity: 0, scale: 0.96, transition: transition.fast },
};

export const toastVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.base },
  exit: { opacity: 0, y: 8, transition: transition.fast },
};

/** True when animation should be minimal: OS reduced-motion or in-app Low-power mode. */
export function motionReduced(lowPower: boolean): boolean {
  const os = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return os || lowPower;
}

/** Suggest Low-power mode on slow devices (real signals only). */
export function shouldSuggestLowPower(): boolean {
  return isSlowDevice(typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number }));
}
