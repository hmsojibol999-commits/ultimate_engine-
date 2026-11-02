import { describe, it, expect } from 'vitest';
import { BROWS_KINDS, completeFace, DEFAULT_FACE, EYES_KINDS, HANDS_KINDS, MOUTH_KINDS, buildPortraitSvg, type Face } from './characterArt';
import { CHARACTERS } from './characters';

const ALLOWED = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'linearGradient', 'stop', 'defs', 'clipPath']);

/** Returns null when the SVG is well formed and uses only drawing elements, otherwise a short reason. Fast: no expect() per tag. */
function problem(svg: string): string | null {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = m;
    if (!name) continue;
    if (!ALLOWED.has(name)) return `element ${name} not allowed`;
    if (selfClosing) continue;
    if (closing) { if (stack.pop() !== name) return `unbalanced ${name}`; } else stack.push(name);
  }
  if (stack.length > 0) return `unclosed ${stack.join(',')}`;
  if (/NaN|undefined|Infinity|null/.test(svg)) return 'bad number or text in output';
  if (/<script|<foreignObject|<image|<use|\son[a-z]+=|javascript:|href=/i.test(svg)) return 'unsafe content';
  return null;
}

const layer = (svg: string, name: string): string | undefined => svg.match(new RegExp(`<g data-layer="${name}">([\\s\\S]*?)</g>`))?.[1];
const withFace = (patch: Partial<Face>): Partial<Face> => patch;

describe('face options', () => {
  it('lists the options in a fixed order, default first where it makes sense', () => {
    expect([...EYES_KINDS]).toEqual(['open', 'blink', 'happy', 'wide', 'up']);
    expect([...MOUTH_KINDS]).toEqual(['smile', 'grin', 'open', 'flat', 'frown']);
    expect([...BROWS_KINDS]).toEqual(['neutral', 'raised', 'worried']);
    expect([...HANDS_KINDS]).toEqual(['down', 'wave', 'point', 'chin', 'cheer']);
  });
  it('completeFace fills missing parts and replaces unknown values with the default', () => {
    expect(completeFace()).toEqual(DEFAULT_FACE);
    expect(completeFace({ mouth: 'grin' })).toEqual({ ...DEFAULT_FACE, mouth: 'grin' });
    expect(completeFace({ eyes: 'sparkle' as never, hands: 42 as never })).toEqual(DEFAULT_FACE);
    expect(completeFace({ eyes: undefined })).toEqual(DEFAULT_FACE);
  });
});

