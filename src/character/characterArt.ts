import type { CharacterFace } from '../core/characterExpressionLogic';
import type { CharacterDef, Look } from './characters';

/**
 * Original character art as layered SVG strings (C-01 draws the gallery, C-02 adds swappable face parts and hands).
 * Every part is its own group (data-layer): antenna, backHair, arms, body, neck, head, eyes, brows, nose, mouth,
 * frontHair, hands. A `Face` picks one option for each swappable part; C-03 maps real events to faces.
 * Only our own constants go in, never user text, so the string is safe to inject.
 */
export type EyesKind = CharacterFace['eyes'];
export type MouthKind = CharacterFace['mouth'];
export type BrowsKind = CharacterFace['brows'];
export type HandsKind = CharacterFace['hands'];
export type Face = CharacterFace;
export const EYES_KINDS = ['open', 'blink', 'happy', 'wide', 'up'] as const satisfies readonly EyesKind[];
export const MOUTH_KINDS = ['smile', 'grin', 'open', 'flat', 'frown'] as const satisfies readonly MouthKind[];
export const BROWS_KINDS = ['neutral', 'raised', 'worried'] as const satisfies readonly BrowsKind[];
export const HANDS_KINDS = ['down', 'wave', 'point', 'chin', 'cheer'] as const satisfies readonly HandsKind[];
export const DEFAULT_FACE: Face = { eyes: 'open', mouth: 'smile', brows: 'neutral', hands: 'down' };

const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : fallback;

/** Fills missing or unknown options with the defaults, so callers can pass only what they want to change. */
export const completeFace = (face: Partial<Face> = {}): Face => ({
  eyes: pick(EYES_KINDS, face.eyes, DEFAULT_FACE.eyes),
  mouth: pick(MOUTH_KINDS, face.mouth, DEFAULT_FACE.mouth),
  brows: pick(BROWS_KINDS, face.brows, DEFAULT_FACE.brows),
  hands: pick(HANDS_KINDS, face.hands, DEFAULT_FACE.hands),
});

export const PORTRAIT_VIEWBOX = { w: 120, h: 140 } as const;

const DARK = '#1b1b2f';
const MOUTH = '#8a3b3b';
const TONGUE = '#ff8aa0';

const g = (name: string, inner: string): string => (inner ? `<g data-layer="${name}">${inner}</g>` : '');
const stroke = (d: string, color: string, w: number): string => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const closedEye = (cx: number, cy: number, half: number, color: string, w: number): string => stroke(`M${cx - half} ${cy} Q${cx} ${cy + half * 0.7} ${cx + half} ${cy}`, color, w);
const fillPath = (d: string, color: string, extra = ''): string => `<path d="${d}" fill="${color}" ${extra}/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, color: string): string => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}"/>`;
const circle = (cx: number, cy: number, r: number, color: string): string => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;

/* ---------- brows: one geometry per style, three moods ---------- */
interface BrowGeo { outer: number; ctrl: number; inner: number; yOuter: number; yCtrl: number; yInner: number; color: string; w: number }

/** Left brow is drawn from the geometry, the right one is its mirror around x = 60. */
function browPair(geo: BrowGeo, kind: BrowsKind): string {
  let { yOuter, yCtrl, yInner } = geo;
  if (kind === 'raised') { yOuter -= 3.5; yCtrl -= 4.5; yInner -= 3.5; }
  if (kind === 'worried') { yOuter += 1.8; yCtrl -= 1; yInner -= 3.2; }
  const left = `M${geo.outer} ${yOuter} Q${geo.ctrl} ${yCtrl} ${geo.inner} ${yInner}`;
  const right = `M${120 - geo.outer} ${yOuter} Q${120 - geo.ctrl} ${yCtrl} ${120 - geo.inner} ${yInner}`;
  return stroke(left, geo.color, geo.w) + stroke(right, geo.color, geo.w);
}

