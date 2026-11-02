import { describe, it, expect } from 'vitest';
import type { AppCategory, AppManifest } from '../core/registry';
import { CATEGORY_LABEL, CATEGORY_ORDER, agoParts, buildAboutCard, groupApps, hasHireContacts, moveIndex, pickRecentFiles, trapTab } from './startMenuLogic';

const app = (id: string, category: AppCategory, en: string, bn = en, enabled = true): AppManifest => ({
  id, category, enabled,
  names: { en, bn }, description: { en: '', bn: '' }, icon: 'AppWindow',
  defaultSize: { w: 400, h: 300 }, opens: [], keywords: [],
  load: () => Promise.reject(new Error('not used in tests')),
});

describe('groupApps', () => {
  it('uses the fixed category order and skips empty categories', () => {
    const groups = groupApps([app('a', 'dev', 'A'), app('b', 'start', 'B'), app('c', 'learn', 'C')], 'en');
    expect(groups.map((g) => g.category)).toEqual(['start', 'dev', 'learn']);
  });
  it('sorts apps by the name in the current language', () => {
    const apps = [app('z', 'start', 'Zed', 'আ'), app('a', 'start', 'Alpha', 'ই')];
    expect(groupApps(apps, 'en')[0]?.apps.map((a) => a.id)).toEqual(['a', 'z']);
    expect(groupApps(apps, 'bn')[0]?.apps.map((a) => a.id)).toEqual(['z', 'a']);
  });
  it('hides disabled apps and returns nothing for an empty list', () => {
    expect(groupApps([app('x', 'start', 'X', 'X', false)], 'en')).toEqual([]);
    expect(groupApps([], 'en')).toEqual([]);
  });
  it('keeps an app with an unknown category visible under start', () => {
    const odd = app('odd', 'start', 'Odd');
    (odd as { category: string }).category = 'mystery';
    expect(groupApps([odd], 'en')[0]?.category).toBe('start');
  });
  it('has a label key for every category', () => {
    for (const c of CATEGORY_ORDER) expect(CATEGORY_LABEL[c]).toBe(`start.cat.${c}`);
  });
});