describe('swappable parts (C-02)', () => {
  it('draws every combination of eyes, mouth, brows and hands as a safe, well-formed SVG, for all 12 characters', () => {
    let checked = 0;
    for (const c of CHARACTERS) {
      for (const eyes of EYES_KINDS) for (const mouth of MOUTH_KINDS) for (const brows of BROWS_KINDS) for (const hands of HANDS_KINDS) {
        const svg = buildPortraitSvg(c, { eyes, mouth, brows, hands });
        const why = problem(svg);
        if (why) throw new Error(`${c.id} ${eyes}/${mouth}/${brows}/${hands}: ${why}`);
        checked += 1;
      }
    }
    expect(checked).toBe(12 * 5 * 5 * 3 * 5);
  });
  it('every eyes option looks different from every other, for every character', () => {
    for (const c of CHARACTERS) {
      const looks = EYES_KINDS.map((eyes) => layer(buildPortraitSvg(c, withFace({ eyes })), 'eyes'));
      expect(new Set(looks).size).toBe(EYES_KINDS.length);
    }
  });
  it('every mouth option looks different from every other, for every character', () => {
    for (const c of CHARACTERS) {
      const looks = MOUTH_KINDS.map((mouth) => layer(buildPortraitSvg(c, withFace({ mouth })), 'mouth'));
      expect(new Set(looks).size).toBe(MOUTH_KINDS.length);
    }
  });
  it('every brows option looks different, for every character (robots show no brows when neutral)', () => {
    for (const c of CHARACTERS) {
      const looks = BROWS_KINDS.map((brows) => layer(buildPortraitSvg(c, withFace({ brows })), 'brows') ?? '');
      expect(new Set(looks).size).toBe(BROWS_KINDS.length);
      if (c.style === 'robot') expect(looks[0]).toBe('');
      else expect((looks[0] ?? '').length).toBeGreaterThan(0);
    }
  });
  it('raised and worried brows really move: raised sits higher than neutral, worried has a higher inner end', () => {
    const c = CHARACTERS.find((x) => x.id === 'human-a');
    if (!c) throw new Error('human-a missing');
    const firstY = (brows: 'neutral' | 'raised' | 'worried'): number => Number((layer(buildPortraitSvg(c, { brows }), 'brows') ?? '').match(/d="M[\d.]+ ([\d.]+)/)?.[1]);
    const innerY = (brows: 'neutral' | 'worried'): number => Number((layer(buildPortraitSvg(c, { brows }), 'brows') ?? '').match(/d="M[\d.]+ [\d.]+ Q[\d.]+ [\d.]+ [\d.]+ ([\d.]+)/)?.[1]);
    expect(firstY('raised')).toBeLessThan(firstY('neutral'));
    expect(innerY('worried')).toBeLessThan(innerY('neutral'));
  });
  it('hands: "down" draws no arms and no hands, every other option draws both on separate layers', () => {
    for (const c of CHARACTERS) {
      const down = buildPortraitSvg(c, { hands: 'down' });
      expect(down).not.toContain('data-layer="hands"');
      expect(down).not.toContain('data-layer="arms"');
      const seen = new Set<string>();
      for (const hands of HANDS_KINDS) {
        if (hands === 'down') continue;
        const svg = buildPortraitSvg(c, { hands });
        expect(layer(svg, 'hands')).toBeDefined();
        expect(layer(svg, 'arms')).toBeDefined();
        seen.add(layer(svg, 'hands') ?? '');
      }
      expect(seen.size).toBe(HANDS_KINDS.length - 1);
    }
  });
  it('arms sit behind the body and hands on top of everything', () => {
    for (const c of CHARACTERS) {
      const svg = buildPortraitSvg(c, { hands: 'wave' });
      const at = (name: string): number => svg.indexOf(`data-layer="${name}"`);
      expect(at('arms')).toBeLessThan(at('body'));
      expect(at('hands')).toBeGreaterThan(at('eyes'));
      expect(at('hands')).toBeGreaterThan(at('mouth'));
      if (c.style !== 'robot') expect(at('hands')).toBeGreaterThan(at('frontHair'));
    }
  });
  it('cheer draws two hands (left and right), wave only one', () => {
    const c = CHARACTERS[0];
    if (!c) throw new Error('no characters');
    const palms = (hands: 'wave' | 'cheer'): number => (layer(buildPortraitSvg(c, { hands }), 'hands')?.match(/stroke-width="15"/g) ?? []).length;
    expect(palms('wave')).toBe(1);
    expect(palms('cheer')).toBe(2);
  });
  it('cartoon hands get the thick dark outline, other styles do not', () => {
    const outlined = (id: string): boolean => {
      const c = CHARACTERS.find((x) => x.id === id);
      if (!c) throw new Error(`${id} missing`);
      return (layer(buildPortraitSvg(c, { hands: 'point' }), 'hands') ?? '').includes('stroke="#1b1b2f"');
    };
    expect(outlined('cartoon-a')).toBe(true);
    expect(outlined('human-a')).toBe(false);
    expect(outlined('anime-b')).toBe(false);
    expect(outlined('robot-c')).toBe(false);
  });
  it('robot hands carry an accent light, human hands do not', () => {
    const accentDots = (id: string): number => {
      const c = CHARACTERS.find((x) => x.id === id);
      if (!c) throw new Error(`${id} missing`);
      return (layer(buildPortraitSvg(c, { hands: 'wave' }), 'hands') ?? '').split(`stroke="${c.look.accent}"`).length - 1;
    };
    expect(accentDots('robot-a')).toBe(1);
    expect(accentDots('human-c')).toBe(0);
  });
  it('the default face is the same picture as before C-02 (no hands, smile, neutral brows)', () => {
    for (const c of CHARACTERS) {
      const svg = buildPortraitSvg(c);
      expect(svg).toBe(buildPortraitSvg(c, DEFAULT_FACE));
      expect(svg).not.toContain('data-layer="hands"');
    }
  });
  it('keeps gradient ids unique even when many faces are drawn', () => {
    for (const c of CHARACTERS) {
      const svg = buildPortraitSvg(c, { eyes: 'happy', mouth: 'grin', hands: 'cheer' });
      const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