/* ---------- hands and arms ---------- */
/** One thick round-capped line. A zero-length line (`h0.01`) with round caps is a dot, used for palms and fists. */
interface Part { d: string; w: number; skin: boolean }
const sleeve = (d: string): Part => ({ d, w: 9, skin: false });
const skin = (d: string, w: number): Part => ({ d, w, skin: true });
const dotPart = (x: number, y: number, w: number): Part => skin(`M${x} ${y} h0.01`, w);

interface HandArt { parts: Part[]; marks: Array<[number, number]> }

/** Open hand with four fingers and a thumb; the palm centre is (cx, cy). m = 1 draws the right side, -1 the mirrored left side. */
function openHand(cx: number, cy: number, m: 1 | -1): HandArt {
  const X = (x: number): number => (m === 1 ? x : 120 - x);
  const P = (x: number, y: number): string => `${X(x)} ${y}`;
  return {
    parts: [
      sleeve(`M${P(96, 126)} Q${P(cx + 3, cy + 24)} ${P(cx, cy + 9)}`),
      skin(`M${P(cx, cy - 4)} L${P(cx - 6, cy - 14)}`, 3.6),
      skin(`M${P(cx, cy - 4)} L${P(cx - 1, cy - 16)}`, 3.6),
      skin(`M${P(cx, cy - 4)} L${P(cx + 4, cy - 15)}`, 3.6),
      skin(`M${P(cx, cy - 4)} L${P(cx + 9, cy - 11)}`, 3.4),
      skin(`M${P(cx - 7, cy + 2)} L${P(cx - 12, cy - 3)}`, 4),
      dotPart(X(cx), cy, 15),
    ],
    marks: [[X(cx), cy]],
  };
}

function handArt(kind: Exclude<HandsKind, 'down'>): HandArt {
  switch (kind) {
    case 'wave': return openHand(104, 88, 1);
    case 'cheer': {
      const right = openHand(107, 76, 1); const left = openHand(107, 76, -1);
      return { parts: [...left.parts, ...right.parts], marks: [...left.marks, ...right.marks] };
    }
    case 'point': return {
      parts: [sleeve('M96 126 Q106 118 105 106'), skin('M105 95 L105 79', 4.6), skin('M99 101 L96.5 97', 4), dotPart(105, 99, 14)],
      marks: [[105, 99]],
    };
    case 'chin': return {
      parts: [sleeve('M98 130 Q101 110 89 101'), skin('M86 91 L85 80', 4.2), skin('M80 98 L76 95', 3.6), dotPart(84, 95, 13)],
      marks: [[84, 95]],
    };
  }
}

/** Sleeves go BEHIND the body (they come out from behind the shoulder); hands go on top of everything. */
function handLayers(d: CharacterDef, kind: HandsKind): { arms: string; hands: string } {
  if (kind === 'down') return { arms: '', hands: '' };
  const L = d.look;
  const outline = d.style === 'cartoon' ? DARK : null;
  const sleeveColor = d.style === 'robot' ? L.hairShade : L.outfit;
  const render = (list: Part[]): string =>
    (outline ? list.map((p) => stroke(p.d, outline, p.w + 3)).join('') : '') + list.map((p) => stroke(p.d, p.skin ? L.skin : sleeveColor, p.w)).join('');
  const art = handArt(kind);
  const marks = d.style === 'robot' ? art.marks.map(([x, y]) => stroke(`M${x} ${y} h0.01`, L.accent, 4.4)).join('') : '';
  return { arms: render(art.parts.filter((p) => !p.skin)), hands: render(art.parts.filter((p) => p.skin)) + marks };
}

