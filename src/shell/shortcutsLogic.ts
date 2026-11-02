/** Rules for the "?" shortcuts overlay (F-28). Pure, so it is unit tested; the UI lives in shell/ShortcutsOverlay.tsx. */

export interface KeyLike { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }
export interface TargetLike { tagName?: string; isContentEditable?: boolean }

const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True when typing here means text (inputs, the code editor, the terminal), so a "?" must stay a "?". */
export function isEditableTarget(t: TargetLike | null | undefined): boolean {
  if (!t) return false;
  if (t.isContentEditable) return true;
  return typeof t.tagName === 'string' && TEXT_TAGS.has(t.tagName.toUpperCase());
}

/** "?" opens the overlay, except while typing text or together with Ctrl/Cmd/Alt (those belong to other shortcuts). */
export function isShortcutsKey(e: KeyLike, target: TargetLike | null | undefined): boolean {
  return e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditableTarget(target);
}
