import { create } from 'zustand';
import { getApp } from '../core/registry';
import { emit } from '../core/eventBus';
import { cascadePosition, clampRect, nextFocus, snapRect, workArea, type Rect, type SnapSide, type Viewport } from './windowLogic';
import type { SavedWindow } from './workspaceLogic';

export interface Win {
  id: string; appId: string; file?: string;
  rect: Rect; prevRect?: Rect; z: number;
  minimized: boolean; maximized: boolean; snapped?: SnapSide;
}

export const TASKBAR_H = 48;
export const viewport = (): Viewport => ({ w: window.innerWidth, h: window.innerHeight, taskbar: TASKBAR_H });

interface WindowStore {
  windows: Win[];
  focusedId: string | null;
  zCounter: number;
  snapPreview: Rect | null;
  open: (appId: string, file?: string) => string | null;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  snap: (id: string, side: SnapSide) => void;
  setRect: (id: string, rect: Rect) => void;
  setSnapPreview: (r: Rect | null) => void;
  cycle: (dir: 1 | -1) => void;
  /** Replace all windows with a saved workspace (F-17). Items are back to front; new ids are made here. */
  restore: (items: SavedWindow[], focusedIndex: number | null) => void;
}

let seq = 0;

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [], focusedId: null, zCounter: 1, snapPreview: null,

  open: (appId, file) => {
    const app = getApp(appId);
    if (!app || !app.enabled) return null;
    const { windows, zCounter } = get();
    // Re-focus an existing window of a single-instance app that was opened with no file.
    const existing = !file && windows.find((w) => w.appId === appId);
    if (existing) { get().focus(existing.id); emit('character:cue', { cue: 'app-opened' }); return existing.id; }
    const id = `w${++seq}`;
    const rect = cascadePosition(windows.length, app.defaultSize, viewport());
    set({ windows: [...windows, { id, appId, file, rect, z: zCounter + 1, minimized: false, maximized: false }], focusedId: id, zCounter: zCounter + 1 });
    emit('character:cue', { cue: 'app-opened' });
    return id;
  },

  close: (id) => {
    const windows = get().windows.filter((w) => w.id !== id);
    set({ windows, focusedId: get().focusedId === id ? nextFocus(windows) : get().focusedId });
  },

  focus: (id) => {
    const { windows, zCounter, focusedId } = get();
    if (focusedId === id && !windows.find((w) => w.id === id)?.minimized) return;
    set({
      windows: windows.map((w) => (w.id === id ? { ...w, z: zCounter + 1, minimized: false } : w)),
      focusedId: id, zCounter: zCounter + 1,
    });
  },

  minimize: (id) => {
    const windows = get().windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
    set({ windows, focusedId: nextFocus(windows) });
  },

  toggleMaximize: (id) => {
    const v = viewport();
    set({
      windows: get().windows.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized || w.snapped) return { ...w, rect: w.prevRect ?? w.rect, prevRect: undefined, maximized: false, snapped: undefined };
        return { ...w, prevRect: w.rect, rect: workArea(v), maximized: true };
      }),
    });
  },

  snap: (id, side) => {
    const v = viewport();
    set({
      windows: get().windows.map((w) => {
        if (w.id !== id) return w;
        const prevRect = w.prevRect ?? w.rect;
        return side === 'top'
          ? { ...w, prevRect, rect: snapRect('top', v), maximized: true, snapped: undefined }
          : { ...w, prevRect, rect: snapRect(side, v), maximized: false, snapped: side };
      }),
      snapPreview: null,
    });
  },

  // Dragging or resizing a maximized/snapped window restores its normal state.
  setRect: (id, rect) => set({
    windows: get().windows.map((w) => (w.id === id ? { ...w, rect: clampRect(rect, viewport()), maximized: false, snapped: undefined, prevRect: undefined } : w)),
  }),

  setSnapPreview: (r) => set({ snapPreview: r }),

  cycle: (dir) => {
    const { windows, focusedId } = get();
    if (windows.length < 2) return;
    const i = windows.findIndex((w) => w.id === focusedId);
    const next = windows[(i + dir + windows.length) % windows.length];
    if (next) get().focus(next.id);
  },

  restore: (items, focusedIndex) => {
    const windows: Win[] = items.map((s, i) => ({
      id: `w${++seq}`, appId: s.appId, file: s.file, rect: s.rect, prevRect: s.prevRect,
      z: i + 1, minimized: s.minimized, maximized: s.maximized, snapped: s.snapped,
    }));
    const focused = focusedIndex === null ? undefined : windows[focusedIndex];
    set({ windows, focusedId: focused?.id ?? nextFocus(windows), zCounter: windows.length, snapPreview: null });
  },
}));
