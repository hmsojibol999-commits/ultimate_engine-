import { describe, it, expect } from 'vitest';
import { CHANGELOG } from './changelog';
import { SHORTCUTS } from './shortcuts';
import { SITE } from '../config/site';
import { en } from './strings.en';
import { bn } from './strings.bn';

describe('changelog', () => {
  it('lists the current version first', () => {
    expect(CHANGELOG[0]?.version).toBe(SITE.VERSION);
  });
  it('has the same number of non-empty items in both languages and ISO dates', () => {
    for (const e of CHANGELOG) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(e.date)).toBe(true);
      expect(e.items.en.length).toBeGreaterThan(0);
      expect(e.items.bn).toHaveLength(e.items.en.length);
      for (const s of [...e.items.en, ...e.items.bn]) expect(s.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('shortcuts', () => {
  it('has unique ids and labels that exist in both languages', () => {
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
    for (const s of SHORTCUTS) {
      expect(s.keys.length).toBeGreaterThan(0);
      expect(typeof (en as Record<string, string>)[s.label]).toBe('string');
      expect(typeof (bn as Record<string, string>)[s.label]).toBe('string');
    }
  });
});
