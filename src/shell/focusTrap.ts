import { trapTab } from './startMenuLogic';

/** Elements Tab can reach. Disabled controls, hidden elements and tabindex="-1" are skipped. */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
}

interface TabKeyLike { key: string; shiftKey: boolean; preventDefault: () => void }

/**
 * Call from a keydown handler on a dialog. Tab / Shift+Tab wrap around inside `root` (wrapping rule: trapTab).
 * With nothing focusable inside, focus stays on `root` itself (give it tabIndex={-1}). Returns true when it handled the key.
 */
export function trapTabKey(e: TabKeyLike, root: HTMLElement): boolean {
  if (e.key !== 'Tab') return false;
  const list = focusableIn(root);
  if (list.length === 0) { e.preventDefault(); root.focus(); return true; }
  const active = list.indexOf(document.activeElement as HTMLElement);
  const target = trapTab(active, list.length, e.shiftKey);
  if (target === null) return false;
  e.preventDefault();
  list[target]?.focus();
  return true;
}