/* ---------- friendly human style ---------- */
function humanEye(cx: number, kind: EyesKind, L: Look): string {
  const iris = (x: number, y: number, rx: number, ry: number, hl: number): string => ellipse(x, y, rx, ry, L.eye) + circle(x + 1.2, y - 1.3, hl, '#fff');
  switch (kind) {
    case 'blink': return closedEye(cx, 68, 4, DARK, 2);
    case 'happy': return stroke(`M${cx - 4.2} 69.5 Q${cx} 62.5 ${cx + 4.2} 69.5`, DARK, 2.2);
    case 'wide': return iris(cx, 68, 4.3, 5.1, 1.5);
    case 'up': return iris(cx + 1.4, 65.8, 3.3, 3.9, 1.2);
    case 'open': return iris(cx, 68, 3.3, 3.9, 1.2);
  }
}
function humanMouth(kind: MouthKind): string {
  switch (kind) {
    case 'smile': return stroke('M52 82 Q60 89 68 82', MOUTH, 2.4);
    case 'grin': return fillPath('M50 80 Q60 96 70 80 Z', MOUTH, `stroke="${MOUTH}" stroke-width="1.4" stroke-linejoin="round"`) + fillPath('M52.5 80.8 Q60 85 67.5 80.8 Z', '#fff');
    case 'open': return ellipse(60, 84, 4, 5, MOUTH);
    case 'flat': return stroke('M54 84 H66', MOUTH, 2.4);
    case 'frown': return stroke('M52 87 Q60 80.5 68 87', MOUTH, 2.4);
  }
}
function human(d: CharacterDef, f: Face): string {
  const L = d.look; const v = d.variant;
  const backHair = v === 'b'
    ? `<path d="M30 60 C26 28 44 16 60 16 C78 16 94 28 90 60 L95 114 C82 120 75 112 74 100 L46 100 C45 112 38 120 25 114 Z" fill="${L.hair}"/>`
    : v === 'c' ? `<path d="M31 62 C27 30 44 18 60 18 C78 18 93 30 89 62 L90 94 C80 100 76 92 74 86 L46 86 C44 92 40 100 30 94 Z" fill="${L.hair}"/><circle cx="60" cy="14" r="8" fill="${L.hair}"/>` : '';
  const body = `<path d="M10 140 C10 114 34 106 60 106 C86 106 110 114 110 140 Z" fill="${L.outfit}"/><path d="M46 107 L60 126 L74 107 Z" fill="${L.skin}"/><path d="M12 134 C20 124 36 118 52 118" fill="none" stroke="${L.outfit2}" stroke-width="3" stroke-linecap="round"/>`;
  const neck = `<rect x="51" y="86" width="18" height="24" rx="7" fill="${L.skinShade}"/>`;
  const head = `<ellipse cx="35" cy="66" rx="4" ry="6" fill="${L.skin}"/><ellipse cx="85" cy="66" rx="4" ry="6" fill="${L.skin}"/><ellipse cx="60" cy="64" rx="25" ry="29" fill="${L.skin}"/>`;
  const eyes = humanEye(49, f.eyes, L) + humanEye(71, f.eyes, L);
  const brows = browPair({ outer: 42, ctrl: 49, inner: 55, yOuter: 59, yCtrl: 55, yInner: 58, color: L.hair, w: 2.4 }, f.brows);
  const nose = stroke('M60 70 Q58 76 61 77', L.skinShade, 1.6);
  const frontHair = v === 'a'
    ? `<path d="M34 60 C30 32 46 22 62 22 C80 22 92 34 86 60 C84 48 78 40 66 38 C58 45 44 45 38 54 Z" fill="${L.hair}"/>`
    : v === 'b'
      ? `<path d="M35 58 C34 34 48 24 62 24 C78 24 88 34 85 58 C78 46 68 40 58 36 C52 44 42 50 35 58 Z" fill="${L.hair}"/>`
      : `<path d="M33 60 C30 32 46 20 62 20 C80 20 92 34 87 62 C84 48 76 40 60 40 C50 40 40 46 33 60 Z" fill="${L.hair}"/>`;
  const h = handLayers(d, f.hands);
  return g('backHair', backHair) + g('arms', h.arms) + g('body', body) + g('neck', neck) + g('head', head) + g('eyes', eyes) + g('brows', brows) + g('nose', nose) + g('mouth', humanMouth(f.mouth)) + g('frontHair', frontHair) + g('hands', h.hands);
}

