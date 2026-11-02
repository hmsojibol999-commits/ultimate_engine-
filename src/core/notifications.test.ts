import { describe, it, expect } from 'vitest';
import { addNotice, markAllRead, removeNotice, unreadCount, pushToast, dismissToast, toastLifetimeMs, MAX_NOTICES, MAX_TOASTS, DEDUPE_MS, type Notice } from './notificationLogic';

describe('notification logic', () => {
  it('adds newest first, unread, trimmed', () => {
    let list: Notice[] = [];
    list = addNotice(list, { kind: 'info', text: '  first ' }, 1000, 'a').list;
    list = addNotice(list, { kind: 'success', text: 'second' }, 2000, 'b').list;
    expect(list.map((n) => n.id)).toEqual(['b', 'a']);
    expect(list[1]?.text).toBe('first');
    expect(unreadCount(list)).toBe(2);
  });
  it('ignores empty text', () => {
    const r = addNotice([], { kind: 'info', text: '   ' }, 1, 'x');
    expect(r.added).toBeNull();
    expect(r.list).toHaveLength(0);
  });
  it('ignores an identical notice inside the dedupe window but accepts it later', () => {
    const first = addNotice([], { kind: 'error', text: 'Saved failed' }, 0, 'a').list;
    expect(addNotice(first, { kind: 'error', text: 'Saved failed' }, DEDUPE_MS - 1, 'b').added).toBeNull();
    expect(addNotice(first, { kind: 'error', text: 'Saved failed' }, DEDUPE_MS, 'c').added).not.toBeNull();
    expect(addNotice(first, { kind: 'info', text: 'Saved failed' }, 10, 'd').added).not.toBeNull();
  });
  it('caps history at MAX_NOTICES and drops the oldest', () => {
    let list: Notice[] = [];
    for (let i = 0; i < MAX_NOTICES + 5; i++) list = addNotice(list, { kind: 'info', text: `n${i}` }, i * 10000, `id${i}`).list;
    expect(list).toHaveLength(MAX_NOTICES);
    expect(list[0]?.text).toBe(`n${MAX_NOTICES + 4}`);
  });
  it('marks read, removes, and keeps the same array when nothing changes', () => {
    const list = addNotice([], { kind: 'info', text: 'x' }, 0, 'a').list;
    const read = markAllRead(list);
    expect(unreadCount(read)).toBe(0);
    expect(markAllRead(read)).toBe(read);
    expect(removeNotice(read, 'a')).toHaveLength(0);
  });
  it('shows at most MAX_TOASTS toasts, oldest dropped, and dismisses by id', () => {
    let toasts: Notice[] = [];
    for (let i = 0; i < MAX_TOASTS + 2; i++) toasts = pushToast(toasts, { id: `t${i}`, kind: 'info', text: 'x', at: i, read: false });
    expect(toasts.map((t) => t.id)).toEqual(['t2', 't3', 't4']);
    expect(dismissToast(toasts, 't3').map((t) => t.id)).toEqual(['t2', 't4']);
  });
  it('keeps errors on screen longer than info', () => {
    expect(toastLifetimeMs('error')).toBeGreaterThan(toastLifetimeMs('warning'));
    expect(toastLifetimeMs('warning')).toBeGreaterThan(toastLifetimeMs('info'));
    expect(toastLifetimeMs('success')).toBe(toastLifetimeMs('info'));
  });
});
