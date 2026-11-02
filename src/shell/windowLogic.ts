// Pure window-manager math (no React, no DOM) so it can be unit tested.
export interface Rect { x: number; y: number; w: number; h: number }
export type SnapSide = 'left' | 'right' | 'top';
export interface Viewport { w: number; h: number; taskbar: number }

export const MIN_W = 280;
export const MIN_H = 180;
export const SNAP_EDGE = 24; // px from an edge that triggers snapping

/** Usable desktop area (above the taskbar). */
export const workArea = (v: Viewport): Rect => ({ x: 0, y: 0, w: v.w, h: Math.max(0, v.h - v.taskbar) });

/** Which snap zone (if any) a pointer is in while dragging. */
export function snapZone(px: number, py: number, v: Viewport): SnapSide | null {
  if (py <= SNAP_EDGE) return 'top';
  if (px <= SNAP_EDGE) return 'left';
  if (px >= v.w - SNAP_EDGE) return 'right';
  return null;
}

export function snapRect(side: SnapSide, v: Viewport): Rect {
  const a = workArea(v);
  if (side === 'top') return a; // top snap maximizes
  const half = Math.floor(a.w / 2);
  return side === 'left' ? { x: 0, y: 0, w: half, h: a.h } : { x: half, y: 0, w: a.w - half, h: a.h };
}

/** Keep a window reachable: its title bar must stay on screen and at least 80px visible horizontally. */
export function clampRect(r: Rect, v: Viewport): Rect {
  const a = workArea(v);
  const w = Math.min(Math.max(r.w, MIN_W), a.w);
  const h = Math.min(Math.max(r.h, MIN_H), a.h);
  const x = Math.min(Math.max(r.x, 80 - w), a.w - 80);
  const y = Math.min(Math.max(r.y, 0), a.h - 40);
  return { x, y, w, h };
}

/** Resize from a handle. dx/dy are pointer deltas since drag start; handle is a combo of n/s/e/w. */
export function resizeRect(start: Rect, handle: string, dx: number, dy: number): Rect {
  let { x, y, w, h } = start;
  if (handle.includes('e')) w = Math.max(MIN_W, start.w + dx);
  if (handle.includes('s')) h = Math.max(MIN_H, start.h + dy);
  if (handle.includes('w')) { w = Math.max(MIN_W, start.w - dx); x = start.x + (start.w - w); }
  if (handle.includes('n')) { h = Math.max(MIN_H, start.h - dy); y = start.y + (start.h - h); }
  return { x, y, w, h };
}

/** Cascade new windows so they do not stack exactly on top of each other. */
export function cascadePosition(index: number, size: { w: number; h: number }, v: Viewport): Rect {
  const a = workArea(v);
  const off = (index % 8) * 28;
  return clampRect({ x: 48 + off, y: 32 + off, w: Math.min(size.w, a.w - 16), h: Math.min(size.h, a.h - 16) }, v);
}

/** Pick the window to focus after one closes or minimizes: the topmost visible one. */
export function nextFocus(wins: { id: string; z: number; minimized: boolean }[], excludeId?: string): string | null {
  const c = wins.filter((w) => !w.minimized && w.id !== excludeId).sort((a, b) => b.z - a.z);
  return c[0]?.id ?? null;
}

// ---------- Keyboard move/resize and snap buttons (F-05, F-28) ----------

/** Pixels moved or resized per arrow key press. */
export const KEY_STEP = 16;
/** Snap buttons need room in the title bar; narrower windows hide them (maximize/restore stays). */
export const SNAP_BUTTONS_MIN_W = 360;

const ARROWS = new Map<string, readonly [number, number]>([
  ['ArrowLeft', [-1, 0]], ['ArrowRight', [1, 0]], ['ArrowUp', [0, -1]], ['ArrowDown', [0, 1]],
]);

/**
 * New rectangle after an arrow key pressed on a focused title bar. Plain arrows move the window; Shift + arrows resize
 * it from the bottom-right corner. Always clamped (keeps the title bar reachable, minimum size). Null for other keys.
 */
export function keyboardRect(r: Rect, key: string, shift: boolean, v: Viewport): Rect | null {
  const dir = ARROWS.get(key);
  if (!dir) return null;
  const dx = dir[0] * KEY_STEP;
  const dy = dir[1] * KEY_STEP;
  return clampRect(shift ? resizeRect(r, 'se', dx, dy) : { ...r, x: r.x + dx, y: r.y + dy }, v);
}

/** A snap button on a window already snapped to that side puts the window back; otherwise it snaps. */
export function snapAction(win: { snapped?: SnapSide }, side: 'left' | 'right'): 'snap' | 'restore' {
  return win.snapped === side ? 'restore' : 'snap';
}

export const showSnapButtons = (windowWidth: number): boolean => windowWidth >= SNAP_BUTTONS_MIN_W;
