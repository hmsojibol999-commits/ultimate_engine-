// Workspace restore logic (F-17): which windows were open, where they were, which file each one had.
// Pure (no React, no DOM, no Zustand) so it can be unit tested. The glue lives in shell/workspace.ts.
import { clampRect, snapRect, workArea, type Rect, type Viewport } from './windowLogic';

export const WORKSPACE_KEY = 'sg.workspace';
export const WORKSPACE_VERSION = 1;
/** More windows than this are never restored (a corrupt or hand-edited value must not open hundreds). */
export const MAX_RESTORED_WINDOWS = 12;
/** Wait this long after the last window change before writing, so dragging does not write on every frame. */
export const SAVE_DELAY_MS = 400;

/** A window ready to be put back. Rects are already clamped to the current screen. */
export interface SavedWindow {
  appId: string;
  file?: string;
  rect: Rect;
  prevRect?: Rect;
  minimized: boolean;
  maximized: boolean;
  snapped?: 'left' | 'right';
}

export interface Workspace {
  /** Back to front: the last window is the topmost one. */
  windows: SavedWindow[];
  /** Index into `windows` of the focused window, or null when none is focused. */
  focusedIndex: number | null;
}

/** The part of a live window this module needs (structural, so it does not import the store). */
export interface WindowLike {
  id: string;
  appId: string;
  file?: string;
  rect: Rect;
  prevRect?: Rect;
  z: number;
  minimized: boolean;
  maximized: boolean;
  snapped?: 'left' | 'right' | 'top';
}

/** Turn the open windows into a JSON string. Order is back to front (by z), no ids, no z values. */
export function serializeWorkspace(windows: WindowLike[], focusedId: string | null): string {
  const sorted = [...windows].sort((a, b) => a.z - b.z);
  const idx = focusedId === null ? -1 : sorted.findIndex((w) => w.id === focusedId);
  return JSON.stringify({
    version: WORKSPACE_VERSION,
    focusedIndex: idx >= 0 ? idx : null,
    windows: sorted.map((w) => ({
      appId: w.appId,
      ...(w.file ? { file: w.file } : {}),
      rect: w.rect,
      ...(w.prevRect ? { prevRect: w.prevRect } : {}),
      minimized: w.minimized,
      maximized: w.maximized,
      ...(w.snapped === 'left' || w.snapped === 'right' ? { snapped: w.snapped } : {}),
    })),
  });
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function readRect(raw: unknown): Rect | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNum(r.x) || !isNum(r.y) || !isNum(r.w) || !isNum(r.h)) return null;
  return { x: r.x, y: r.y, w: r.w, h: r.h };
}

/** A saved file path must be absolute, short, and free of '..' and NUL. Anything else is dropped (the window still opens). */
export function isSafeFilePath(p: unknown): p is string {
  if (typeof p !== 'string' || p.length === 0 || p.length > 1024) return false;
  if (!p.startsWith('/') || p.includes('\0')) return false;
  return !p.split('/').includes('..');
}

/**
 * Read a saved workspace. Returns null when there is nothing usable (no value, bad JSON, wrong version), which the
 * caller treats as "first visit". An empty `windows` list is a real answer: the visitor closed everything.
 * `canOpen` says whether an app id exists and is enabled today (apps can be removed or hidden between visits).
 * Never throws.
 */
export function parseWorkspace(raw: string | null | undefined, canOpen: (appId: string) => boolean, v: Viewport): Workspace | null {
  if (!raw) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.version !== WORKSPACE_VERSION || !Array.isArray(d.windows)) return null;

  const kept: SavedWindow[] = [];
  const oldToNew = new Map<number, number>();
  const list: unknown[] = d.windows;
  for (let i = 0; i < list.length && kept.length < MAX_RESTORED_WINDOWS; i++) {
    const item = list[i];
    if (typeof item !== 'object' || item === null) continue;
    const w = item as Record<string, unknown>;
    if (typeof w.appId !== 'string' || !canOpen(w.appId)) continue;
    const rect = readRect(w.rect);
    if (!rect) continue;

    const maximized = w.maximized === true;
    const snapped = !maximized && (w.snapped === 'left' || w.snapped === 'right') ? w.snapped : undefined;
    const prev = readRect(w.prevRect);
    const saved: SavedWindow = {
      appId: w.appId,
      rect: maximized ? workArea(v) : snapped ? snapRect(snapped, v) : clampRect(rect, v),
      minimized: w.minimized === true,
      maximized,
    };
    if (isSafeFilePath(w.file)) saved.file = w.file;
    if ((maximized || snapped) && prev) saved.prevRect = clampRect(prev, v);
    if (snapped) saved.snapped = snapped;
    oldToNew.set(i, kept.length);
    kept.push(saved);
  }

  return { windows: kept, focusedIndex: pickFocus(kept, d.focusedIndex, oldToNew) };
}

/** Keep the saved focus when that window survived and is visible; otherwise the topmost visible window, or none. */
function pickFocus(windows: SavedWindow[], savedIndex: unknown, oldToNew: Map<number, number>): number | null {
  if (isNum(savedIndex)) {
    const mapped = oldToNew.get(savedIndex);
    if (mapped !== undefined && !windows[mapped]?.minimized) return mapped;
  }
  for (let i = windows.length - 1; i >= 0; i--) if (!windows[i]?.minimized) return i;
  return null;
}
