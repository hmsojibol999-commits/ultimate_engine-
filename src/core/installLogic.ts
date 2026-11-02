/** Logic for the "Install app" button (F-25). Pure and unit tested; the browser wiring lives in core/install.ts. */

export type InstallState = 'installed' | 'promptable' | 'ios' | 'unsupported';
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface InstallEnv {
  /** The browser fired `beforeinstallprompt` and we still hold the event. */
  hasPrompt: boolean;
  /** Running as an installed app (display-mode standalone, or iOS navigator.standalone). */
  standalone: boolean;
  ios: boolean;
}

/** What Settings should offer. Already installed wins; a real prompt beats the iOS hint; otherwise be honest that there is no one-tap install. */
export function installState(env: InstallEnv): InstallState {
  if (env.standalone) return 'installed';
  if (env.hasPrompt) return 'promptable';
  if (env.ios) return 'ios';
  return 'unsupported';
}

/** iPhone, iPad and iPod, plus iPadOS in "desktop" mode (it reports a Mac user agent but has a touch screen). iOS never fires beforeinstallprompt. */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** Maps the browser's `userChoice.outcome` to our outcome; anything unexpected counts as dismissed. */
export function toOutcome(choice: string | undefined): InstallOutcome {
  return choice === 'accepted' ? 'accepted' : 'dismissed';
}
