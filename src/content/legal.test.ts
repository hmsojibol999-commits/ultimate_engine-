import { describe, it, expect } from 'vitest';
import { LEGAL_UPDATED, PRIVACY, TERMS, type LegalSection } from './legal';

const BN_LETTER = /[ঀ-৿]/;

function checkSections(name: string, list: LegalSection[]) {
  describe(name, () => {
    it('has unique ids and at least one section', () => {
      expect(list.length).toBeGreaterThan(0);
      expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
    });
    it('has non-empty text in both languages with the same paragraph count', () => {
      for (const s of list) {
        expect(s.heading.en.length).toBeGreaterThan(0);
        expect(s.heading.bn.length).toBeGreaterThan(0);
        expect(s.body.en.length).toBeGreaterThan(0);
        expect(s.body.bn).toHaveLength(s.body.en.length);
        for (const p of [...s.body.en, ...s.body.bn]) expect(p.trim().length).toBeGreaterThan(0);
      }
    });
    it('Bengali text really is Bengali and has no leftover placeholders', () => {
      for (const s of list) {
        expect(BN_LETTER.test(s.heading.bn)).toBe(true);
        for (const p of s.body.bn) expect(BN_LETTER.test(p)).toBe(true);
        for (const p of [...s.body.en, ...s.body.bn]) expect(/TODO|lorem|\{\w+\}/i.test(p)).toBe(false);
      }
    });
  });
}

checkSections('privacy', PRIVACY);
checkSections('terms', TERMS);

describe('legal date', () => {
  it('is an ISO date', () => { expect(/^\d{4}-\d{2}-\d{2}$/.test(LEGAL_UPDATED)).toBe(true); });
});
