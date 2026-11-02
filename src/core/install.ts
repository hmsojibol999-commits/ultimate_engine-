import { create } from 'zustand';
import { installState, isIos, toOutcome, type InstallOutcome, type InstallState } from './installLogic';

/** Chromium's install prompt event. Not in the standard DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let listening = false;

function readState(): InstallState {
  if (typeof window === 'undefined') return 'unsupported';
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone = (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || nav.standalone === true;
  return installState({ hasPrompt: deferred !== null, standalone, ios: isIos(navigator.userAgent, navigator.maxTouchPoints ?? 0) });
}

/** What the Install section of Settings shows. Updates when the browser offers the prompt or the app gets installed. */
export const useInstall = create<{ state: InstallState }>(() => ({ state: 'unsupported' }));
const refresh = () => useInstall.setState({ state: readState() });

/** Call once at startup, before React renders: the browser may fire `beforeinstallprompt` very early. Safe to call twice. */
export function listenForInstallPrompt(): void {
  if (typeof window === 'undefined' || listening) return;
  listening = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the event so our own button can show the prompt
    deferred = e as BeforeInstallPromptEvent;
    refresh();
  });
  window.addEventListener('appinstalled', () => { deferred = null; refresh(); });
  refresh();
}

/** Shows the browser's install dialog. The event can be used only once, so it is dropped afterwards. */
export async function promptInstall(): Promise<InstallOutcome> {
  const ev = deferred;
  if (!ev) return 'unavailable';
  deferred = null;
  try {
    await ev.prompt();
    const choice = await ev.userChoice;
    refresh();
    return toOutcome(choice.outcome);
  } catch {
    refresh();
    return 'unavailable';
  }
}
