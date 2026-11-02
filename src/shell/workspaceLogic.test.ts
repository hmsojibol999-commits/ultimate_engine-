import { describe, it, expect } from 'vitest';
import { serializeWorkspace, parseWorkspace, isSafeFilePath, MAX_RESTORED_WINDOWS, WORKSPACE_VERSION, type WindowLike } from './workspaceLogic';

const v = { w: 1000, h: 700, taskbar: 48 };
const all = () => true;
const win = (over: Partial<WindowLike> & { id: string }): WindowLike => ({
  appId: 'settings', rect: { x: 100, y: 80, w: 400, h: 300 }, z: 1, minimized: false, maximized: false, ...over,
});

describe('serializeWorkspace', () => {
  it('orders windows back to front by z and drops ids and z', () => {
    const json = serializeWorkspace([win({ id: 'a', appId: 'help', z: 5 }), win({ id: 'b', appId: 'legal', z: 2 })], 'a');
    const data = JSON.parse(json);
    expect(data.version).toBe(WORKSPACE_VERSION);
    expect(data.windows.map((w: { appId: string }) => w.appId)).toEqual(['legal', 'help']);
    expect(data.focusedIndex).toBe(1);
    expect(json.includes('"id"')).toBe(false);
    expect(json.includes('"z"')).toBe(false);
  });
  it('stores no focus when nothing is focused or the id is unknown', () => {
    expect(JSON.parse(serializeWorkspace([win({ id: 'a' })], null)).focusedIndex).toBe(null);
    expect(JSON.parse(serializeWorkspace([win({ id: 'a' })], 'zzz')).focusedIndex).toBe(null);
  });
  it('writes an empty list for an empty desktop', () => {
    expect(JSON.parse(serializeWorkspace([], null)).windows).toEqual([]);
  });
});

describe('parseWorkspace: round trip', () => {
  it('restores app, file, position, size, state and focus', () => {
    const json = serializeWorkspace([
      win({ id: 'a', appId: 'help', z: 1, rect: { x: 10, y: 20, w: 500, h: 400 } }),
      win({ id: 'b', appId: 'settings', z: 2, file: '/notes/todo.md', minimized: true }),
      win({ id: 'c', appId: 'legal', z: 3 }),
    ], 'c');
    const ws = parseWorkspace(json, all, v);
    expect(ws?.windows.map((w) => w.appId)).toEqual(['help', 'settings', 'legal']);
    expect(ws?.windows[0]?.rect).toEqual({ x: 10, y: 20, w: 500, h: 400 });
    expect(ws?.windows[1]?.file).toBe('/notes/todo.md');
    expect(ws?.windows[1]?.minimized).toBe(true);
    expect(ws?.focusedIndex).toBe(2);
  });
  it('restores maximized and snapped windows to the CURRENT screen size, keeping the normal size to go back to', () => {
    const json = serializeWorkspace([
      win({ id: 'a', z: 1, maximized: true, rect: { x: 0, y: 0, w: 1920, h: 1000 }, prevRect: { x: 50, y: 50, w: 400, h: 300 } }),
      win({ id: 'b', appId: 'help', z: 2, snapped: 'left', rect: { x: 0, y: 0, w: 960, h: 1000 }, prevRect: { x: 60, y: 60, w: 420, h: 320 } }),
    ], 'b');
    const ws = parseWorkspace(json, all, v);
    expect(ws?.windows[0]?.rect).toEqual({ x: 0, y: 0, w: 1000, h: 652 });
    expect(ws?.windows[0]?.maximized).toBe(true);
    expect(ws?.windows[0]?.prevRect).toEqual({ x: 50, y: 50, w: 400, h: 300 });
    expect(ws?.windows[1]?.rect).toEqual({ x: 0, y: 0, w: 500, h: 652 });
    expect(ws?.windows[1]?.snapped).toBe('left');
  });
  it('a top snap is stored as maximized and comes back maximized', () => {
    const json = serializeWorkspace([win({ id: 'a', maximized: true, snapped: 'top' })], 'a');
    const ws = parseWorkspace(json, all, v);
    expect(ws?.windows[0]?.maximized).toBe(true);
    expect(ws?.windows[0]?.snapped).toBe(undefined);
  });
});

