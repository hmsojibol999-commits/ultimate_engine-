import { describe, it, expect } from 'vitest';
import { snapZone, snapRect, clampRect, resizeRect, nextFocus, MIN_W, MIN_H, cascadePosition, keyboardRect, snapAction, showSnapButtons, KEY_STEP, SNAP_BUTTONS_MIN_W } from './windowLogic';

const v = { w: 1000, h: 700, taskbar: 48 };

describe('snap', () => {
  it('detects edge zones', () => {
    expect(snapZone(5, 300, v)).toBe('left');
    expect(snapZone(995, 300, v)).toBe('right');
    expect(snapZone(500, 3, v)).toBe('top');
    expect(snapZone(500, 300, v)).toBe(null);
  });
  it('left/right halves fill the work area, top maximizes', () => {
    expect(snapRect('left', v)).toEqual({ x: 0, y: 0, w: 500, h: 652 });
    expect(snapRect('right', v)).toEqual({ x: 500, y: 0, w: 500, h: 652 });
    expect(snapRect('top', v)).toEqual({ x: 0, y: 0, w: 1000, h: 652 });
  });
});

describe('clamp and resize', () => {
  it('keeps the title bar reachable', () => {
    const r = clampRect({ x: -5000, y: -50, w: 400, h: 300 }, v);
    expect(r.y).toBe(0);
    expect(r.x + r.w).toBeGreaterThanOrEqual(80);
    const r2 = clampRect({ x: 5000, y: 5000, w: 400, h: 300 }, v);
    expect(r2.x).toBeLessThanOrEqual(920);
    expect(r2.y).toBeLessThanOrEqual(612);
  });
  it('enforces minimum size', () => {
    const r = resizeRect({ x: 100, y: 100, w: 400, h: 300 }, 'se', -1000, -1000);
    expect(r.w).toBe(MIN_W); expect(r.h).toBe(MIN_H);
  });
  it('resizing from the west/north moves the origin', () => {
    const r = resizeRect({ x: 100, y: 100, w: 400, h: 300 }, 'nw', 50, 40);
    expect(r).toEqual({ x: 150, y: 140, w: 350, h: 260 });
  });
  it('cascades without leaving the screen', () => {
    const r = cascadePosition(3, { w: 600, h: 400 }, v);
    expect(r.x).toBe(48 + 84); expect(r.y).toBe(32 + 84);
  });
});

describe('focus order', () => {
  it('picks the topmost visible window and skips the excluded one', () => {
    const ws = [{ id: 'a', z: 1, minimized: false }, { id: 'b', z: 3, minimized: false }, { id: 'c', z: 2, minimized: true }];
    expect(nextFocus(ws)).toBe('b');
    expect(nextFocus(ws, 'b')).toBe('a');
    expect(nextFocus([{ id: 'c', z: 2, minimized: true }])).toBe(null);
  });
});

describe('keyboard move and resize (F-05)', () => {
  const r = { x: 100, y: 100, w: 400, h: 300 };
  it('arrows move by one step', () => {
    expect(keyboardRect(r, 'ArrowRight', false, v)).toEqual({ ...r, x: 100 + KEY_STEP });
    expect(keyboardRect(r, 'ArrowLeft', false, v)).toEqual({ ...r, x: 100 - KEY_STEP });
    expect(keyboardRect(r, 'ArrowUp', false, v)).toEqual({ ...r, y: 100 - KEY_STEP });
    expect(keyboardRect(r, 'ArrowDown', false, v)).toEqual({ ...r, y: 100 + KEY_STEP });
  });
  it('Shift + arrows resize from the bottom-right corner and never go below the minimum', () => {
    expect(keyboardRect(r, 'ArrowRight', true, v)).toEqual({ ...r, w: 400 + KEY_STEP });
    expect(keyboardRect(r, 'ArrowUp', true, v)).toEqual({ ...r, h: 300 - KEY_STEP });
    const small = { x: 10, y: 10, w: MIN_W, h: MIN_H };
    expect(keyboardRect(small, 'ArrowLeft', true, v)).toEqual(small);
    expect(keyboardRect(small, 'ArrowUp', true, v)).toEqual(small);
  });
  it('keeps the title bar reachable', () => {
    expect(keyboardRect({ x: 0, y: 0, w: 400, h: 300 }, 'ArrowUp', false, v)?.y).toBe(0);
    expect(keyboardRect({ x: 920, y: 100, w: 400, h: 300 }, 'ArrowRight', false, v)?.x).toBe(920);
  });
  it('ignores other keys, including names that exist on every object', () => {
    expect(keyboardRect(r, 'a', false, v)).toBeNull();
    expect(keyboardRect(r, 'Enter', true, v)).toBeNull();
    expect(keyboardRect(r, 'constructor', false, v)).toBeNull();
    expect(keyboardRect(r, 'toString', true, v)).toBeNull();
  });
});

describe('snap buttons (F-05)', () => {
  it('pressing the button of the current side restores, any other press snaps', () => {
    expect(snapAction({}, 'left')).toBe('snap');
    expect(snapAction({ snapped: 'left' }, 'left')).toBe('restore');
    expect(snapAction({ snapped: 'left' }, 'right')).toBe('snap');
    expect(snapAction({ snapped: 'right' }, 'right')).toBe('restore');
  });
  it('hides the buttons in very narrow windows', () => {
    expect(showSnapButtons(SNAP_BUTTONS_MIN_W - 1)).toBe(false);
    expect(showSnapButtons(SNAP_BUTTONS_MIN_W)).toBe(true);
    expect(showSnapButtons(MIN_W)).toBe(false);
  });
});
