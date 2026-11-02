// Keyboard behaviour for tab lists (WAI-ARIA tabs pattern). Pure, so it is unit tested.
/** Index of the tab to focus after `key`, or null when the key does nothing. */
export function nextTabIndex(current: number, count: number, key: string, rtl = false): number | null {
  if (count <= 0) return null;
  const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (key === fwd) return (current + 1) % count;
  if (key === back) return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