describe('pickRecentFiles', () => {
  const files = [
    { path: '/old.txt', kind: 'file' as const, mtime: 100 },
    { path: '/docs', kind: 'dir' as const, mtime: 900 },
    { path: '/docs/new.md', kind: 'file' as const, mtime: 500 },
    { path: '/b.txt', kind: 'file' as const, mtime: 300 },
    { path: '/a.txt', kind: 'file' as const, mtime: 300 },
  ];
  it('returns newest files first and ignores folders', () => {
    expect(pickRecentFiles(files).map((f) => f.path)).toEqual(['/docs/new.md', '/a.txt', '/b.txt', '/old.txt']);
  });
  it('breaks ties by path so the order is stable', () => {
    expect(pickRecentFiles([files[3]!, files[4]!]).map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
  });
  it('respects the limit, including 0', () => {
    expect(pickRecentFiles(files, 2)).toHaveLength(2);
    expect(pickRecentFiles(files, 0)).toEqual([]);
  });
  it('fills name and folder', () => {
    expect(pickRecentFiles(files, 1)[0]).toEqual({ path: '/docs/new.md', name: 'new.md', dir: '/docs', mtime: 500 });
  });
  it('does not change the input array', () => {
    const copy = files.map((f) => f.path);
    pickRecentFiles(files);
    expect(files.map((f) => f.path)).toEqual(copy);
  });
  it('handles no files', () => { expect(pickRecentFiles([])).toEqual([]); });
});

describe('agoParts', () => {
  const now = 10_000_000_000;
  it('is "now" under one minute and for times in the future', () => {
    expect(agoParts(now - 59_000, now)).toEqual({ unit: 'now', n: 0 });
    expect(agoParts(now + 5_000, now)).toEqual({ unit: 'now', n: 0 });
  });
  it('counts minutes, hours and days', () => {
    expect(agoParts(now - 60_000, now)).toEqual({ unit: 'min', n: 1 });
    expect(agoParts(now - 59 * 60_000, now)).toEqual({ unit: 'min', n: 59 });
    expect(agoParts(now - 60 * 60_000, now)).toEqual({ unit: 'hour', n: 1 });
    expect(agoParts(now - 23 * 3_600_000, now)).toEqual({ unit: 'hour', n: 23 });
    expect(agoParts(now - 24 * 3_600_000, now)).toEqual({ unit: 'day', n: 1 });
    expect(agoParts(now - 5 * 86_400_000, now)).toEqual({ unit: 'day', n: 5 });
  });
});

describe('moveIndex', () => {
  it('moves down and up with wrap-around', () => {
    expect(moveIndex(0, 3, 'ArrowDown')).toBe(1);
    expect(moveIndex(2, 3, 'ArrowDown')).toBe(0);
    expect(moveIndex(0, 3, 'ArrowUp')).toBe(2);
    expect(moveIndex(2, 3, 'ArrowUp')).toBe(1);
  });
  it('supports Home and End', () => {
    expect(moveIndex(1, 4, 'Home')).toBe(0);
    expect(moveIndex(1, 4, 'End')).toBe(3);
  });
  it('starts at the ends when nothing is focused', () => {
    expect(moveIndex(-1, 3, 'ArrowDown')).toBe(0);
    expect(moveIndex(-1, 3, 'ArrowUp')).toBe(2);
  });
  it('ignores other keys and handles no items', () => {
    expect(moveIndex(1, 3, 'a')).toBe(1);
    expect(moveIndex(0, 0, 'ArrowDown')).toBe(-1);
  });
});

describe('trapTab', () => {
  it('wraps from the last item forward and from the first item backward', () => {
    expect(trapTab(2, 3, false)).toBe(0);
    expect(trapTab(0, 3, true)).toBe(2);
  });
  it('lets the browser move inside the menu', () => {
    expect(trapTab(0, 3, false)).toBeNull();
    expect(trapTab(1, 3, true)).toBeNull();
  });
  it('pulls focus back in when it is outside', () => {
    expect(trapTab(-1, 3, false)).toBe(0);
    expect(trapTab(-1, 3, true)).toBe(2);
  });
  it('does nothing without items', () => { expect(trapTab(-1, 0, false)).toBeNull(); });
  it('wraps a single item onto itself', () => {
    expect(trapTab(0, 1, false)).toBe(0);
    expect(trapTab(0, 1, true)).toBe(0);
  });
});

describe('buildAboutCard', () => {
  const ph = (v: string): boolean => v === '' || v.startsWith('TODO') || v === 'OWNER_NAME';
  it('shows no name, no tagline and no buttons while everything is a placeholder', () => {
    const card = buildAboutCard({ OWNER_NAME: 'OWNER_NAME', TAGLINE: 'I build things.' }, {}, ph);
    expect(card).toEqual({ name: null, tagline: null, buttons: [] });
    expect(hasHireContacts(card)).toBe(false);
  });
  it('shows the real name and tagline', () => {
    const card = buildAboutCard({ OWNER_NAME: 'Rafi', TAGLINE: 'I build fast tools.' }, {}, ph);
    expect(card.name).toBe('Rafi');
    expect(card.tagline).toBe('I build fast tools.');
  });
  it('orders buttons: whatsapp, telegram, email, then github', () => {
    const card = buildAboutCard({ OWNER_NAME: 'Rafi', TAGLINE: 'x' }, {
      github: 'https://github.com/x', email: 'mailto:a@b.co', telegram: 'https://t.me/x', whatsapp: 'https://wa.me/1',
    }, ph);
    expect(card.buttons.map((b) => b.kind)).toEqual(['whatsapp', 'telegram', 'email', 'github']);
  });
  it('does not count GitHub alone as a way to hire the owner', () => {
    const card = buildAboutCard({ OWNER_NAME: 'Rafi', TAGLINE: 'x' }, { github: 'https://github.com/x' }, ph);
    expect(card.buttons).toHaveLength(1);
    expect(hasHireContacts(card)).toBe(false);
  });
  it('counts any real contact', () => {
    const card = buildAboutCard({ OWNER_NAME: 'OWNER_NAME', TAGLINE: '' }, { email: 'mailto:a@b.co' }, ph);
    expect(hasHireContacts(card)).toBe(true);
  });
});
