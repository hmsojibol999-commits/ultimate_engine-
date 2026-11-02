/** PWA registration (F-25). The service worker itself is public/sw.js. */
export interface PwaEnv {
  /** true only in the production build; dev servers must never get a service worker */
  prod: boolean;
  hasServiceWorker: boolean;
  /** https or localhost */
  secure: boolean;
}

export function shouldRegisterServiceWorker(env: PwaEnv): boolean {
  return env.prod && env.hasServiceWorker && env.secure;
}

/** Registers /sw.js after the page has loaded. Failure is silent: the app works fine without it. */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  const ok = shouldRegisterServiceWorker({
    prod: import.meta.env.PROD,
    hasServiceWorker: 'serviceWorker' in navigator,
    secure: window.isSecureContext,
  });
  if (!ok) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}
