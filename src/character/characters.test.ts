import { describe, it, expect } from 'vitest';
import { CHARACTER_IDS, CHARACTER_STYLES, CHARACTER_VARIANTS } from '../core/characterChoice';
import { buildPortraitSvg } from './characterArt';
import { CHARACTERS, charactersByStyle, getCharacter } from './characters';

describe('character catalogue', () => {
  it('has exactly the 12 known ids, in order', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(CHARACTER_IDS);
  });
  it('gives every character a name in both languages, all names different', () => {
    for (const c of CHARACTERS) {
      expect(c.name.en.trim().length).toBeGreaterThan(0);
      expect(c.name.bn.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(CHARACTERS.map((c) => c.name.en)).size).toBe(12);
    expect(new Set(CHARACTERS.map((c) => c.name.bn)).size).toBe(12);
  });
  it('uses real hex colors only', () => {
    for (const c of CHARACTERS) for (const v of Object.values(c.look)) expect(v).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('groups into the 4 styles with 3 looks each, in the fixed order', () => {
    const groups = charactersByStyle();
    expect(groups.map((g) => g.style)).toEqual([...CHARACTER_STYLES]);
    for (const g of groups) expect(g.items.map((i) => i.variant)).toEqual([...CHARACTER_VARIANTS]);
  });
  it('getCharacter finds every id and rejects unknown ones', () => {
    for (const id of CHARACTER_IDS) expect(getCharacter(id).id).toBe(id);
    expect(() => getCharacter('nope-x' as never)).toThrow();
  });
});

const ALLOWED = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'linearGradient', 'stop', 'defs', 'clipPath']);

/** Tiny well-formedness check: tags balance, only drawing elements appear. Returns the element names it saw. */
function checkTags(svg: string): string[] {
  const seen: string[] = [];
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = m;
    if (!name) continue;
    seen.push(name);
    if (selfClosing) continue;
    if (closing) { expect(stack.pop()).toBe(name); } else { stack.push(name); }
  }
  expect(stack).toEqual([]);
  return seen;
}

describe('character art', () => {
  it('draws every character, open and blinking, as a well-formed, safe SVG', () => {
    for (const c of CHARACTERS) {
      for (const eyes of ['open', 'blink'] as const) {
        const svg = buildPortraitSvg(c, { eyes });
        expect(svg.startsWith('<svg ')).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg).toContain('viewBox="0 0 120 140"');
        expect(svg).toContain('aria-hidden="true"');
        expect(svg).not.toMatch(/<script|<foreignObject|<image|<use|\son[a-z]+=|javascript:|href=/i);
        for (const name of checkTags(svg)) expect(ALLOWED.has(name)).toBe(true);
      }
    }
  });
  it('blinking really changes the eyes', () => {
    for (const c of CHARACTERS) expect(buildPortraitSvg(c, { eyes: 'blink' })).not.toBe(buildPortraitSvg(c, { eyes: 'open' }));
  });
  it('keeps the face parts as separate layers', () => {
    for (const c of CHARACTERS) expect(buildPortraitSvg(c)).toContain('data-layer="eyes"');
  });
  it('uses ids that are unique across the whole gallery, and every url(#id) points at one', () => {
    const all = new Set<string>();
    for (const c of CHARACTERS) {
      const svg = buildPortraitSvg(c);
      const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] as string);
      for (const id of ids) { expect(all.has(id)).toBe(false); all.add(id); }
      for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(m[1] as string);
    }
  });
});