describe('parseWorkspace: safety', () => {
  it('returns null (first visit) for missing, empty, broken or foreign data', () => {
    expect(parseWorkspace(null, all, v)).toBe(null);
    expect(parseWorkspace(undefined, all, v)).toBe(null);
    expect(parseWorkspace('', all, v)).toBe(null);
    expect(parseWorkspace('{not json', all, v)).toBe(null);
    expect(parseWorkspace('42', all, v)).toBe(null);
    expect(parseWorkspace('null', all, v)).toBe(null);
    expect(parseWorkspace(JSON.stringify({ version: 99, windows: [] }), all, v)).toBe(null);
    expect(parseWorkspace(JSON.stringify({ version: 1, windows: 'x' }), all, v)).toBe(null);
  });
  it('an empty desktop is a real answer, not a first visit', () => {
    expect(parseWorkspace(serializeWorkspace([], null), all, v)).toEqual({ windows: [], focusedIndex: null });
  });
  it('skips apps that no longer exist or are disabled, and fixes the focus index', () => {
    const json = serializeWorkspace([
      win({ id: 'a', appId: 'gone', z: 1 }),
      win({ id: 'b', appId: 'help', z: 2 }),
      win({ id: 'c', appId: 'legal', z: 3 }),
    ], 'c');
    const ws = parseWorkspace(json, (id) => id !== 'gone', v);
    expect(ws?.windows.map((w) => w.appId)).toEqual(['help', 'legal']);
    expect(ws?.focusedIndex).toBe(1);
  });
  it('focus falls back to the topmost visible window when the focused one was dropped or is minimized', () => {
    const dropped = serializeWorkspace([win({ id: 'a', appId: 'help', z: 1 }), win({ id: 'b', appId: 'gone', z: 2 })], 'b');
    expect(parseWorkspace(dropped, (id) => id !== 'gone', v)?.focusedIndex).toBe(0);
    const mini = serializeWorkspace([win({ id: 'a', z: 1 }), win({ id: 'b', appId: 'help', z: 2, minimized: true })], 'b');
    expect(parseWorkspace(mini, all, v)?.focusedIndex).toBe(0);
    const allMini = serializeWorkspace([win({ id: 'a', minimized: true })], 'a');
    expect(parseWorkspace(allMini, all, v)?.focusedIndex).toBe(null);
  });
  it('skips malformed window entries without losing the good ones', () => {
    const raw = JSON.stringify({
      version: 1, focusedIndex: null,
      windows: [
        null, 'x', 7, {}, { appId: 5 },
        { appId: 'help', rect: { x: 1, y: 2, w: 'wide', h: 4 } },
        { appId: 'help', rect: { x: NaN, y: 2, w: 300, h: 300 } },
        { appId: 'help', rect: { x: 10, y: 10, w: 400, h: 300 } },
      ],
    });
    const ws = parseWorkspace(raw, all, v);
    expect(ws?.windows).toHaveLength(1);
    expect(ws?.windows[0]?.appId).toBe('help');
  });
  it('clamps off-screen or oversized windows into the current screen', () => {
    const raw = JSON.stringify({ version: 1, focusedIndex: 0, windows: [{ appId: 'help', rect: { x: 9000, y: 9000, w: 5000, h: 5000 }, minimized: false, maximized: false }] });
    const r = parseWorkspace(raw, all, v)?.windows[0]?.rect;
    expect(r?.w).toBeLessThanOrEqual(1000);
    expect(r?.h).toBeLessThanOrEqual(652);
    expect(r?.x).toBeLessThanOrEqual(920);
    expect(r?.y).toBeLessThanOrEqual(612);
  });
  it('never restores more than the cap', () => {
    const windows = Array.from({ length: 40 }, (_, i) => win({ id: `w${i}`, z: i }));
    const ws = parseWorkspace(serializeWorkspace(windows, 'w39'), all, v);
    expect(ws?.windows).toHaveLength(MAX_RESTORED_WINDOWS);
  });
  it('drops an unsafe file path but still opens the window', () => {
    const raw = JSON.stringify({ version: 1, focusedIndex: 0, windows: [{ appId: 'help', file: '/a/../../etc/passwd', rect: { x: 10, y: 10, w: 400, h: 300 } }] });
    const w = parseWorkspace(raw, all, v)?.windows[0];
    expect(w?.appId).toBe('help');
    expect(w?.file).toBe(undefined);
  });
  it('ignores a prevRect on a normal window and a snap on a maximized one', () => {
    const raw = JSON.stringify({ version: 1, focusedIndex: 0, windows: [
      { appId: 'help', rect: { x: 10, y: 10, w: 400, h: 300 }, prevRect: { x: 1, y: 1, w: 300, h: 300 }, maximized: false },
      { appId: 'legal', rect: { x: 10, y: 10, w: 400, h: 300 }, maximized: true, snapped: 'right' },
    ] });
    const ws = parseWorkspace(raw, all, v);
    expect(ws?.windows[0]?.prevRect).toBe(undefined);
    expect(ws?.windows[1]?.snapped).toBe(undefined);
  });
});

describe('isSafeFilePath', () => {
  it('accepts normal absolute paths', () => {
    expect(isSafeFilePath('/a.txt')).toBe(true);
    expect(isSafeFilePath('/projects/my app/index.html')).toBe(true);
  });
  it('rejects relative, traversal, empty, huge and non-string values', () => {
    expect(isSafeFilePath('a.txt')).toBe(false);
    expect(isSafeFilePath('/a/../b')).toBe(false);
    expect(isSafeFilePath('')).toBe(false);
    expect(isSafeFilePath('/' + 'x'.repeat(2000))).toBe(false);
    expect(isSafeFilePath('/a\0b')).toBe(false);
    expect(isSafeFilePath(5)).toBe(false);
    expect(isSafeFilePath(undefined)).toBe(false);
  });
});