/* ---------- anime-inspired style (large eyes, sharp fringe; original designs) ---------- */
/** dx/dy move the iris, pupil and highlights inside the white (used to look up). */
function animeEyeOpen(cx: number, L: Look, dx: number, dy: number): string {
  return `<ellipse cx="${cx}" cy="68" rx="7.6" ry="9.6" fill="#fff"/><ellipse cx="${cx + dx}" cy="${69 + dy}" rx="6.2" ry="8.4" fill="${L.eye}"/><ellipse cx="${cx + dx}" cy="${70 + dy}" rx="3" ry="4.8" fill="${DARK}"/><circle cx="${cx + dx - 2.2}" cy="${65.4 + dy}" r="2.2" fill="#fff"/><circle cx="${cx + dx + 2.4}" cy="${73 + dy}" r="1" fill="#fff"/>${stroke(`M${cx - 8} 64 Q${cx} 56 ${cx + 8} 64`, DARK, 2.4)}`;
}
function animeEye(cx: number, L: Look, kind: EyesKind): string {
  switch (kind) {
    case 'blink': return closedEye(cx, 69, 6, DARK, 2.6);
    case 'happy': return stroke(`M${cx - 7} 72 Q${cx} 61 ${cx + 7} 72`, DARK, 2.8);
    case 'wide': return `${ellipse(cx, 68, 8.6, 10.8, '#fff')}${ellipse(cx, 68.6, 5, 7, L.eye)}${ellipse(cx, 69, 2.2, 3.6, DARK)}${circle(cx - 1.8, 64.6, 2, '#fff')}${circle(cx + 2, 71.6, 0.9, '#fff')}${stroke(`M${cx - 8.8} 62.5 Q${cx} 53.5 ${cx + 8.8} 62.5`, DARK, 2.4)}`;
    case 'up': return animeEyeOpen(cx, L, 1, -2.2);
    case 'open': return animeEyeOpen(cx, L, 0, 0);
  }
}
function animeMouth(kind: MouthKind): string {
  switch (kind) {
    case 'smile': return stroke('M55 85 Q60 88.5 65 85', MOUTH, 2);
    case 'grin': return fillPath('M52.5 84 Q60 95 67.5 84 Z', MOUTH, `stroke="${MOUTH}" stroke-width="1.2" stroke-linejoin="round"`) + ellipse(60, 88, 3.2, 1.5, TONGUE);
    case 'open': return ellipse(60, 86.5, 3.6, 4.6, MOUTH);
    case 'flat': return stroke('M56 86 H64', MOUTH, 2);
    case 'frown': return stroke('M55 88.5 Q60 83.5 65 88.5', MOUTH, 2);
  }
}
function anime(d: CharacterDef, f: Face): string {
  const L = d.look; const v = d.variant;
  const backHair = v === 'b'
    ? `<path d="M30 60 C26 26 46 14 60 14 C76 14 94 26 90 60 L92 96 L80 100 L78 70 L42 70 L40 100 L28 96 Z" fill="${L.hair}"/><ellipse cx="22" cy="86" rx="9" ry="26" fill="${L.hair}" transform="rotate(10 22 86)"/><ellipse cx="98" cy="86" rx="9" ry="26" fill="${L.hair}" transform="rotate(-10 98 86)"/>`
    : `<path d="M30 62 C26 26 46 14 60 14 C76 14 94 26 90 62 L88 76 L32 76 Z" fill="${L.hair}"/>`;
  const body = `<path d="M12 140 C12 116 34 108 60 108 C86 108 108 116 108 140 Z" fill="${L.outfit}"/><path d="M44 109 L60 124 L76 109 Z" fill="${L.skin}"/><path d="M48 110 L60 130 L72 110" fill="none" stroke="${L.outfit2}" stroke-width="3" stroke-linejoin="round"/>`;
  const neck = `<rect x="52" y="90" width="16" height="22" rx="6" fill="${L.skinShade}"/>`;
  const head = `<path d="M33 62 C33 40 44 32 60 32 C76 32 87 40 87 62 C87 80 74 94 60 96 C46 94 33 80 33 62 Z" fill="${L.skin}"/><ellipse cx="42" cy="80" rx="5" ry="2.8" fill="#ff8aa8" opacity="0.35"/><ellipse cx="78" cy="80" rx="5" ry="2.8" fill="#ff8aa8" opacity="0.35"/>`;
  const eyes = animeEye(47, L, f.eyes) + animeEye(73, L, f.eyes);
  const brows = browPair({ outer: 38, ctrl: 46, inner: 54, yOuter: 53, yCtrl: 49, yInner: 52, color: L.hairShade, w: 2.2 }, f.brows);
  const frontHair = v === 'a'
    ? `<path d="M31 64 C26 30 46 16 62 16 C82 16 94 30 89 64 L84 44 L78 58 L70 38 L62 56 L54 36 L46 56 L38 42 Z" fill="${L.hair}"/>`
    : v === 'b'
      ? `<path d="M31 62 C28 30 46 16 62 16 C82 16 93 30 89 62 C86 50 80 44 72 40 C70 50 62 56 56 42 C50 52 40 54 35 62 Z" fill="${L.hair}"/><path d="M80 24 l4 -8 l4 8 l-8 -5 h8 z" fill="${L.outfit2}"/>`
      : `<path d="M30 66 C26 30 46 16 62 16 C84 16 94 32 88 66 C86 50 78 42 64 40 C56 48 44 52 36 60 Z" fill="${L.hair}"/><path d="M28 50 l8 4 M28 56 l8 2" stroke="${L.outfit2}" stroke-width="2.4" stroke-linecap="round"/>`;
  const h = handLayers(d, f.hands);
  return g('backHair', backHair) + g('arms', h.arms) + g('body', body) + g('neck', neck) + g('head', head) + g('eyes', eyes) + g('brows', brows) + g('mouth', animeMouth(f.mouth)) + g('frontHair', frontHair) + g('hands', h.hands);
}

/* ---------- cartoon style (round head, thick outline) ---------- */
const OUTLINE = `stroke="${DARK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
function cartoonEye(cx: number, kind: EyesKind): string {
  switch (kind) {
    case 'blink': return closedEye(cx, 62, 5, DARK, 3);
    case 'happy': return stroke(`M${cx - 6} 64.5 Q${cx} 55 ${cx + 6} 64.5`, DARK, 3.4);
    case 'wide': return ellipse(cx, 62, 6, 7.8, DARK) + circle(cx + 1.8, 59, 2.4, '#fff');
    case 'up': return ellipse(cx + 1.5, 59.8, 5, 6.4, DARK) + circle(cx + 3.3, 57.4, 2, '#fff');
    case 'open': return ellipse(cx, 62, 5, 6.4, DARK) + circle(cx + 1.8, 59.6, 2, '#fff');
  }
}
function cartoonMouth(kind: MouthKind): string {
  switch (kind) {
    case 'smile': return fillPath('M46 77 Q60 96 74 77 Z', DARK, OUTLINE) + fillPath('M52 85 Q60 80 68 85 Q60 92 52 85 Z', '#ff6f8f');
    case 'grin': return fillPath('M42 74 Q60 102 78 74 Z', DARK, OUTLINE) + fillPath('M50 83 Q60 77 70 83 Q60 91 50 83 Z', '#ff6f8f');
    case 'open': return `<ellipse cx="60" cy="84" rx="7" ry="9" fill="${DARK}" ${OUTLINE}/>` + ellipse(60, 89, 4.4, 3, '#ff6f8f');
    case 'flat': return stroke('M50 84 H70', DARK, 3.4);
    case 'frown': return stroke('M48 88 Q60 78 72 88', DARK, 3.4);
  }
}
function cartoon(d: CharacterDef, f: Face): string {
  const L = d.look; const v = d.variant;
  const backHair = v === 'b' ? `<circle cx="28" cy="52" r="13" fill="${L.hair}" ${OUTLINE}/><circle cx="92" cy="52" r="13" fill="${L.hair}" ${OUTLINE}/>` : '';
  const body = `<path d="M18 140 C18 118 36 110 60 110 C84 110 102 118 102 140 Z" fill="${L.outfit}" ${OUTLINE}/><circle cx="60" cy="126" r="5" fill="${L.outfit2}" ${OUTLINE}/>`;
  const head = `<circle cx="60" cy="64" r="32" fill="${L.skin}" ${OUTLINE}/><ellipse cx="38" cy="76" rx="5" ry="3.4" fill="#ff8aa0" opacity="0.5"/><ellipse cx="82" cy="76" rx="5" ry="3.4" fill="#ff8aa0" opacity="0.5"/>`;
  const eyes = cartoonEye(47, f.eyes) + cartoonEye(73, f.eyes);
  const brows = browPair({ outer: 39, ctrl: 47, inner: 55, yOuter: 48, yCtrl: 43, yInner: 48, color: DARK, w: 3.4 }, f.brows);
  const frontHair = v === 'a'
    ? `<path d="M40 38 C44 20 66 14 80 30 C70 26 62 28 56 36 C50 30 44 32 40 38 Z" fill="${L.hair}" ${OUTLINE}/><path d="M60 22 C58 10 70 6 72 14" fill="none" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>`
    : v === 'b'
      ? `<path d="M32 50 C32 28 46 22 60 22 C76 22 88 30 88 50 C80 40 70 36 60 36 C50 36 40 40 32 50 Z" fill="${L.hair}" ${OUTLINE}/><circle cx="60" cy="18" r="7" fill="${L.outfit2}" ${OUTLINE}/>`
      : `<path d="M28 52 C26 30 42 22 60 22 C78 22 94 30 92 52 L84 50 C80 42 70 38 60 38 C50 38 40 42 36 50 Z" fill="${L.outfit}" ${OUTLINE}/><circle cx="60" cy="16" r="6" fill="${L.outfit2}" ${OUTLINE}/><rect x="26" y="48" width="68" height="8" rx="4" fill="${L.outfit2}" ${OUTLINE}/>`;
  const h = handLayers(d, f.hands);
  return g('backHair', backHair) + g('arms', h.arms) + g('body', body) + g('head', head) + g('eyes', eyes) + g('brows', brows) + g('mouth', cartoonMouth(f.mouth)) + g('frontHair', frontHair) + g('hands', h.hands);
}

/* ---------- robot style (LED screen face: eyes, glowing brow bars, LED mouth) ---------- */
function robotEyes(v: CharacterDef['variant'], glow: string, kind: EyesKind): string {
  const rect = (x: number, y: number, w: number, h: number, rx: number): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${glow}"/>`;
  if (kind === 'blink') {
    return v === 'c' ? rect(40, 62, 40, 3, 1.5) : rect(42, 63, 14, 3.4, 1.7) + rect(64, 63, 14, 3.4, 1.7);
  }
  if (kind === 'happy') {
    const arc = (cx: number): string => stroke(v === 'a' ? `M${cx - 6} 67 L${cx} 59 L${cx + 6} 67` : `M${cx - 6} 67 Q${cx} 57 ${cx + 6} 67`, glow, 3.6);
    return v === 'c' ? stroke('M42 66 Q60 54 78 66', glow, 4) : arc(49) + arc(71);
  }
  const dy = kind === 'up' ? -3 : 0; const big = kind === 'wide';
  if (v === 'a') {
    const s = big ? 17 : 14; const x1 = big ? 40.5 : 42; const x2 = big ? 62.5 : 64; const y = (big ? 54.5 : 56) + dy;
    return rect(x1, y, s, s, big ? 3.5 : 3) + rect(x2, y, s, s, big ? 3.5 : 3);
  }
  if (v === 'b') {
    const r = big ? 8.6 : 7; const cy = 63 + dy;
    return circle(49, cy, r, glow) + circle(71, cy, r, glow) + circle(51, cy - 2.4, 2, '#fff') + circle(73, cy - 2.4, 2, '#fff');
  }
  return big ? rect(40, 56.5, 40, 13, 6.5) : rect(40, 59 + dy, 40, 8, 4);
}
function robotMouth(L: Look, kind: MouthKind): string {
  const glow = L.eye; const metal = L.hair;
  const led = (x: number, y: number, w = 4, h = 3): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${glow}"/>`;
  switch (kind) {
    case 'smile': return `<rect x="46" y="81" width="28" height="5" rx="2.5" fill="${metal}"/>${led(50, 82)}${led(58, 82)}${led(66, 82)}`;
    case 'grin': return fillPath('M44 80 Q60 96 76 80 Z', metal) + led(50, 82, 4, 2.6) + led(58, 84.5) + led(66, 82, 4, 2.6);
    case 'open': return `<rect x="53" y="79" width="14" height="11" rx="5.5" fill="${metal}"/>${circle(60, 84.5, 3, glow)}`;
    case 'flat': return `<rect x="48" y="82" width="24" height="3" rx="1.5" fill="${metal}"/><rect x="56" y="82.4" width="8" height="2.2" fill="${glow}"/>`;
    case 'frown': return fillPath('M46 88 Q60 77 74 88 Z', metal) + led(50, 85.6, 4, 2) + led(58, 83.8, 4, 2.4) + led(66, 85.6, 4, 2);
  }
}
function robot(d: CharacterDef, f: Face): string {
  const L = d.look; const v = d.variant; const p = d.id;
  const shell = `<linearGradient id="${p}-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.skin}"/><stop offset="1" stop-color="${L.skinShade}"/></linearGradient>`;
  const antenna = v === 'a'
    ? `<path d="M60 36 V20" stroke="${L.hair}" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="16" r="5" fill="${L.accent}"/>`
    : v === 'b'
      ? `<path d="M46 38 Q42 24 36 20 M74 38 Q78 24 84 20" fill="none" stroke="${L.hair}" stroke-width="3" stroke-linecap="round"/><circle cx="35" cy="19" r="4" fill="${L.accent}"/><circle cx="85" cy="19" r="4" fill="${L.accent}"/>`
      : '';
  const body = `<defs>${shell}</defs><path d="M14 140 C14 118 34 108 60 108 C86 108 106 118 106 140 Z" fill="${L.outfit}"/><rect x="50" y="116" width="20" height="10" rx="5" fill="${L.accent}" opacity="0.9"/><rect x="50" y="92" width="20" height="18" rx="4" fill="${L.hairShade}"/>`;
  const headRect = v === 'c'
    ? `<path d="M28 80 V58 C28 40 42 30 60 30 C78 30 92 40 92 58 V80 C92 86 88 90 82 90 H38 C32 90 28 86 28 80 Z" fill="url(#${p}-m)"/>`
    : `<rect x="28" y="34" width="64" height="56" rx="${v === 'b' ? 24 : 14}" fill="url(#${p}-m)"/>`;
  const head = `<rect x="20" y="52" width="9" height="20" rx="4" fill="${L.hair}"/><rect x="91" y="52" width="9" height="20" rx="4" fill="${L.hair}"/>${headRect}<rect x="35" y="48" width="50" height="30" rx="${v === 'c' ? 15 : 10}" fill="${DARK}"/>`;
  // Robots have no eyebrows: neutral shows nothing, the other two moods light two LED bars on the screen.
  const brows = f.brows === 'neutral' ? '' : browPair({ outer: 41, ctrl: 47, inner: 55, yOuter: 53.5, yCtrl: 52.5, yInner: 53.5, color: L.eye, w: 2.2 }, f.brows);
  const h = handLayers(d, f.hands);
  return g('antenna', antenna) + g('arms', h.arms) + g('body', body) + g('head', head) + g('eyes', robotEyes(v, L.eye, f.eyes)) + g('brows', brows) + g('mouth', robotMouth(L, f.mouth)) + g('hands', h.hands);
}

const STYLE_BUILDERS = { anime, robot, cartoon, human } as const;

/** One complete portrait as an <svg> string. Decorative: the wrapper element gives it a name. */
export function buildPortraitSvg(d: CharacterDef, face: Partial<Face> = {}): string {
  const inner = STYLE_BUILDERS[d.style](d, completeFace(face));
  const backing = `<circle cx="60" cy="72" r="58" fill="var(--bg-2)" stroke="${d.look.accent}" stroke-opacity="0.35" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PORTRAIT_VIEWBOX.w} ${PORTRAIT_VIEWBOX.h}" aria-hidden="true" focusable="false"><clipPath id="${d.id}-c"><rect x="0" y="0" width="120" height="140"/></clipPath><g clip-path="url(#${d.id}-c)">${backing}${inner}</g></svg>`;
}
